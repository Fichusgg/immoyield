/**
 * Debug script for rental search scrapers.
 *
 * Fetches a search URL through the SAME pipeline the API route uses, dumps
 * the raw HTML and any extractable data structures so we can iterate on the
 * parsers without spinning up Next.js, auth, or the rate limiter.
 *
 * Usage:
 *   npx tsx scripts/debug-rent-compare.ts <city> <neighborhood> <state> <bedrooms> [bucket]
 *
 * Examples:
 *   npx tsx scripts/debug-rent-compare.ts "São Paulo" "Vila Madalena" SP 2
 *   npx tsx scripts/debug-rent-compare.ts "Florianópolis" "Centro" SC 1 apartment
 *
 * Writes to tmp/:
 *   rc-vivareal.html        — full HTML from Vivareal search
 *   rc-vivareal-rsc.json    — RSC pageData (when present)
 *   rc-vivareal-nd.json     — __NEXT_DATA__ (when present)
 *   rc-vivareal-listings.json — what our parser extracted
 *   rc-quintoandar.html     — full HTML from Quinto Andar search
 *   rc-quintoandar-nd.json  — __NEXT_DATA__ from QA
 *   rc-quintoandar-listings.json
 *
 * Stdout shows:
 *   - constructed search URL for each portal
 *   - HTML size + which extractor paths fired
 *   - count of listings parsed
 *   - the first 2 listings as JSON
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import {
  extractNextData,
  extractRscPageData,
  BROWSER_HEADERS,
} from '../src/lib/scrapers/utils';
import { searchVivarealRentals } from '../src/lib/scrapers/rentals/vivareal-search';
import { searchQuintoAndarRentals } from '../src/lib/scrapers/rentals/quintoandar-search';
import { slugify, toUf } from '../src/lib/scrapers/rentals/slug';
import type { RentalSearchQuery } from '../src/lib/scrapers/rentals/types';
import { analyzeRentComps, DEFAULT_FILTERS } from '../src/lib/rent-compare';
import type { RentSubject } from '../src/lib/rent-compare/types';

const TMP = resolve(__dirname, '../tmp');

function buildVivarealUrl(q: RentalSearchQuery): string | null {
  const uf = toUf(q.state);
  const citySlug = slugify(q.city);
  if (!uf || !citySlug || !q.neighborhood) return null;
  const typeSlug = q.bucket === 'house' ? 'casa_residencial' : 'apartamento_residencial';
  const params = new URLSearchParams({
    bairros: q.neighborhood,
    quartos: String(q.bedrooms),
    types: typeSlug,
  });
  return `https://www.vivareal.com.br/aluguel/${uf}/${citySlug}/?${params.toString()}`;
}

function buildQuintoAndarUrl(q: RentalSearchQuery): string | null {
  const uf = toUf(q.state);
  const citySlug = slugify(q.city);
  const bairroSlug = slugify(q.neighborhood);
  if (!uf || !citySlug || !bairroSlug) return null;
  return `https://www.quintoandar.com.br/alugar/imovel/${bairroSlug}-${citySlug}-${uf}-brasil?quartos=${q.bedrooms}`;
}

async function fetchViaProxy(url: string, render: boolean): Promise<string> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    console.warn('  [WARN] SCRAPERAPI_KEY not set — direct fetch (likely 403)');
    const r = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 20000 });
    return r.data as string;
  }
  const proxy =
    `https://api.scraperapi.com/?api_key=${apiKey}` +
    `&url=${encodeURIComponent(url)}&country_code=br&render=${render ? 'true' : 'false'}`;
  const r = await axios.get(proxy, { headers: BROWSER_HEADERS, timeout: 45000 });
  return r.data as string;
}

function dumpJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

async function debugVivareal(q: RentalSearchQuery) {
  console.log('\n━━━ VIVAREAL ━━━');
  const url = buildVivarealUrl(q);
  if (!url) {
    console.log('  [SKIP] could not build URL');
    return;
  }
  console.log(`  URL: ${url}`);

  let html: string | null = null;
  try {
    html = await fetchViaProxy(url, false);
  } catch (e) {
    console.log(`  [diagnostic fetch failed] ${(e as Error).message} (proceeding via scraper)`);
  }

  if (html) {
    writeFileSync(`${TMP}/rc-vivareal.html`, html);
    console.log(`  HTML: ${(html.length / 1024).toFixed(1)} KB → tmp/rc-vivareal.html`);

    const rsc = extractRscPageData(html);
    if (rsc) {
      dumpJson(`${TMP}/rc-vivareal-rsc.json`, rsc);
      console.log(`  RSC pageData: yes → tmp/rc-vivareal-rsc.json`);
      console.log(`    top-level keys: ${Object.keys(rsc).slice(0, 20).join(', ')}`);
    } else {
      console.log(`  RSC pageData: no`);
    }
    const nd = extractNextData(html);
    if (nd) {
      dumpJson(`${TMP}/rc-vivareal-nd.json`, nd);
      console.log(`  __NEXT_DATA__: yes → tmp/rc-vivareal-nd.json`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pp = (nd as any).props?.pageProps ?? {};
      console.log(`    pageProps keys: ${Object.keys(pp).slice(0, 20).join(', ')}`);
    } else {
      console.log(`  __NEXT_DATA__: no`);
    }
  }

  const result = await searchVivarealRentals(q);
  dumpJson(`${TMP}/rc-vivareal-listings.json`, result);
  console.log(`  PARSED LISTINGS: ${result.listings.length}${result.error ? ` (error: ${result.error})` : ''}`);
  if (result.listings[0]) {
    console.log(`  Sample listing:`);
    console.log(JSON.stringify(result.listings[0], null, 2).split('\n').map((l) => '    ' + l).join('\n'));
  }
}

async function debugQuintoAndar(q: RentalSearchQuery) {
  console.log('\n━━━ QUINTO ANDAR ━━━');
  const url = buildQuintoAndarUrl(q);
  if (!url) {
    console.log('  [SKIP] could not build URL');
    return;
  }
  console.log(`  URL: ${url}`);

  let html: string | null = null;
  try {
    html = await fetchViaProxy(url, true); // QA needs JS render
  } catch (e) {
    console.log(`  [diagnostic fetch failed] ${(e as Error).message} (proceeding via scraper)`);
  }

  if (html) {
    writeFileSync(`${TMP}/rc-quintoandar.html`, html);
    console.log(`  HTML: ${(html.length / 1024).toFixed(1)} KB → tmp/rc-quintoandar.html`);

    const nd = extractNextData(html);
    if (nd) {
      dumpJson(`${TMP}/rc-quintoandar-nd.json`, nd);
      console.log(`  __NEXT_DATA__: yes → tmp/rc-quintoandar-nd.json`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pp = (nd as any).props?.pageProps ?? {};
      console.log(`    pageProps keys: ${Object.keys(pp).slice(0, 20).join(', ')}`);
    } else {
      console.log(`  __NEXT_DATA__: no`);
    }
  }

  const result = await searchQuintoAndarRentals(q);
  dumpJson(`${TMP}/rc-quintoandar-listings.json`, result);
  console.log(`  PARSED LISTINGS: ${result.listings.length}${result.error ? ` (error: ${result.error})` : ''}`);
  if (result.listings[0]) {
    console.log(`  Sample listing:`);
    console.log(JSON.stringify(result.listings[0], null, 2).split('\n').map((l) => '    ' + l).join('\n'));
  }
}

async function main() {
  const [city, neighborhood, state, bedroomsStr, bucketArg, areaStr] = process.argv.slice(2);
  if (!city || !neighborhood || !state || !bedroomsStr) {
    console.error(
      'Usage: npx tsx scripts/debug-rent-compare.ts <city> <neighborhood> <state> <bedrooms> [bucket] [area]',
    );
    process.exit(1);
  }
  const bedrooms = Number(bedroomsStr);
  const bucket: 'apartment' | 'house' = bucketArg === 'house' ? 'house' : 'apartment';
  const area = areaStr ? Number(areaStr) : 80;
  const query: RentalSearchQuery = { city, neighborhood, state, bedrooms, bucket };

  console.log('Query:', query);
  console.log('Env: SCRAPERAPI_KEY=' + (process.env.SCRAPERAPI_KEY ? '✓' : '✗'));

  await debugVivareal(query);
  await debugQuintoAndar(query);

  // ── Run the actual pipeline so we see what the user would see ────────────
  console.log('\n━━━ PIPELINE (filter + score) ━━━');
  const vr = JSON.parse(require('fs').readFileSync(`${TMP}/rc-vivareal-listings.json`, 'utf8'));
  const qa = JSON.parse(require('fs').readFileSync(`${TMP}/rc-quintoandar-listings.json`, 'utf8'));
  const allListings = [...vr.listings, ...qa.listings];
  console.log(`  total raw listings: ${allListings.length}`);

  const subject: RentSubject = {
    city,
    neighborhood,
    state,
    bucket,
    bedrooms,
    area,
    bathrooms: undefined,
    yearBuilt: undefined,
  };
  const result = analyzeRentComps({
    subject,
    listings: allListings,
    filters: DEFAULT_FILTERS,
  });

  console.log(`  kept: ${result.filterResult.kept.length}`);
  console.log(`  excluded: ${result.filterResult.excluded.length}`);
  if (result.filterResult.relaxationLog.length) {
    console.log(`  relaxation:`);
    for (const r of result.filterResult.relaxationLog) console.log('    -', r);
  }
  console.log('  rejection reasons:');
  const reasons = result.filterResult.excluded.reduce<Record<string, number>>(
    (acc, e) => ({ ...acc, [e.reason]: (acc[e.reason] ?? 0) + 1 }),
    {},
  );
  for (const [r, n] of Object.entries(reasons)) console.log(`    ${r}: ${n}`);

  console.log('  score:');
  console.log(`    suggestedRent: R$ ${result.score.suggestedRent}/mo`);
  console.log(`    range: R$ ${result.score.iqrLow} – R$ ${result.score.iqrHigh}`);
  console.log(`    R$/m² median: R$ ${result.score.pricePerM2Median}`);
  console.log(`    confidence: ${result.score.confidence} (${result.score.confidenceReason})`);
  console.log('  summary:');
  console.log('    ' + result.summary);

  console.log('\n[done]');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
