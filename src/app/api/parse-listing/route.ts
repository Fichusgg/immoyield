/**
 * Next.js App Router Route Handler
 * POST /api/parse-listing
 *
 * Receives a property listing URL, scrapes it via ScraperAPI, and returns
 * structured JSON ready to autofill the deal creation form.
 *
 * ── Abuse protection (applied in this order; each layer fails closed) ─────────
 *   1. URL allowlist — reject anything that isn't a supported portal
 *      (vivareal / zapimoveis / quintoandar). Stops garbage traffic before
 *      any paid work happens.
 *   2. Supabase auth — only signed-in users can burn ScraperAPI credits.
 *      user.id is the rate-limit key; never trust IDs from the request body.
 *   3. Rate limit (per user) — 10/min sliding + 100/day fixed. Both windows
 *      must pass. Upstash env vars required; if missing we return 503 rather
 *      than silently disable the limiter.
 *   4. Response cache — successful scrapes cached 30 min in Redis keyed by
 *      normalized URL. Cache hits skip the rate limiter and the scraper.
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  (auth)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN         (rate limit + cache)
 *   SCRAPERAPI_KEY                                             (scraper, prod)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { parseListing } from '@/lib/scrapers';
import { createClient } from '@/lib/supabase/server';
import type { ParseListingResponse } from '@/lib/scrapers/types';

export const runtime = 'nodejs'; // scrapers require Node.js APIs
export const maxDuration = 30;

// ── Layer 1 — URL allowlist ──────────────────────────────────────────────────
const ALLOWED_HOST_SUFFIXES = [
  'vivareal.com.br',
  'zapimoveis.com.br',
  'quintoandar.com.br',
];

function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    suffix => h === suffix || h.endsWith(`.${suffix}`)
  );
}

function normalizeUrl(parsed: URL): string {
  // Strip query + hash — marketing params (?source=showcase etc.) don't
  // change the listing content, so they should collapse to one cache entry.
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}`;
}

// ── Upstash clients (lazy, shared across invocations) ────────────────────────
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
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: false,
      prefix: 'immoyield:parse-listing:m',
    });
  }
  if (!dayLimiter) {
    dayLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.fixedWindow(100, '1 d'),
      analytics: false,
      prefix: 'immoyield:parse-listing:d',
    });
  }
  return { redis: redisClient, minute: minuteLimiter, day: dayLimiter };
}

const CACHE_TTL_SECONDS = 30 * 60;

export async function POST(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'Missing required field: url' },
      { status: 400 }
    );
  }


  // ── Layer 2 — Auth ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED', message: 'Faça login para importar anúncios.' },
      { status: 401 }
    );
  }

  // ── Layer 1 — URL validation + allowlist ───────────────────────────────────
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'The provided URL is not valid.' },
      { status: 400 }
    );
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'Only http(s) URLs are supported.' },
      { status: 400 }
    );
  }
  if (!isAllowedHost(parsedUrl.hostname)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'UNSUPPORTED_SITE',
        message: 'Este site ainda não é suportado. Use um link do VivaReal, ZAP Imóveis ou QuintoAndar.',
      },
      { status: 400 }
    );
  }

  

  // ── Fail closed if Upstash isn't configured (this route is expensive) ─────
  const upstash = getUpstash();
  if (!upstash) {
    console.error(
      '[parse-listing] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — refusing to serve without rate limiting.'
    );
    return NextResponse.json(
      { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'Rate limiting not configured' },
      { status: 503 }
    );
  }

  // ── Layer 4 (first) — Cache lookup (cache hits bypass the rate limit) ─────
  const cacheKey = `listing:${normalizeUrl(parsedUrl)}`;
  const cached = await upstash.redis.get<ParseListingResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { 'X-Cache': 'HIT' },
    });
  }

  // ── Layer 3 — Per-user rate limit (both windows must pass) ────────────────
  const [minuteRes, dayRes] = await Promise.all([
    upstash.minute.limit(user.id),
    upstash.day.limit(user.id),
  ]);

  if (!minuteRes.success || !dayRes.success) {
    const failing = !minuteRes.success ? minuteRes : dayRes;
    const retryAfter = Math.max(1, Math.ceil((failing.reset - Date.now()) / 1000));
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'Too many requests', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(failing.limit),
          'X-RateLimit-Remaining': String(failing.remaining),
          'X-RateLimit-Reset': String(failing.reset),
        },
      }
    );
  }

  // ── Scrape ─────────────────────────────────────────────────────────────────
  const result = await parseListing(rawUrl);

  // ── Layer 4 (second) — store successful scrapes ───────────────────────────
  if (result.ok) {
    await upstash.redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
    return NextResponse.json(result, {
      status: 200,
      headers: { 'X-Cache': 'MISS' },
    });
  }

  const statusMap: Record<string, number> = {
    INVALID_URL: 400,
    UNSUPPORTED_SITE: 422,
    BLOCKED: 503,
    PARSE_ERROR: 422,
    TIMEOUT: 504,
    CAPTCHA: 503,
    NETWORK_ERROR: 502,
  };
  const httpStatus = statusMap[result.error ?? ''] ?? 500;
  const headers: Record<string, string> = {};
  if (result.retryAfter) headers['Retry-After'] = String(result.retryAfter);

  return NextResponse.json(result, { status: httpStatus, headers });
}
