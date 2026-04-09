/**
 * VivaReal scraper
 *
 * VivaReal shares Grupo OLX Brasil's infrastructure with ZAP Imóveis —
 * the same Next.js app shell, the same glue-api backend, and the same
 * __NEXT_DATA__ structure. This scraper reuses the ZAP parsing logic
 * and just overrides the sourceSite field.
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

function extractListingId(url: string): string | undefined {
  return url.match(/[\-\/]id[-\/](\d+)/i)?.[1];
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
  ).slice(0, 10);

  const title = listing.title ?? listing.description ?? undefined;
  const price = parseBrlNumber(String(pricing.price ?? pricing.rentalTotalPrice ?? ''));
  const area: number | undefined = listing.usableAreas?.[0] ?? listing.totalAreas?.[0];
  const pricePerSqm: number | undefined =
    pricing.pricePerSquareMeter ?? (price && area ? Math.round(price / area) : undefined);

  const priceSuggestion = nextData?.props?.pageProps?.priceSuggestion ?? {};

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

function parseCssSelectors(html: string, url: string): ScrapedProperty | null {
  const $ = loadHtml(html);

  const title =
    $('h1.title__title, [data-testid="listing-title"] h1, h1').first().text().trim() || undefined;
  const priceText = $('strong[itemprop="price"], .price__price, [data-testid="listing-price"]')
    .first()
    .text()
    .trim();
  const addressText = $('p.address__address, [data-testid="listing-address"]')
    .first()
    .text()
    .trim();
  const zipText = $(
    '[data-testid="listing-zipcode"], [class*="address__zipcode"], [itemprop="postalCode"]'
  )
    .first()
    .text()
    .trim();
  const areaText = $('[data-type="area"] span, [data-testid="area-value"]').first().text().trim();
  const bedsText = $('[data-type="bedrooms"] span, [data-testid="bedrooms-value"]')
    .first()
    .text()
    .trim();
  const bathsText = $('[data-type="bathrooms"] span, [data-testid="bathrooms-value"]')
    .first()
    .text()
    .trim();
  const parkText = $('[data-type="parkingSpaces"] span').first().text().trim();
  const condoText = $('[data-type="monthlyCondoFee"] span').first().text().trim();
  const iptuText = $('[data-type="iptu"] span').first().text().trim();
  const agentName = $('[class*="owner-info__name"]').first().text().trim() || undefined;
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
    $('div.carousel img, picture source, [data-testid="listing-photo"] img')
      .map(
        (_, el) =>
          $(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('srcset')?.split(' ')[0]
      )
      .get()
  ).slice(0, 10);

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

export async function scrapeVivaReal(url: string): Promise<ScrapedProperty> {
  const html = await fetchHtml(url);

  const nextData = extractNextData(html);
  if (nextData) {
    const result = parseNextData(nextData, url);
    if (result && (result.price || result.area || result.bedrooms)) return result;
  }

  const schema = extractJsonLd(html);
  if (schema && (schema.name || schema.offers?.price)) {
    return {
      listingId: extractListingId(url),
      sourceUrl: url,
      sourceSite: 'vivareal',
      scrapedAt: new Date().toISOString(),
      title: schema.name,
      type: detectPropertyType(schema.name),
      price: parseBrlNumber(String(schema.offers?.price ?? '')),
      area: schema.floorSize?.value,
      bedrooms: schema.numberOfBedrooms,
      bathrooms: schema.numberOfBathroomsTotal,
      address: {
        street: schema.address?.streetAddress,
        neighborhood: schema.address?.addressLocality,
        city: schema.address?.addressRegion,
        fullText: schema.address?.name,
      },
      photos: schema.image ? (Array.isArray(schema.image) ? schema.image : [schema.image]) : [],
      _extractionMethod: 'schema_org',
      _confidence: 'high',
    };
  }

  const result = parseCssSelectors(html, url);
  if (result) return result;

  throw new Error('PARSE_ERROR: Could not extract property data from VivaReal page');
}
