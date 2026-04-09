/**
 * QuintoAndar scraper
 *
 * QuintoAndar is a fully client-side React SPA — the HTML shell contains
 * no property data. Two approaches work:
 *
 * APPROACH A (recommended): ScraperAPI with render=true
 *   Set SCRAPERAPI_KEY and the proxy will render the page in a headless
 *   browser, then return the fully-rendered HTML including __NEXT_DATA__.
 *   No extra dependencies needed.
 *
 * APPROACH B: Playwright (self-hosted only)
 *   See the comment block at the bottom of this file for a Playwright
 *   implementation you can use if you run a dedicated Node.js service
 *   instead of Vercel/Next.js API routes.
 *
 * Current implementation: ScraperAPI render=true → parse __NEXT_DATA__
 */

import axios from 'axios';
import type { ScrapedProperty } from './types';
import {
  extractNextData,
  loadHtml,
  parseBrlNumber,
  detectPropertyType,
  dedupePhotos,
  BROWSER_HEADERS,
} from './utils';

function extractListingId(url: string): string | undefined {
  // QuintoAndar: /imovel/{uuid} or /imovel/{slug}-{id}
  return url.match(/\/imovel\/([a-f0-9-]{36})/)?.[1] ?? url.match(/\/imovel\/.*?-(\d{8,})/)?.[1];
}

async function fetchRendered(url: string): Promise<string> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    throw new Error(
      'QuintoAndar requires JavaScript rendering. Set SCRAPERAPI_KEY in your environment variables, ' +
        'or use the Playwright implementation (see bottom of quintoandar.ts).'
    );
  }

  // render=true tells ScraperAPI to use a headless browser
  const proxyUrl =
    `https://api.scraperapi.com/?api_key=${apiKey}` +
    `&url=${encodeURIComponent(url)}&country_code=br&render=true`;

  const response = await axios.get(proxyUrl, {
    headers: BROWSER_HEADERS,
    timeout: 30000, // rendered requests take longer
  });
  return response.data as string;
}

function parseNextData(nextData: Record<string, any>, url: string): ScrapedProperty | null {
  // QuintoAndar's __NEXT_DATA__ shape (observed from community scrapers)
  const pageProps = nextData?.props?.pageProps ?? {};

  const listing =
    pageProps.listing ??
    pageProps.house ??
    pageProps.property ??
    pageProps.data?.listing ??
    pageProps.data?.house;

  if (!listing) return null;

  const isRent = listing.forRent ?? (listing.listingType === 'RENT' || url.includes('para-alugar'));
  const title = listing.title ?? listing.description ?? listing.seoTitle ?? undefined;

  const photos = dedupePhotos([
    ...(listing.images ?? []).map((i: any) => i.url ?? i),
    ...(listing.photos ?? []).map((p: any) => p.url ?? p),
    ...(listing.medias ?? []).filter((m: any) => m.type === 'IMAGE').map((m: any) => m.url),
  ]).slice(0, 10);

  const price: number | undefined = listing.rent ?? listing.price ?? listing.salePrice;
  const area: number | undefined = listing.area ?? listing.usableArea;

  return {
    listingId: listing.id ?? listing.externalId ?? extractListingId(url),
    sourceUrl: url,
    sourceSite: 'quintoandar',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType: isRent ? 'rent' : 'sale',
    price,
    condoFee: listing.condoFee ?? listing.iptu?.condoFee ?? listing.maintenanceFee,
    iptu: listing.iptuValue ?? listing.iptu?.value ?? listing.iptu,
    iptuPeriod: 'monthly',
    area,
    totalArea: listing.totalArea,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms ?? listing.suites,
    suites: listing.suites,
    parkingSpots: listing.parkingSpots ?? listing.parkingSpaces,
    address: {
      street: listing.street ?? listing.address?.street,
      neighborhood: listing.neighbourhood ?? listing.neighborhood ?? listing.address?.neighbourhood,
      city: listing.city ?? listing.address?.city,
      state: listing.state ?? listing.address?.state,
      zipCode: listing.zipCode ?? listing.address?.zipCode ?? listing.postalCode,
      fullText: listing.address?.fullAddress ?? listing.fullAddress,
    },
    photos,
    agentName: listing.agent?.name ?? listing.owner?.name,
    description: listing.description ?? listing.about ?? listing.fullDescription ?? undefined,
    zipCode: listing.zipCode ?? listing.address?.zipCode ?? listing.postalCode ?? undefined,
    pricePerSqm: price && area ? Math.round(price / area) : undefined,
    marketValue: listing.suggestedPrice ?? listing.marketPrice ?? undefined,
    _extractionMethod: 'next_data',
    _confidence: 'medium', // shape varies across QA app versions
  };
}

function parseCssSelectors(html: string, url: string): ScrapedProperty | null {
  const $ = loadHtml(html);

  const title =
    $('h1[class*="title"], [data-testid="listing-title"]').first().text().trim() || undefined;
  const priceText = $('[class*="price"], [data-testid="price"]').first().text().trim();
  const condoText = $('[class*="condo"], [data-testid="condo-fee"]').first().text().trim();
  const iptuText = $('[class*="iptu"], [data-testid="iptu"]').first().text().trim();
  const areaText = $('[class*="area"], [data-testid="area"]').first().text().trim();
  const bedsText = $('[class*="bedrooms"], [data-testid="bedrooms"]').first().text().trim();
  const bathsText = $('[class*="bathrooms"], [data-testid="bathrooms"]').first().text().trim();
  const addressText = $('[class*="address"], [data-testid="address"]').first().text().trim();
  const zipText = $('[class*="zipCode"], [data-testid="zip-code"], [itemprop="postalCode"]')
    .first()
    .text()
    .trim();
  const descText = $('[class*="description"], [data-testid="description"]').first().text().trim();

  const photos = dedupePhotos(
    $('img[src*="quintoandar"], img[src*="photos"]')
      .map((_, el) => $(el).attr('src'))
      .get()
  ).slice(0, 10);

  if (!title && !priceText) return null;

  const price = parseBrlNumber(priceText);
  const area = parseBrlNumber(areaText);

  return {
    listingId: extractListingId(url),
    sourceUrl: url,
    sourceSite: 'quintoandar',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType: url.includes('para-alugar') ? 'rent' : 'sale',
    price,
    condoFee: parseBrlNumber(condoText),
    iptu: parseBrlNumber(iptuText),
    area,
    bedrooms: parseBrlNumber(bedsText),
    bathrooms: parseBrlNumber(bathsText),
    address: { fullText: addressText || undefined },
    photos,
    description: descText || undefined,
    zipCode: zipText || undefined,
    pricePerSqm: price && area ? Math.round(price / area) : undefined,
    _extractionMethod: 'css_selectors',
    _confidence: 'low',
  };
}

export async function scrapeQuintoAndar(url: string): Promise<ScrapedProperty> {
  const html = await fetchRendered(url);

  const nextData = extractNextData(html);
  if (nextData) {
    const result = parseNextData(nextData, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  const result = parseCssSelectors(html, url);
  if (result) return result;

  throw new Error('PARSE_ERROR: Could not extract property data from QuintoAndar page');
}

/*
 * ─── APPROACH B: Playwright self-hosted implementation ─────────────────────
 *
 * Use this if you're running a dedicated Node.js microservice (Railway/Fly.io)
 * instead of Next.js API routes. Playwright gives you the most reliable
 * rendering and lets you intercept network calls directly.
 *
 * Install:
 *   npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * Usage (replace the fetchRendered call above):
 *
 * import { chromium } from 'playwright-extra'
 * import StealthPlugin from 'puppeteer-extra-plugin-stealth'
 * chromium.use(StealthPlugin())
 *
 * async function fetchWithPlaywright(url: string): Promise<ScrapedProperty> {
 *   const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
 *   const context = await browser.newContext({
 *     locale: 'pt-BR',
 *     timezoneId: 'America/Sao_Paulo',
 *   })
 *
 *   let apiData: any = null
 *   context.on('response', async (res) => {
 *     if (res.url().includes('/api/house/') || res.url().includes('/api/listing/')) {
 *       try { apiData = await res.json() } catch {}
 *     }
 *   })
 *
 *   const page = await context.newPage()
 *   await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
 *
 *   // If we intercepted an internal API call, normalize that
 *   if (apiData) {
 *     await browser.close()
 *     // apiData shape varies — log it on first run and adjust parseNextData
 *     return parseNextData({ props: { pageProps: { listing: apiData } } }, url) ?? {} as any
 *   }
 *
 *   const html = await page.content()
 *   await browser.close()
 *   return parseCssSelectors(html, url) ?? (() => { throw new Error('PARSE_ERROR') })()
 * }
 */
