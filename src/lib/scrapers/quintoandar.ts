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
 * APPROACH B: Direct fetch fallback (no ScraperAPI key)
 *   We attempt a direct fetch with browser headers. QuintoAndar embeds
 *   a partial __NEXT_DATA__ blob even in the HTML shell, which sometimes
 *   contains enough data for basic extraction. CSS selectors are then
 *   applied to whatever rendered content was returned.
 *
 * APPROACH C: Playwright (self-hosted only)
 *   See the comment block at the bottom of this file.
 *
 * Current implementation: ScraperAPI render=true → __NEXT_DATA__
 *                         → CSS fallback (also works without ScraperAPI)
 */

import axios from 'axios';
import type { ScrapedProperty } from './types';
import {
  fetchHtml,
  extractNextData,
  loadHtml,
  parseBrlNumber,
  parseIntSafe,
  detectPropertyType,
  dedupePhotos,
  normalizeAmenities,
  firstText,
  collectImages,
  BROWSER_HEADERS,
} from './utils';

function extractListingId(url: string): string | undefined {
  // QuintoAndar: /imovel/{uuid} or /imovel/{slug}-{id}
  // Atlas partner inventory: /classificados/{idA}.{idB}
  return (
    url.match(/\/imovel\/([a-f0-9-]{36})/)?.[1] ??
    url.match(/\/imovel\/.*?-(\d{8,})/)?.[1] ??
    url.match(/\/imovel\/(\d+)/)?.[1] ??
    url.match(/\/classificados\/([a-f0-9]+\.[a-f0-9]+)/)?.[1]
  );
}

// ─── Fetch with JS rendering ─────────────────────────────────────────────────
//
// Tries ScraperAPI render=true first. If no API key is configured, falls back
// to a direct fetch — this still works in development and may capture partial
// data from the server-rendered HTML shell.
//
async function fetchRendered(url: string): Promise<string> {
  const apiKey = process.env.SCRAPERAPI_KEY;

  if (apiKey) {
    const proxyUrl =
      `https://api.scraperapi.com/?api_key=${apiKey}` +
      `&url=${encodeURIComponent(url)}&country_code=br&render=true`;
    const response = await axios.get(proxyUrl, {
      headers: BROWSER_HEADERS,
      timeout: 35000,
    });
    return response.data as string;
  }

  // Fallback: direct fetch. QuintoAndar embeds a partial data blob in the
  // server HTML shell — we may still extract something useful.
  return fetchHtml(url);
}

// ─── Amenity extraction ───────────────────────────────────────────────────────
function extractAmenities(listing: Record<string, any>): string[] {
  return normalizeAmenities([
    ...(listing.amenities ?? []),
    ...(listing.features ?? []),
    ...(listing.tags ?? []),
    ...(listing.highlights ?? []),
    ...(listing.condominiumAmenities ?? []),
    ...(listing.buildingAmenities ?? []),
  ]);
}

// ─── Strategy 1: __NEXT_DATA__ ───────────────────────────────────────────────
function parseNextData(nextData: Record<string, any>, url: string): ScrapedProperty | null {
  const pageProps = nextData?.props?.pageProps ?? {};

  // QuintoAndar uses several different shapes depending on app version
  const listing =
    pageProps.listing ??
    pageProps.house ??
    pageProps.property ??
    pageProps.data?.listing ??
    pageProps.data?.house ??
    pageProps.data?.property;

  if (!listing) return null;

  const isRent =
    listing.forRent != null
      ? Boolean(listing.forRent)
      : listing.listingType === 'RENT' || url.includes('para-alugar');

  const title =
    listing.title ??
    listing.seoTitle ??
    listing.description?.slice(0, 120) ??
    undefined;

  const photos = dedupePhotos([
    ...(listing.images ?? []).map((i: any) => (typeof i === 'string' ? i : i.url ?? i.src)),
    ...(listing.photos ?? []).map((p: any) => (typeof p === 'string' ? p : p.url ?? p.src)),
    ...(listing.medias ?? [])
      .filter((m: any) => m.type === 'IMAGE' || !m.type)
      .map((m: any) => m.url ?? m.value),
  ]);

  const price: number | undefined =
    listing.rent ?? listing.price ?? listing.salePrice ?? listing.totalPrice;
  const area: number | undefined = parseIntSafe(listing.area ?? listing.usableArea ?? listing.squareMeters);

  const phones: string[] = (listing.agent?.phones ?? listing.owner?.phones ?? [])
    .map((p: any) => (typeof p === 'string' ? p : p?.number ?? p?.phone))
    .filter(Boolean);

  const datePosted: string | undefined =
    listing.publishedAt ?? listing.createdAt ?? listing.publicationDate ?? undefined;
  const dateUpdated: string | undefined =
    listing.updatedAt ?? listing.lastUpdated ?? undefined;

  return {
    listingId: listing.id ?? listing.externalId ?? extractListingId(url),
    sourceUrl: url,
    sourceSite: 'quintoandar',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType: isRent ? 'rent' : 'sale',
    price,
    condoFee: listing.condoFee ?? listing.maintenanceFee ?? undefined,
    iptu: listing.iptuValue ?? listing.iptu?.value ?? (typeof listing.iptu === 'number' ? listing.iptu : undefined),
    iptuPeriod: listing.iptuPeriod ?? 'monthly',
    area,
    totalArea: parseIntSafe(listing.totalArea),
    bedrooms: parseIntSafe(listing.bedrooms),
    bathrooms: parseIntSafe(listing.bathrooms),
    suites: parseIntSafe(listing.suites),
    parkingSpots: parseIntSafe(listing.parkingSpots ?? listing.parkingSpaces),
    address: {
      street: listing.street ?? listing.address?.street,
      neighborhood:
        listing.neighbourhood ??
        listing.neighborhood ??
        listing.address?.neighbourhood ??
        listing.address?.neighborhood,
      city: listing.city ?? listing.address?.city,
      state: listing.state ?? listing.address?.state,
      zipCode: listing.zipCode ?? listing.address?.zipCode ?? listing.postalCode,
      fullText: listing.address?.fullAddress ?? listing.fullAddress ?? undefined,
    },
    photos,
    agentName: listing.agent?.name ?? listing.owner?.name,
    contactPhone: phones[0],
    description: listing.description ?? listing.about ?? listing.fullDescription ?? undefined,
    zipCode: listing.zipCode ?? listing.address?.zipCode ?? listing.postalCode ?? undefined,
    pricePerSqm: price && area ? Math.round(price / area) : undefined,
    marketValue: listing.suggestedPrice ?? listing.marketPrice ?? undefined,
    amenities: extractAmenities(listing),
    datePosted,
    dateUpdated,
    _extractionMethod: 'next_data',
    _confidence: process.env.SCRAPERAPI_KEY ? 'medium' : 'low',
  };
}

// ─── Strategy 1b: atlasHouse (Atlas partner inventory) ──────────────────────
//
// QuintoAndar's `/classificados/{idA}.{idB}` URLs serve listings imported
// from partner sites (e.g. ImovelWeb). The __NEXT_DATA__ payload uses a
// completely different shape: `props.pageProps.atlasHouse`.
//
function parseAtlasHouse(nextData: Record<string, any>, html: string, url: string): ScrapedProperty | null {
  const h = nextData?.props?.pageProps?.atlasHouse;
  if (!h || typeof h !== 'object') return null;

  const pricing = h.pricing ?? {};
  const features = h.features ?? {};
  const address = h.address ?? {};

  const businessContext = String(h.businessContext ?? '').toUpperCase();
  const isRent = businessContext === 'RENT' || pricing.rentValueUnformatted != null;

  const price: number | undefined = isRent
    ? pricing.rentValueUnformatted ?? undefined
    : pricing.saleValueUnformatted ?? undefined;

  const area = parseIntSafe(features.area);
  const bedrooms = parseIntSafe(features.bedrooms);
  const bathrooms = parseIntSafe(features.bathrooms);
  const suites = parseIntSafe(features.suites);
  const parkingSpots = parseIntSafe(features.parkingSlots ?? features.parkingSpots);

  const condoFee =
    typeof pricing.condominiumUnformatted === 'number' && pricing.condominiumUnformatted > 0
      ? pricing.condominiumUnformatted
      : undefined;
  const iptu =
    typeof pricing.iptuUnformatted === 'number' && pricing.iptuUnformatted > 0
      ? pricing.iptuUnformatted
      : undefined;

  const pricePerSqm =
    typeof pricing.pricePerAreaUnformatted === 'number'
      ? pricing.pricePerAreaUnformatted
      : price && area
        ? Math.round(price / area)
        : undefined;

  // Atlas pages don't surface a description in __NEXT_DATA__; pull the
  // <meta name="description"> from the rendered HTML as a fallback.
  const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  const description = descMatch?.[1]?.trim() || undefined;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.trim();
  // Strip the " - QuintoAndar" suffix QA appends to every title.
  const title = rawTitle?.replace(/\s*[-–]\s*QuintoAndar\s*$/i, '');

  const photos = dedupePhotos(
    Array.isArray(h.imagesUrls) ? h.imagesUrls.filter((u: unknown): u is string => typeof u === 'string') : []
  );

  // QuintoAndar Atlas address details often include the unit number — keep
  // street alone in `street`, expose the unit through `fullText` so the
  // user can review it before saving.
  const unit = address?.details?.unit;
  const fullText = [address.street, unit ? `nº ${unit}` : null, address.neighborhood, address.city, address.stateCode]
    .filter(Boolean)
    .join(', ') || undefined;

  return {
    listingId: typeof h.dejavuId === 'string' ? h.dejavuId : extractListingId(url),
    sourceUrl: url,
    sourceSite: 'quintoandar',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(h.houseType ?? title),
    listingType: isRent ? 'rent' : 'sale',
    price,
    condoFee,
    iptu,
    iptuPeriod: 'monthly',
    area,
    bedrooms,
    bathrooms,
    suites,
    parkingSpots,
    address: {
      street: address.street ?? undefined,
      neighborhood: address.neighborhood ?? h.region?.name ?? undefined,
      city: address.city ?? undefined,
      state: address.stateCode ?? undefined,
      fullText,
    },
    photos,
    description,
    pricePerSqm,
    amenities: normalizeAmenities(Array.isArray(h.amenities) ? h.amenities : []),
    dateUpdated: pricing.updatedAt ?? undefined,
    _extractionMethod: 'next_data',
    _confidence: 'high',
  };
}

// ─── Strategy 2: CSS selectors ───────────────────────────────────────────────
//
// QuintoAndar uses Tailwind + BEM-like class names that change across deploys.
// We use a wide net of selectors + data-testid attributes where available.
//
function parseCssSelectors(html: string, url: string): ScrapedProperty | null {
  const $ = loadHtml(html);

  const title =
    firstText($, [
      'h1[class*="title"]',
      'h1[data-testid="listing-title"]',
      '[data-testid="property-title"]',
      'h1',
    ]) || undefined;

  const priceText = firstText($, [
    '[data-testid="price"]',
    '[data-testid="listing-price"]',
    '[class*="price__value"]',
    '[class*="listing-price"]',
    // broad fallback — only use if more specific ones miss
    'span[class*="price"]:not([class*="per"])',
  ]);

  const condoText = firstText($, [
    '[data-testid="condo-fee"]',
    '[class*="condo"]',
    '[class*="condominio"]',
  ]);

  const iptuText = firstText($, [
    '[data-testid="iptu"]',
    '[class*="iptu"]',
  ]);

  const areaText = firstText($, [
    '[data-testid="area"]',
    '[class*="area__value"]',
    '[class*="property-area"]',
    // look for "m²" nearby
    'span:contains("m²")',
  ]);

  const bedsText = firstText($, [
    '[data-testid="bedrooms"]',
    '[class*="bedroom"]',
    '[aria-label*="quarto"]',
  ]);

  const bathsText = firstText($, [
    '[data-testid="bathrooms"]',
    '[class*="bathroom"]',
    '[aria-label*="banheir"]',
  ]);

  const parkText = firstText($, [
    '[data-testid="parking"]',
    '[class*="parking"]',
    '[class*="garagem"]',
    '[aria-label*="vaga"]',
  ]);

  const addressText = firstText($, [
    '[data-testid="address"]',
    '[class*="address"]',
    '[itemprop="address"]',
  ]);

  const zipText = firstText($, [
    '[data-testid="zip-code"]',
    '[class*="zipCode"]',
    '[itemprop="postalCode"]',
  ]);

  const neighborhoodText = firstText($, [
    '[data-testid="neighborhood"]',
    '[class*="neighborhood"]',
    '[class*="neighbourhood"]',
  ]);

  const descText = firstText($, [
    '[data-testid="description"]',
    '[class*="description"]',
    '[itemprop="description"]',
  ]);

  const agentName =
    firstText($, [
      '[data-testid="agent-name"]',
      '[class*="agent__name"]',
      '[class*="owner-name"]',
    ]) || undefined;

  // Amenities — QuintoAndar renders them in a features/highlights list
  const amenityTexts: string[] = [];
  $(
    '[data-testid="amenity"], [class*="amenity"], [class*="feature__item"], [class*="highlight__item"]'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text) amenityTexts.push(text);
  });

  const photos = dedupePhotos(
    collectImages($, [
      'img[src*="quintoandar"]',
      'img[src*="photos"]',
      'img[src*="images"]',
      '[class*="gallery"] img',
      '[class*="carousel"] img',
    ])
  );

  if (!title && !priceText) return null;

  const price = parseBrlNumber(priceText);
  const area = parseBrlNumber(areaText.replace(/m².*/, '').trim());

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
    parkingSpots: parseBrlNumber(parkText),
    address: {
      neighborhood: neighborhoodText || undefined,
      fullText: addressText || undefined,
    },
    photos,
    agentName,
    description: descText || undefined,
    zipCode: zipText || undefined,
    pricePerSqm: price && area ? Math.round(price / area) : undefined,
    amenities: normalizeAmenities(amenityTexts),
    _extractionMethod: 'css_selectors',
    _confidence: 'low',
  };
}

// ─── Public scraper function ──────────────────────────────────────────────────
export async function scrapeQuintoAndar(url: string): Promise<ScrapedProperty> {
  const html = await fetchRendered(url);

  // 1a. __NEXT_DATA__ — Atlas (/classificados/) inventory.
  // Tried first because the Atlas shape is unambiguous: when atlasHouse is
  // present, the regular `listing` shape is not, and vice versa.
  const nextData = extractNextData(html);
  if (nextData) {
    const atlas = parseAtlasHouse(nextData, html, url);
    if (atlas && (atlas.price || atlas.area || atlas.bedrooms)) return atlas;

    // 1b. __NEXT_DATA__ — standard /imovel/ listing.
    const result = parseNextData(nextData, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  // 2. CSS selectors
  const result = parseCssSelectors(html, url);
  if (result) return result;

  throw new Error(
    'PARSE_ERROR: Could not extract property data from QuintoAndar page. ' +
      (process.env.SCRAPERAPI_KEY
        ? 'The page structure may have changed.'
        : 'Set SCRAPERAPI_KEY for JS-rendered extraction.')
  );
}

/*
 * ─── APPROACH C: Playwright self-hosted implementation ─────────────────────
 *
 * Use this if you're running a dedicated Node.js microservice (Railway/Fly.io)
 * instead of Next.js API routes. Playwright gives you the most reliable
 * rendering and lets you intercept network calls directly.
 *
 * Install:
 *   npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 *   npx playwright install chromium
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
 *   if (apiData) {
 *     await browser.close()
 *     return parseNextData({ props: { pageProps: { listing: apiData } } }, url)
 *       ?? (() => { throw new Error('PARSE_ERROR') })()
 *   }
 *
 *   const html = await page.content()
 *   await browser.close()
 *   return parseCssSelectors(html, url) ?? (() => { throw new Error('PARSE_ERROR') })()
 * }
 */
