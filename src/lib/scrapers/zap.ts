/**
 * ZAP Imóveis scraper
 *
 * ZAP uses a Next.js frontend backed by Grupo OLX Brasil's "glue-api".
 * Listing pages deliver most property data inside __NEXT_DATA__, so we
 * can extract everything without rendering JavaScript.
 *
 * Extraction order (most → least reliable):
 *   1. __NEXT_DATA__ JSON  ← fastest, most complete
 *   2. JSON-LD schema.org  ← rare but very clean when present
 *   3. CSS selectors       ← fallback if the above are absent/empty
 */

import type { ScrapedProperty } from './types';
import {
  fetchHtml,
  extractNextData,
  extractJsonLd,
  loadHtml,
  parseBrlNumber,
  detectPropertyType,
  dedupePhotos,
} from './utils';

// ─── Listing ID extraction ────────────────────────────────────────────────────
function extractListingId(url: string): string | undefined {
  // ZAP URL pattern: /imovel/venda-...-id-2697592068/
  return url.match(/[\-\/]id[-\/](\d+)/i)?.[1];
}

// ─── Strategy 1: __NEXT_DATA__ ────────────────────────────────────────────────
function parseNextData(nextData: Record<string, any>, url: string): ScrapedProperty | null {
  // ZAP puts listing under various paths depending on page type
  const listing =
    nextData?.props?.pageProps?.listing ??
    nextData?.props?.pageProps?.data?.listing ??
    nextData?.props?.pageProps?.initialProps?.listing ??
    nextData?.props?.pageProps?.listingData?.listing;

  if (!listing) return null;

  const pricing = listing.pricingInfos?.[0] ?? listing.pricing ?? {};
  const listingType =
    pricing.businessType === 'RENTAL' || listing.listingType === 'RENTAL' ? 'rent' : 'sale';

  const photos = dedupePhotos(
    (listing.medias ?? [])
      .filter((m: any) => m.type === 'IMAGE' || m.mediaType === 'IMAGE')
      .map((m: any) => m.url ?? m.value)
  ).slice(0, 10);

  const title = listing.title ?? listing.description ?? undefined;
  const price = parseBrlNumber(String(pricing.price ?? pricing.rentalTotalPrice ?? ''));
  const area: number | undefined = listing.usableAreas?.[0] ?? listing.totalAreas?.[0];
  const pricePerSqm: number | undefined =
    pricing.pricePerSquareMeter ?? (price && area ? Math.round(price / area) : undefined);

  // "Análise de preço" block — lives at pageProps level, not inside listing
  const priceSuggestion = nextData?.props?.pageProps?.priceSuggestion ?? {};

  return {
    listingId: listing.id ?? extractListingId(url),
    sourceUrl: url,
    sourceSite: 'zapimoveis',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType,
    price,
    condoFee: parseBrlNumber(String(pricing.monthlyCondoFee ?? '')),
    iptu: parseBrlNumber(String(pricing.yearlyIptu ?? '')),
    iptuPeriod: pricing.yearlyIptu ? 'yearly' : undefined,
    area,
    totalArea: listing.totalAreas?.[0],
    bedrooms: listing.bedrooms?.[0] ?? listing.bedrooms,
    bathrooms: listing.bathrooms?.[0] ?? listing.bathrooms,
    suites: listing.suites?.[0] ?? listing.suites,
    parkingSpots: listing.parkingSpaces?.[0] ?? listing.parkingSpaces,
    address: {
      street: listing.address?.street,
      neighborhood: listing.address?.neighborhood ?? listing.address?.zone,
      city: listing.address?.city,
      state: listing.address?.stateAcronym ?? listing.address?.state,
      zipCode: listing.address?.zipCode ?? listing.address?.postalCode,
      fullText: listing.address?.name,
    },
    photos,
    agentName: listing.advertiser?.name ?? listing.account?.name ?? listing.owner?.name,
    description: listing.description ?? listing.observations ?? listing.tagLine ?? undefined,
    zipCode: listing.address?.zipCode ?? listing.address?.postalCode ?? undefined,
    pricePerSqm,
    marketValue: priceSuggestion.price ?? priceSuggestion.suggestedPrice ?? undefined,
    marketPricePerSqm: priceSuggestion.pricePerSquareMeter ?? undefined,
    _extractionMethod: 'next_data',
    _confidence: 'high',
  };
}

// ─── Strategy 2: JSON-LD schema.org ──────────────────────────────────────────
function parseSchemaOrg(schema: Record<string, any>, url: string): ScrapedProperty | null {
  if (!schema.name && !schema.offers?.price) return null;

  return {
    listingId: extractListingId(url),
    sourceUrl: url,
    sourceSite: 'zapimoveis',
    scrapedAt: new Date().toISOString(),
    title: schema.name,
    type: detectPropertyType(schema.name),
    listingType: 'sale',
    price: parseBrlNumber(String(schema.offers?.price ?? '')),
    area: schema.floorSize?.value,
    bedrooms: schema.numberOfBedrooms,
    bathrooms: schema.numberOfBathroomsTotal,
    address: {
      street: schema.address?.streetAddress,
      neighborhood: schema.address?.addressLocality,
      city: schema.address?.addressRegion,
      state: schema.address?.addressCountry,
      fullText: schema.address?.name,
    },
    photos: schema.image ? (Array.isArray(schema.image) ? schema.image : [schema.image]) : [],
    _extractionMethod: 'schema_org',
    _confidence: 'high',
  };
}

// ─── Strategy 3: CSS selectors ───────────────────────────────────────────────
function parseCssSelectors(html: string, url: string): ScrapedProperty | null {
  const $ = loadHtml(html);

  const title =
    $('h1.title__title, [data-testid="listing-title"] h1, h1').first().text().trim() || undefined;
  const priceText = $(
    'strong[itemprop="price"], .price__price, [data-testid="listing-price"], [class*="price__price"]'
  )
    .first()
    .text()
    .trim();
  const addressText = $(
    'p.address__address, [data-testid="listing-address"], [class*="address__address"]'
  )
    .first()
    .text()
    .trim();
  const zipText = $(
    '[data-testid="listing-zipcode"], [class*="address__zipcode"], [itemprop="postalCode"]'
  )
    .first()
    .text()
    .trim();
  const areaText = $('[data-type="area"] span, [data-testid="area-value"], li[data-type="area"]')
    .first()
    .text()
    .trim();
  const bedsText = $('[data-type="bedrooms"] span, [data-testid="bedrooms-value"]')
    .first()
    .text()
    .trim();
  const bathsText = $('[data-type="bathrooms"] span, [data-testid="bathrooms-value"]')
    .first()
    .text()
    .trim();
  const parkText = $('[data-type="parkingSpaces"] span, [data-testid="parking-value"]')
    .first()
    .text()
    .trim();
  const condoText = $('[data-type="monthlyCondoFee"] span, [data-testid="condo-fee-value"]')
    .first()
    .text()
    .trim();
  const iptuText = $('[data-type="iptu"] span, [data-testid="iptu-value"]').first().text().trim();
  const agentName =
    $('[class*="owner-info__name"], [data-testid="advertiser-name"]').first().text().trim() ||
    undefined;
  const descText = $(
    '[data-testid="listing-description"], [class*="description__description"], [class*="description__text"]'
  )
    .first()
    .text()
    .trim();
  const pricePerSqmText = $('[data-type="squareMeterPrice"] span, [data-testid="price-per-sqm"]')
    .first()
    .text()
    .trim();
  const marketValueText = $('[data-testid="price-suggestion"], [class*="price-suggestion__price"]')
    .first()
    .text()
    .trim();

  const photos = dedupePhotos(
    $('div.carousel img, [data-testid="listing-photo"] img, picture source')
      .map(
        (_, el) =>
          $(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('srcset')?.split(' ')[0]
      )
      .get()
  ).slice(0, 10);

  // If we got basically nothing, don't return a half-empty object
  if (!title && !priceText && !addressText) return null;

  const listingType = url.includes('/aluguel/') ? 'rent' : 'sale';
  const price = parseBrlNumber(priceText);
  const area = parseBrlNumber(areaText);

  return {
    listingId: extractListingId(url),
    sourceUrl: url,
    sourceSite: 'zapimoveis',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType,
    price,
    condoFee: parseBrlNumber(condoText),
    iptu: parseBrlNumber(iptuText),
    iptuPeriod: iptuText ? 'yearly' : undefined,
    area,
    bedrooms: parseBrlNumber(bedsText),
    bathrooms: parseBrlNumber(bathsText),
    parkingSpots: parseBrlNumber(parkText),
    address: { fullText: addressText || undefined },
    photos,
    agentName,
    description: descText || undefined,
    zipCode: zipText || undefined,
    pricePerSqm:
      parseBrlNumber(pricePerSqmText) ?? (price && area ? Math.round(price / area) : undefined),
    marketValue: parseBrlNumber(marketValueText),
    _extractionMethod: 'css_selectors',
    _confidence: 'medium',
  };
}

// ─── Public scraper function ──────────────────────────────────────────────────
export async function scrapeZap(url: string): Promise<ScrapedProperty> {
  const html = await fetchHtml(url);

  // 1. __NEXT_DATA__
  const nextData = extractNextData(html);
  if (nextData) {
    const result = parseNextData(nextData, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  // 2. JSON-LD
  const schema = extractJsonLd(html);
  if (schema) {
    const result = parseSchemaOrg(schema, url);
    if (result) return result;
  }

  // 3. CSS selectors
  const result = parseCssSelectors(html, url);
  if (result) return result;

  // Nothing worked
  throw new Error('PARSE_ERROR: Could not extract property data from ZAP page');
}
