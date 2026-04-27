/**
 * Debug script — fetches a real listing URL and dumps everything we get
 * back, so we can see exactly which fields are available in __NEXT_DATA__,
 * JSON-LD, and the rendered HTML.
 *
 * Usage:
 *   npx tsx scripts/debug-scraper.ts <url>
 *
 * Outputs:
 *   tmp/debug-raw.html              full HTML response
 *   tmp/debug-next-data.json        full __NEXT_DATA__ tree
 *   tmp/debug-listing.json          the listing sub-object (most relevant)
 *   tmp/debug-jsonld.json           first matched JSON-LD block
 *   stdout                          summary of which fields are present
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fetchHtml, extractNextData, extractJsonLd } from '../src/lib/scrapers/utils';
import { parseListing } from '../src/lib/scrapers';

const TMP = resolve(__dirname, '../tmp');

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npx tsx scripts/debug-scraper.ts <url>');
    process.exit(1);
  }

  console.log(`\n→ Fetching ${url}\n`);
  const html = await fetchHtml(url);
  writeFileSync(`${TMP}/debug-raw.html`, html);
  console.log(`  HTML: ${(html.length / 1024).toFixed(1)} KB → tmp/debug-raw.html`);

  const nextData = extractNextData(html);
  if (nextData) {
    writeFileSync(`${TMP}/debug-next-data.json`, JSON.stringify(nextData, null, 2));
    console.log(`  __NEXT_DATA__ → tmp/debug-next-data.json`);

    const pageProps = nextData?.props?.pageProps ?? {};
    const listing =
      pageProps.listing ??
      pageProps.data?.listing ??
      pageProps.initialProps?.listing ??
      pageProps.listingData?.listing;

    if (listing) {
      writeFileSync(`${TMP}/debug-listing.json`, JSON.stringify(listing, null, 2));
      console.log(`  listing → tmp/debug-listing.json`);

      console.log('\n────────── ALL TOP-LEVEL listing KEYS ──────────');
      console.log(Object.keys(listing).sort().join(', '));

      console.log('\n────────── pricingInfos[0] KEYS ──────────');
      const pricing = listing.pricingInfos?.[0] ?? listing.pricing ?? {};
      console.log(Object.keys(pricing).sort().join(', '));
      console.log(JSON.stringify(pricing, null, 2));

      console.log('\n────────── address KEYS ──────────');
      console.log(Object.keys(listing.address ?? {}).sort().join(', '));
      console.log(JSON.stringify(listing.address, null, 2));

      console.log('\n────────── advertiser KEYS ──────────');
      console.log(Object.keys(listing.advertiser ?? listing.account ?? {}).sort().join(', '));

      console.log('\n────────── pageProps top-level KEYS ──────────');
      console.log(Object.keys(pageProps).sort().join(', '));
    } else {
      console.log('  ⚠ no listing object found in pageProps');
      console.log('  pageProps keys:', Object.keys(pageProps).sort().join(', '));
    }
  } else {
    console.log('  ⚠ no __NEXT_DATA__ block in HTML');
  }

  const jsonLd = extractJsonLd(html);
  if (jsonLd) {
    writeFileSync(`${TMP}/debug-jsonld.json`, JSON.stringify(jsonLd, null, 2));
    console.log(`\n  JSON-LD → tmp/debug-jsonld.json`);
    console.log('  JSON-LD keys:', Object.keys(jsonLd).sort().join(', '));
  }

  console.log('\n────────── WHAT OUR SCRAPER PRODUCES ──────────');
  const parsed = await parseListing(url);
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
