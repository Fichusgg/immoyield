/**
 * Next.js App Router Route Handler
 * POST /api/parse-listing
 *
 * Receives a property listing URL, scrapes it, and returns structured JSON
 * ready to autofill the deal creation form.
 *
 * Environment variables (add to .env.local):
 *   SCRAPERAPI_KEY=your_key   ← required for production (Vercel/Railway)
 *                               get free key at https://scraperapi.com
 *                               Optional in local dev (fetches directly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseListing } from '@/lib/scrapers';

export const runtime = 'nodejs'; // Playwright/axios require Node.js runtime
export const maxDuration = 30; // Allow up to 30s for browser-rendered pages

export async function POST(req: NextRequest) {
  // ── Parse request body ──────────────────────────────────────────────────────
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { url } = body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_URL', message: 'Missing required field: url' },
      { status: 400 }
    );
  }

  // ── Scrape ──────────────────────────────────────────────────────────────────
  const result = await parseListing(url.trim());

  // ── Map result to HTTP status ───────────────────────────────────────────────
  if (result.ok) {
    return NextResponse.json(result, { status: 200 });
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
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return NextResponse.json(result, { status: httpStatus, headers });
}
