/**
 * VivaReal scraper
 *
 * VivaReal shares Grupo OLX Brasil's infrastructure with ZAP Imóveis —
 * the same Next.js app shell, the same glue-api backend, and the same
 * __NEXT_DATA__ structure. Extraction logic mirrors zap.ts with only
 * the sourceSite field differing.
 */

import type { ScrapedProperty } from './types';
import {
  fetchHtml,
  extractNextData,
  extractRscPageData,
  extractJsonLd,
  loadHtml,
  parseBrlNumber,
  parseIntSafe,
  detectPropertyType,
  mapUnitType,
  dedupePhotos,
  normalizeAmenities,
  firstText,
  collectImages,
} from './utils';

function realizeImageUrl(template: string | undefined): string | undefined {
  if (!template || !template.startsWith('http')) return undefined;
  return template
    .replace('{description}', 'photo')
    .replace('{action}', 'fit-in')
    .replace('{width}', '1024')
    .replace('{height}', '768');
}

// ─── Strategy 1: RSC streamed pageData (current VivaReal layout) ─────────────
function parseRscData(pageData: Record<string, any>, url: string): ScrapedProperty | null {
  const listing = pageData.listing ?? {};
  const ma = pageData.mainAmenities ?? {};
  const pricing = pageData.prices?.[0] ?? listing.prices ?? {};
  const address = pageData.address ?? listing.address ?? {};

  const business = pageData.business ?? pricing.businessType;
  const listingType = business === 'RENTAL' || business === 'RENT' ? 'rent' : 'sale';

  const price =
    parseBrlNumber(String(pricing.price ?? '')) ??
    listing.prices?.mainValue ??
    parseBrlNumber(String(listing.prices?.rent ?? ''));

  const area = parseIntSafe(ma.usableAreas?.toString().match(/\d+/)?.[0]);
  const bedrooms = parseIntSafe(ma.bedrooms?.toString().match(/\d+/)?.[0]);
  const bathrooms = parseIntSafe(ma.bathrooms?.toString().match(/\d+/)?.[0]);
  const suites = parseIntSafe(ma.suites?.toString().match(/\d+/)?.[0]);
  const parkingSpots = parseIntSafe(ma.parkingSpaces?.toString().match(/\d+/)?.[0]);

  const monthlyCondoFee = parseBrlNumber(String(pricing.monthlyCondoFee ?? ''));
  const yearlyIptu = parseBrlNumber(String(pricing.yearlyIptu ?? pricing.iptu ?? ''));
  const iptuPeriod = pricing.iptuPeriod === 'YEARLY' ? 'yearly' : pricing.iptuPeriod === 'MONTHLY' ? 'monthly' : undefined;

  const photos = dedupePhotos(
    (pageData.images ?? listing.imageList ?? [])
      .map((img: any) => realizeImageUrl(img?.dangerousSrc ?? img?.url ?? img?.value))
  );

  const phones: string[] = [
    ...(pageData.account?.phones ?? []),
    pageData.whatsAppNumber,
    pageData.account?.mainPhone,
  ].filter(Boolean);

  const description =
    listing.description && !listing.description.startsWith('$')
      ? listing.description
      : pageData.description && !String(pageData.description).startsWith('$')
        ? pageData.description
        : undefined;

  const title = listing.title ?? pageData.metaContent?.title;
  const type = mapUnitType(listing.unitType) ?? detectPropertyType(title, description);

  return {
    listingId: listing.id ?? pageData.listingId ?? extractListingId(url),
    sourceUrl: url,
    sourceSite: 'vivareal',
    scrapedAt: new Date().toISOString(),
    title,
    type,
    listingType,
    price,
    condoFee: monthlyCondoFee,
    iptu: yearlyIptu,
    iptuPeriod: yearlyIptu ? iptuPeriod ?? 'yearly' : undefined,
    area,
    bedrooms,
    bathrooms,
    suites,
    parkingSpots,
    address: {
      street: address.street
        ? address.streetNumber
          ? `${address.street}, ${address.streetNumber}`
          : address.street
        : undefined,
      neighborhood: address.neighborhood ?? address.zone,
      city: address.city,
      state: address.stateAcronym ?? address.state,
      zipCode: address.zipCode,
      fullText: pageData.formattedAddress ?? address.fullAddress,
    },
    photos,
    agentName: pageData.account?.name ?? listing.advertiser?.name,
    contactPhone: phones[0],
    description,
    zipCode: address.zipCode,
    pricePerSqm: price && area ? Math.round(price / area) : undefined,
    amenities: normalizeAmenities([...(pageData.amenities ?? []), ...(listing.amenities?.values ?? [])]),
    datePosted: pageData.createdAt,
    dateUpdated: pageData.updatedAt,
    _extractionMethod: 'next_data',
    _confidence: 'high',
  };
}

function extractListingId(url: string): string | undefined {
  return (
    url.match(/[\-\/]id[-\/](\d+)/i)?.[1] ??
    url.match(/\/(\d{8,})\/?(?:\?|$)/)?.[1]
  );
}

function extractAmenities(listing: Record<string, any>): string[] {
  return normalizeAmenities([
    ...(listing.amenities ?? []),
    ...(listing.tags ?? []),
    ...(listing.infrastructureCondominium ?? []),
    ...(listing.features ?? []),
  ]);
}

function parseNextData(nextData: Record<string, any>, url: string): ScrapedProperty | null {
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

  const priceSuggestion = nextData?.props?.pageProps?.priceSuggestion ?? {};

  const phones: string[] = (listing.advertiser?.phones ?? listing.account?.phones ?? [])
    .map((p: any) => (typeof p === 'string' ? p : p?.number ?? p?.phone))
    .filter(Boolean);

  const datePosted: string | undefined =
    listing.publishedDate ?? listing.publicationDate ?? listing.createdAt ?? undefined;
  const dateUpdated: string | undefined =
    listing.updatedAt ?? listing.updatedDate ?? listing.lastModifiedAt ?? undefined;

  return {
    listingId: listing.id ?? extractListingId(url),
    sourceUrl: url,
    sourceSite: 'vivareal',
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
    '[class*="area__area"]',
  ]);

  const bedsText = firstText($, [
    '[data-type="bedrooms"] span',
    '[data-testid="bedrooms-value"]',
  ]);

  const bathsText = firstText($, [
    '[data-type="bathrooms"] span',
    '[data-testid="bathrooms-value"]',
  ]);

  const suitesText = firstText($, [
    '[data-type="suites"] span',
    '[data-testid="suites-value"]',
  ]);

  const parkText = firstText($, [
    '[data-type="parkingSpaces"] span',
    '[data-testid="parking-value"]',
  ]);

  const condoText = firstText($, [
    '[data-type="monthlyCondoFee"] span',
    '[data-testid="condo-fee-value"]',
    '[class*="condoFee"]',
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
  ]);

  const marketValueText = firstText($, [
    '[data-testid="price-suggestion"]',
    '[class*="price-suggestion__price"]',
  ]);

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
    ])
  );

  if (!title && !priceText && !addressText) return null;

  const listingType = url.includes('/aluguel/') ? 'rent' : 'sale';
  const price = parseBrlNumber(priceText);
  const area = parseBrlNumber(areaText);

  return {
    listingId: extractListingId(url),
    sourceUrl: url,
    sourceSite: 'vivareal',
    scrapedAt: new Date().toISOString(),
    title,
    type: detectPropertyType(title),
    listingType,
    price,
    condoFee: parseBrlNumber(condoText),
    iptu: parseBrlNumber(iptuText),
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

export async function scrapeVivaReal(url: string): Promise<ScrapedProperty> {
  const html = await fetchHtml(url);

  // 1. RSC pageData (current VivaReal layout)
  const rsc = extractRscPageData(html);
  if (rsc) {
    const result = parseRscData(rsc, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  // 2. Legacy __NEXT_DATA__
  const nextData = extractNextData(html);
  if (nextData) {
    const result = parseNextData(nextData, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  // 2. JSON-LD
  const schema = extractJsonLd(html);
  if (schema && (schema.name || schema.offers?.price)) {
    const title = schema.name;
    return {
      listingId: extractListingId(url),
      sourceUrl: url,
      sourceSite: 'vivareal',
      scrapedAt: new Date().toISOString(),
      title,
      type: detectPropertyType(title),
      price: parseBrlNumber(String(schema.offers?.price ?? '')),
      area: parseIntSafe(schema.floorSize?.value),
      bedrooms: parseIntSafe(schema.numberOfBedrooms),
      bathrooms: parseIntSafe(schema.numberOfBathroomsTotal ?? schema.numberOfBathrooms),
      address: {
        street: schema.address?.streetAddress,
        neighborhood: schema.address?.addressLocality,
        city: schema.address?.addressRegion,
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

  // 3. CSS selectors
  const result = parseCssSelectors(html, url);
  if (result) return result;

  throw new Error('PARSE_ERROR: Could not extract property data from VivaReal page');
}
