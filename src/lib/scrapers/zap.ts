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
  parseIntSafe,
  detectPropertyType,
  dedupePhotos,
  normalizeAmenities,
  firstText,
  collectImages,
} from './utils';

// ─── Listing ID extraction ────────────────────────────────────────────────────
function extractListingId(url: string): string | undefined {
  // Patterns: /id-2697592068/, /-id-2697592068, /imovel/id/2697592068
  return (
    url.match(/[\-\/]id[-\/](\d+)/i)?.[1] ??
    url.match(/\/(\d{8,})\/?(?:\?|$)/)?.[1]
  );
}

// ─── Amenity extraction from ZAP/VivaReal __NEXT_DATA__ ──────────────────────
function extractAmenities(listing: Record<string, any>): string[] {
  const raw: (string | undefined | null)[] = [
    ...(listing.amenities ?? []),
    ...(listing.tags ?? []),
    ...(listing.infrastructureCondominium ?? []),
    ...(listing.features ?? []),
  ];
  return normalizeAmenities(raw);
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
  );

  const title = listing.title ?? listing.description ?? undefined;
  const price = parseBrlNumber(String(pricing.price ?? pricing.rentalTotalPrice ?? ''));
  const area: number | undefined =
    parseIntSafe(listing.usableAreas?.[0]) ?? parseIntSafe(listing.totalAreas?.[0]);
  const pricePerSqm: number | undefined =
    pricing.pricePerSquareMeter ?? (price && area ? Math.round(price / area) : undefined);

  // "Análise de preço" block — lives at pageProps level, not inside listing
  const priceSuggestion = nextData?.props?.pageProps?.priceSuggestion ?? {};

  // Phones — ZAP often masks digits, but we still surface what's available
  const phones: string[] = (listing.advertiser?.phones ?? listing.account?.phones ?? [])
    .map((p: any) => (typeof p === 'string' ? p : p?.number ?? p?.phone))
    .filter(Boolean);

  // ISO dates
  const datePosted: string | undefined =
    listing.publishedDate ?? listing.publicationDate ?? listing.createdAt ?? undefined;
  const dateUpdated: string | undefined =
    listing.updatedAt ?? listing.updatedDate ?? listing.lastModifiedAt ?? undefined;

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
    totalArea: parseIntSafe(listing.totalAreas?.[0]),
    bedrooms: parseIntSafe(listing.bedrooms),
    bathrooms: parseIntSafe(listing.bathrooms),
    suites: parseIntSafe(listing.suites),
    parkingSpots: parseIntSafe(listing.parkingSpaces),
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
    contactPhone: phones[0],
    description: listing.description ?? listing.observations ?? listing.tagLine ?? undefined,
    zipCode: listing.address?.zipCode ?? listing.address?.postalCode ?? undefined,
    pricePerSqm,
    marketValue: priceSuggestion.price ?? priceSuggestion.suggestedPrice ?? undefined,
    marketPricePerSqm: priceSuggestion.pricePerSquareMeter ?? undefined,
    amenities: extractAmenities(listing),
    datePosted,
    dateUpdated,
    _extractionMethod: 'next_data',
    _confidence: 'high',
  };
}

// ─── Strategy 2: JSON-LD schema.org ──────────────────────────────────────────
function parseSchemaOrg(schema: Record<string, any>, url: string): ScrapedProperty | null {
  if (!schema.name && !schema.offers?.price) return null;

  const title = schema.name;
  return {
    listingId: extractListingId(url),
    sourceUrl: url,
    sourceSite: 'zapimoveis',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType: 'sale',
    price: parseBrlNumber(String(schema.offers?.price ?? '')),
    area: parseIntSafe(schema.floorSize?.value),
    bedrooms: parseIntSafe(schema.numberOfBedrooms),
    bathrooms: parseIntSafe(schema.numberOfBathroomsTotal ?? schema.numberOfBathrooms),
    address: {
      street: schema.address?.streetAddress,
      neighborhood: schema.address?.addressLocality,
      city: schema.address?.addressRegion,
      state: schema.address?.addressCountry,
      fullText: schema.address?.name,
    },
    photos: schema.image ? (Array.isArray(schema.image) ? schema.image : [schema.image]) : [],
    description: schema.description ?? undefined,
    datePosted: schema.datePosted ?? undefined,
    dateUpdated: schema.dateModified ?? undefined,
    _extractionMethod: 'schema_org',
    _confidence: 'high',
  };
}

// ─── Strategy 3: CSS selectors ───────────────────────────────────────────────
function parseCssSelectors(html: string, url: string): ScrapedProperty | null {
  const $ = loadHtml(html);

  const title =
    firstText($, [
      'h1[class*="title__title"]',
      '[data-testid="listing-title"] h1',
      'h1[itemprop="name"]',
      'h1',
    ]) || undefined;

  const priceText = firstText($, [
    'strong[itemprop="price"]',
    '[data-testid="listing-price"]',
    '[class*="price__price"]',
    '[class*="listing-price"]',
    'span[class*="price"]',
  ]);

  const addressText = firstText($, [
    'p[class*="address__address"]',
    '[data-testid="listing-address"]',
    '[class*="address__address"]',
    '[itemprop="address"]',
  ]);

  const zipText = firstText($, [
    '[data-testid="listing-zipcode"]',
    '[class*="address__zipcode"]',
    '[itemprop="postalCode"]',
  ]);

  const neighborhoodText = firstText($, [
    '[data-testid="listing-neighborhood"]',
    '[class*="address__neighborhood"]',
    '[class*="address__zone"]',
  ]);

  const areaText = firstText($, [
    '[data-type="area"] span',
    '[data-testid="area-value"]',
    'li[data-type="area"]',
    '[class*="area__area"]',
    '[aria-label*="área"] span',
  ]);

  const bedsText = firstText($, [
    '[data-type="bedrooms"] span',
    '[data-testid="bedrooms-value"]',
    '[class*="bedrooms__bedrooms"]',
    '[aria-label*="quartos"] span',
  ]);

  const bathsText = firstText($, [
    '[data-type="bathrooms"] span',
    '[data-testid="bathrooms-value"]',
    '[class*="bathrooms__bathrooms"]',
  ]);

  const suitesText = firstText($, [
    '[data-type="suites"] span',
    '[data-testid="suites-value"]',
    '[class*="suites__suites"]',
  ]);

  const parkText = firstText($, [
    '[data-type="parkingSpaces"] span',
    '[data-testid="parking-value"]',
    '[class*="parking"]',
  ]);

  const condoText = firstText($, [
    '[data-type="monthlyCondoFee"] span',
    '[data-testid="condo-fee-value"]',
    '[class*="condoFee"]',
    '[class*="condominio"]',
  ]);

  const iptuText = firstText($, [
    '[data-type="iptu"] span',
    '[data-testid="iptu-value"]',
    '[class*="iptu"]',
  ]);

  const agentName =
    firstText($, [
      '[class*="owner-info__name"]',
      '[data-testid="advertiser-name"]',
      '[class*="advertiser__name"]',
    ]) || undefined;

  const descText = firstText($, [
    '[data-testid="listing-description"]',
    '[class*="description__description"]',
    '[class*="description__text"]',
    '[itemprop="description"]',
  ]);

  const pricePerSqmText = firstText($, [
    '[data-type="squareMeterPrice"] span',
    '[data-testid="price-per-sqm"]',
    '[class*="pricePerSquareMeter"]',
  ]);

  const marketValueText = firstText($, [
    '[data-testid="price-suggestion"]',
    '[class*="price-suggestion__price"]',
    '[class*="priceSuggestion"]',
  ]);

  // Amenities — ZAP renders them as list items in a features section
  const amenityTexts: string[] = [];
  $('[data-testid="amenity-item"], [class*="amenities__item"], [class*="features__item"]').each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text) amenityTexts.push(text);
    }
  );

  const photos = dedupePhotos(
    collectImages($, [
      'div[class*="carousel"] img',
      '[data-testid="listing-photo"] img',
      'picture source',
      'img[class*="gallery"]',
    ])
  );

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
    suites: parseBrlNumber(suitesText),
    parkingSpots: parseBrlNumber(parkText),
    address: {
      neighborhood: neighborhoodText || undefined,
      fullText: addressText || undefined,
    },
    photos,
    agentName,
    description: descText || undefined,
    zipCode: zipText || undefined,
    pricePerSqm:
      parseBrlNumber(pricePerSqmText) ?? (price && area ? Math.round(price / area) : undefined),
    marketValue: parseBrlNumber(marketValueText),
    amenities: normalizeAmenities(amenityTexts),
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

  throw new Error('PARSE_ERROR: Could not extract property data from ZAP page');
}
