/**
 * Debug endpoint: GET /api/rent-compare/debug
 *
 * Returns the raw output of each rental search scraper without going
 * through the cache or rate limiter. Use this to inspect what each portal
 * actually returned (URL, listings count, error, sample listings).
 *
 * Required query params: ?city=&neighborhood=&bedrooms=&bucket=&state=
 *
 * Curl example:
 *   curl -G http://localhost:3000/api/rent-compare/debug \
 *     --data-urlencode "city=São Paulo" \
 *     --data-urlencode "neighborhood=Vila Madalena" \
 *     --data-urlencode "state=SP" \
 *     --data-urlencode "bedrooms=2" \
 *     --data-urlencode "bucket=apartment"
 *
 * Auth still required so this isn't a free scraping API for randos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchVivarealRentals } from '@/lib/scrapers/rentals/vivareal-search';
import { searchQuintoAndarRentals } from '@/lib/scrapers/rentals/quintoandar-search';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }

  const params = req.nextUrl.searchParams;
  const city = params.get('city')?.trim();
  const neighborhood = params.get('neighborhood')?.trim();
  const state = params.get('state')?.trim() ?? undefined;
  const bedrooms = Number(params.get('bedrooms') ?? '');
  const bucket: 'apartment' | 'house' =
    params.get('bucket') === 'house' ? 'house' : 'apartment';

  if (!city || !neighborhood || !Number.isFinite(bedrooms)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INVALID_QUERY',
        message: 'city, neighborhood, bedrooms são obrigatórios',
        received: Object.fromEntries(params),
      },
      { status: 400 },
    );
  }

  const query = { city, neighborhood, state, bedrooms, bucket };

  const [vrSettled, qaSettled] = await Promise.allSettled([
    searchVivarealRentals(query),
    searchQuintoAndarRentals(query),
  ]);

  const vivareal =
    vrSettled.status === 'fulfilled'
      ? vrSettled.value
      : { source: 'vivareal' as const, listings: [], error: String(vrSettled.reason) };
  const quintoandar =
    qaSettled.status === 'fulfilled'
      ? qaSettled.value
      : { source: 'quintoandar' as const, listings: [], error: String(qaSettled.reason) };

  return NextResponse.json({
    ok: true,
    query,
    vivareal: {
      ...vivareal,
      sampleListings: vivareal.listings.slice(0, 3),
      listingsCount: vivareal.listings.length,
    },
    quintoandar: {
      ...quintoandar,
      sampleListings: quintoandar.listings.slice(0, 3),
      listingsCount: quintoandar.listings.length,
    },
    env: {
      hasScraperApiKey: Boolean(process.env.SCRAPERAPI_KEY),
      hasUpstash: Boolean(
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
      ),
    },
  });
}
