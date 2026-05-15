/**
 * Next.js App Router Route Handler — POST /api/rent-compare
 *
 * Search-side companion to /api/parse-listing. Given a subject deal, this
 * endpoint runs the rental comp search across Vivareal + Quinto Andar
 * (parallel), caches results in Upstash for 7 days, and returns the raw
 * RentalListing[] for client-side filter/score/UI.
 *
 * Why client-side filter/score: the user adjusts tolerances and excludes
 * comps live, and we don't want to round-trip on every slider tick.
 *
 * Abuse / cost protections (mirroring /api/parse-listing):
 *   1. Auth — must be signed in.
 *   2. Rate limit — per-user, 6/min sliding + 60/day fixed (lower than the
 *      detail scraper because each call fans out to 2 sources).
 *   3. Cache — 7-day TTL keyed on (city, neighborhood, bedrooms, bucket).
 *      Cache hits skip the rate limiter and the scrapers entirely.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { searchRentals, type RentalSearchQuery } from '@/lib/scrapers/rentals';
import type { RentalListing } from '@/lib/rent-compare/types';
import { slugify } from '@/lib/scrapers/rentals/slug';

export const runtime = 'nodejs';
export const maxDuration = 45;

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
// Hard cap on the scraper fan-out so the handler always has time to return
// JSON before Vercel cuts the function at maxDuration and serves its generic
// HTML error page (which clients can't JSON-parse).
const SCRAPER_DEADLINE_MS = 35_000;

interface RentCompareRequest {
  city?: unknown;
  neighborhood?: unknown;
  state?: unknown;
  bedrooms?: unknown;
  bucket?: unknown;
}

interface RentCompareResponseBody {
  ok: boolean;
  listings: RentalListing[];
  sources: string[];
  perSource: { source: string; count: number; error?: string; searchUrl?: string }[];
  cacheHit: boolean;
  fetchedAt: string;
  error?: string;
  message?: string;
}

let redisClient: Redis | null = null;
let minuteLimiter: Ratelimit | null = null;
let dayLimiter: Ratelimit | null = null;

function getUpstash(): { redis: Redis; minute: Ratelimit; day: Ratelimit } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) redisClient = new Redis({ url, token });
  if (!minuteLimiter) {
    minuteLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(6, '1 m'),
      analytics: false,
      prefix: 'immoyield:rent-compare:m',
    });
  }
  if (!dayLimiter) {
    dayLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.fixedWindow(60, '1 d'),
      analytics: false,
      prefix: 'immoyield:rent-compare:d',
    });
  }
  return { redis: redisClient, minute: minuteLimiter, day: dayLimiter };
}

function buildCacheKey(q: RentalSearchQuery): string {
  return `rent-compare:${slugify(q.city)}:${slugify(q.neighborhood)}:${q.bedrooms}:${q.bucket}`;
}

function parseQuery(body: RentCompareRequest): RentalSearchQuery | null {
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : '';
  const state = typeof body.state === 'string' ? body.state.trim() : undefined;
  const bedrooms = typeof body.bedrooms === 'number' ? body.bedrooms : Number(body.bedrooms);
  const bucket = body.bucket === 'house' ? 'house' : 'apartment';
  if (!city || !neighborhood || !Number.isFinite(bedrooms) || bedrooms < 0) return null;
  return { city, neighborhood, state, bedrooms, bucket };
}

export async function POST(req: NextRequest) {
  try {
    return await handleRentCompare(req);
  } catch (err) {
    // Anything that escapes the inner handler — Redis blowups, scraper
    // throws, JSON.stringify cycles — would otherwise be served as an HTML
    // error page by Next/Vercel and break `await res.json()` on the client.
    // Always respond with JSON so the client error path is consistent.
    console.error('[rent-compare] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado.';
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message },
      { status: 500 },
    );
  }
}

async function handleRentCompare(req: NextRequest): Promise<NextResponse> {
  let body: RentCompareRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', message: 'Body inválido.' },
      { status: 400 },
    );
  }

  const query = parseQuery(body);
  if (!query) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_BODY',
        message: 'Cidade, bairro e quartos são obrigatórios.',
      },
      { status: 400 },
    );
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Faça login para buscar comparáveis.' },
      { status: 401 },
    );
  }

  // ── Upstash required ─────────────────────────────────────────────────────
  const upstash = getUpstash();
  if (!upstash) {
    console.error('[rent-compare] Upstash env missing — cannot serve safely.');
    return NextResponse.json(
      { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'Cache/rate-limit não configurados.' },
      { status: 503 },
    );
  }

  // ── Cache lookup ─────────────────────────────────────────────────────────
  const cacheKey = buildCacheKey(query);
  const cached = await upstash.redis.get<RentCompareResponseBody>(cacheKey);
  if (cached) {
    return NextResponse.json(
      { ...cached, cacheHit: true },
      { status: 200, headers: { 'X-Cache': 'HIT' } },
    );
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const [minRes, dayRes] = await Promise.all([
    upstash.minute.limit(user.id),
    upstash.day.limit(user.id),
  ]);
  if (!minRes.success || !dayRes.success) {
    const failing = !minRes.success ? minRes : dayRes;
    const retryAfter = Math.max(1, Math.ceil((failing.reset - Date.now()) / 1000));
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'Limite de buscas atingido.', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(failing.limit),
          'X-RateLimit-Remaining': String(failing.remaining),
          'X-RateLimit-Reset': String(failing.reset),
        },
      },
    );
  }

  // ── Search ───────────────────────────────────────────────────────────────
  // Deadline race: if scrapers exceed SCRAPER_DEADLINE_MS we degrade to an
  // empty result rather than letting Vercel time out the whole function.
  const t0 = Date.now();
  const searchResult = await Promise.race([
    searchRentals(query).then((r) => ({ kind: 'ok' as const, ...r })),
    new Promise<{ kind: 'timeout' }>((resolve) =>
      setTimeout(() => resolve({ kind: 'timeout' }), SCRAPER_DEADLINE_MS),
    ),
  ]);
  const elapsedMs = Date.now() - t0;

  if (searchResult.kind === 'timeout') {
    console.warn('[rent-compare] scraper deadline exceeded', { user: user.id, query, elapsedMs });
    return NextResponse.json(
      {
        ok: false,
        error: 'TIMEOUT',
        message:
          'A busca demorou mais do que o esperado. Tente novamente em alguns segundos ou ajuste o bairro/quartos.',
      },
      { status: 504 },
    );
  }

  const { listings, perSource, sourcesUsed } = searchResult;

  console.log('[rent-compare] search complete', {
    user: user.id,
    query,
    elapsedMs,
    totalListings: listings.length,
    sources: sourcesUsed,
    perSource: perSource.map((r) => ({
      source: r.source,
      count: r.listings.length,
      error: r.error,
      searchUrl: r.searchUrl,
    })),
  });

  // If every source failed with a quota error, return a 503 with a clear
  // message — the user can't recover by retrying, only by upgrading the
  // ScraperAPI plan or waiting for the next billing cycle.
  const allQuotaExhausted =
    perSource.length > 0 &&
    perSource.every((r) => r.error?.includes('quota exhausted'));
  if (allQuotaExhausted) {
    return NextResponse.json(
      {
        ok: false,
        error: 'SCRAPER_QUOTA_EXHAUSTED',
        message:
          'O serviço de busca de comparáveis (ScraperAPI) atingiu o limite mensal. Aguarde a renovação ou faça upgrade do plano.',
        perSource: perSource.map((r) => ({ source: r.source, error: r.error })),
      },
      { status: 503 },
    );
  }

  const responseBody: RentCompareResponseBody = {
    ok: true,
    listings,
    sources: sourcesUsed,
    perSource: perSource.map((r) => ({
      source: r.source,
      count: r.listings.length,
      error: r.error,
      searchUrl: r.searchUrl,
    })),
    cacheHit: false,
    fetchedAt: new Date().toISOString(),
  };

  // Cache only when at least one source returned something — empty results
  // are usually transient (scraper miss, captcha) and shouldn't be sticky.
  if (listings.length > 0) {
    await upstash.redis.set(cacheKey, responseBody, { ex: CACHE_TTL_SECONDS });
  }

  return NextResponse.json(responseBody, {
    status: 200,
    headers: { 'X-Cache': 'MISS' },
  });
}
