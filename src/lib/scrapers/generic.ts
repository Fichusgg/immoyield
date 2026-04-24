/**
 * Generic Brazilian real-estate scraper.
 *
 * Fallback scraper for sites without a dedicated extractor (ImovelWeb, OLX,
 * Loft, ImóvelGuide, Casa Mineira, local imobiliárias, etc.). Layered
 * strategies, stopping at the first that yields a usable listing:
 *
 *   1. __NEXT_DATA__      — any Next.js-powered site
 *   2. JSON-LD schema.org — most CMS-backed sites (WordPress, Gatsby, Drupal)
 *   3. OpenGraph + meta   — almost universal for link-sharing metadata
 *   4. Microdata          — itemprop="price" / "numberOfRooms" etc.
 *   5. BR text heuristics — regex over rendered text for R$, m², quartos…
 *
 * Each layer merges into the result so a partial-but-complementary combination
 * still yields a useful record (e.g. og:title + heuristic price + JSON-LD address).
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
} from './utils';

type $Cheerio = ReturnType<typeof loadHtml>;

// ─── Meta tag helper ──────────────────────────────────────────────────────────
function meta($: $Cheerio, ...names: string[]): string | undefined {
  for (const n of names) {
    const val =
      $(`meta[property="${n}"]`).attr('content') ??
      $(`meta[name="${n}"]`).attr('content') ??
      $(`meta[itemprop="${n}"]`).attr('content');
    if (val?.trim()) return val.trim();
  }
  return undefined;
}

// ─── Site name from hostname ──────────────────────────────────────────────────
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'generic';
  }
}

// ─── Strategy: __NEXT_DATA__ (site-agnostic best-effort) ──────────────────────
//
// Walk the Next.js pageProps tree looking for a plausible listing object.
// Different sites nest it under different keys (listing, property, ad, item),
// but the inner shape tends to include price/area/bedrooms with similar names.
//
function findListingBlob(obj: any, depth = 0): Record<string, any> | null {
  if (!obj || typeof obj !== 'object' || depth > 8) return null;

  // A "listing-like" blob has at least two of: price, area/square, bedrooms,
  // address. That keeps us from picking up unrelated product catalogues.
  const keys = Object.keys(obj);
  const hasPrice =
    obj.price != null ||
    obj.salePrice != null ||
    obj.rent != null ||
    obj.totalPrice != null ||
    obj.pricingInfos != null;
  const hasArea =
    obj.area != null ||
    obj.usableArea != null ||
    obj.squareMeters != null ||
    obj.totalArea != null ||
    obj.usableAreas != null;
  const hasRooms = obj.bedrooms != null || obj.rooms != null || obj.dormitories != null;
  const hasAddr =
    obj.address != null || obj.street != null || obj.neighborhood != null;

  const score = [hasPrice, hasArea, hasRooms, hasAddr].filter(Boolean).length;
  if (score >= 2) return obj;

  for (const k of keys) {
    const child = obj[k];
    if (Array.isArray(child)) {
      for (const el of child) {
        const found = findListingBlob(el, depth + 1);
        if (found) return found;
      }
    } else if (child && typeof child === 'object') {
      const found = findListingBlob(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function fromNextData(nextData: Record<string, any>, url: string): Partial<ScrapedProperty> {
  const listing = findListingBlob(nextData?.props?.pageProps ?? nextData) ?? {};
  const pricing = listing.pricingInfos?.[0] ?? listing.pricing ?? {};

  const isRent =
    pricing.businessType === 'RENTAL' ||
    listing.listingType === 'RENTAL' ||
    listing.forRent === true ||
    /aluguel|alugar|rent/i.test(url);

  const price =
    parseBrlNumber(String(pricing.price ?? pricing.rentalTotalPrice ?? '')) ??
    (typeof listing.price === 'number' ? listing.price : undefined) ??
    (typeof listing.salePrice === 'number' ? listing.salePrice : undefined) ??
    (typeof listing.rent === 'number' ? listing.rent : undefined);

  const area =
    parseIntSafe(listing.usableAreas?.[0]) ??
    parseIntSafe(listing.totalAreas?.[0]) ??
    parseIntSafe(listing.area ?? listing.usableArea ?? listing.squareMeters);

  const photos = dedupePhotos([
    ...((listing.medias ?? []) as any[])
      .filter((m: any) => m?.type === 'IMAGE' || m?.mediaType === 'IMAGE' || !m?.type)
      .map((m: any) => m?.url ?? m?.value),
    ...((listing.images ?? []) as any[]).map((i: any) =>
      typeof i === 'string' ? i : i?.url ?? i?.src,
    ),
    ...((listing.photos ?? []) as any[]).map((p: any) =>
      typeof p === 'string' ? p : p?.url ?? p?.src,
    ),
  ]);

  return {
    listingId: listing.id ?? listing.externalId,
    title: listing.title ?? listing.name,
    listingType: isRent ? 'rent' : 'sale',
    price,
    condoFee:
      parseBrlNumber(String(pricing.monthlyCondoFee ?? '')) ??
      (typeof listing.condoFee === 'number' ? listing.condoFee : undefined),
    iptu:
      parseBrlNumber(String(pricing.yearlyIptu ?? '')) ??
      (typeof listing.iptu === 'number' ? listing.iptu : undefined),
    iptuPeriod: pricing.yearlyIptu ? 'yearly' : undefined,
    area,
    totalArea: parseIntSafe(listing.totalAreas?.[0] ?? listing.totalArea),
    bedrooms: parseIntSafe(listing.bedrooms ?? listing.rooms ?? listing.dormitories),
    bathrooms: parseIntSafe(listing.bathrooms),
    suites: parseIntSafe(listing.suites),
    parkingSpots: parseIntSafe(listing.parkingSpaces ?? listing.parkingSpots),
    address: {
      street: listing.street ?? listing.address?.street,
      neighborhood:
        listing.neighborhood ??
        listing.neighbourhood ??
        listing.address?.neighborhood ??
        listing.address?.zone,
      city: listing.city ?? listing.address?.city,
      state: listing.state ?? listing.address?.state ?? listing.address?.stateAcronym,
      zipCode: listing.zipCode ?? listing.address?.zipCode ?? listing.address?.postalCode,
      fullText: listing.address?.name ?? listing.address?.fullAddress,
    },
    photos,
    agentName: listing.advertiser?.name ?? listing.agent?.name ?? listing.owner?.name,
    description: listing.description ?? listing.about ?? listing.observations,
    amenities: normalizeAmenities([
      ...(listing.amenities ?? []),
      ...(listing.features ?? []),
      ...(listing.tags ?? []),
    ]),
  };
}

// ─── Strategy: JSON-LD schema.org ─────────────────────────────────────────────
function fromSchema(schema: Record<string, any>, url: string): Partial<ScrapedProperty> {
  const offers = Array.isArray(schema.offers) ? schema.offers[0] : schema.offers ?? {};
  const price =
    parseBrlNumber(String(offers.price ?? schema.price ?? '')) ??
    parseBrlNumber(String(offers.priceSpecification?.price ?? ''));

  return {
    title: schema.name ?? schema.headline,
    listingType: /aluguel|alugar|rent/i.test(url) ? 'rent' : 'sale',
    price,
    area:
      parseIntSafe(schema.floorSize?.value) ??
      parseIntSafe(schema.floorSize) ??
      parseIntSafe(schema.areaSize),
    bedrooms: parseIntSafe(schema.numberOfBedrooms ?? schema.numberOfRooms),
    bathrooms: parseIntSafe(
      schema.numberOfBathroomsTotal ?? schema.numberOfBathrooms ?? schema.numberOfFullBathrooms,
    ),
    address: {
      street: schema.address?.streetAddress,
      neighborhood: schema.address?.addressLocality,
      city: schema.address?.addressRegion ?? schema.address?.addressLocality,
      state: schema.address?.addressCountry,
      zipCode: schema.address?.postalCode,
      fullText: typeof schema.address === 'string' ? schema.address : schema.address?.name,
    },
    photos: schema.image
      ? dedupePhotos(Array.isArray(schema.image) ? schema.image : [schema.image])
      : undefined,
    description: schema.description,
    datePosted: schema.datePosted ?? schema.datePublished,
    dateUpdated: schema.dateModified,
  };
}

// ─── Strategy: OpenGraph / meta tags ──────────────────────────────────────────
function fromOpenGraph($: $Cheerio, url: string): Partial<ScrapedProperty> {
  const title =
    meta($, 'og:title', 'twitter:title') ?? ($('title').first().text().trim() || undefined);
  const description = meta($, 'og:description', 'twitter:description', 'description');
  const image = meta($, 'og:image', 'twitter:image', 'og:image:url');
  const price = parseBrlNumber(meta($, 'product:price:amount', 'og:price:amount', 'price') ?? '');
  const postalCode = meta($, 'og:postal-code', 'place:location:postal-code');
  const street = meta($, 'og:street-address', 'place:location:street-address');
  const city = meta($, 'og:locality', 'place:location:locality');
  const state = meta($, 'og:region', 'place:location:region');

  return {
    title,
    description,
    price,
    listingType: /aluguel|alugar|rent/i.test(`${url} ${title ?? ''}`) ? 'rent' : 'sale',
    photos: image ? [image] : undefined,
    address: {
      street,
      city,
      state,
      zipCode: postalCode,
    },
  };
}

// ─── Strategy: Microdata (itemprop) ───────────────────────────────────────────
function fromMicrodata($: $Cheerio): Partial<ScrapedProperty> {
  const text = (sel: string) => $(sel).first().text().trim() || undefined;
  const attr = (sel: string, a: string) => $(sel).first().attr(a)?.trim() || undefined;

  const priceRaw =
    attr('[itemprop="price"]', 'content') ??
    text('[itemprop="price"]') ??
    attr('[itemprop="offers"] [itemprop="price"]', 'content');

  return {
    title: text('[itemprop="name"]'),
    description: text('[itemprop="description"]'),
    price: parseBrlNumber(priceRaw ?? ''),
    area: parseIntSafe(
      text('[itemprop="floorSize"]')?.match(/\d+/)?.[0] ??
        attr('[itemprop="floorSize"]', 'content'),
    ),
    bedrooms: parseIntSafe(
      text('[itemprop="numberOfBedrooms"]') ?? text('[itemprop="numberOfRooms"]'),
    ),
    bathrooms: parseIntSafe(text('[itemprop="numberOfBathroomsTotal"]')),
    address: {
      street: text('[itemprop="streetAddress"]'),
      neighborhood: text('[itemprop="addressLocality"]'),
      city: text('[itemprop="addressRegion"]'),
      zipCode: text('[itemprop="postalCode"]'),
    },
  };
}

// ─── Strategy: Brazilian real-estate text heuristics ──────────────────────────
//
// When structured data is absent we fall back to pattern-matching on the
// rendered text. Brazilian listings have stable vocabulary — "quartos",
// "dormitórios", "m²", "IPTU", "condomínio" — which works across imobiliária
// WordPress sites that have no schema.org at all.
//
function fromHeuristics($: $Cheerio, url: string): Partial<ScrapedProperty> {
  // Strip scripts/styles before reading text
  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  const firstMatch = (re: RegExp) => text.match(re)?.[1];
  const num = (s: string | undefined) => (s ? parseInt(s, 10) : undefined);

  // All R$ values on the page (top-N to pick the sale/rent price)
  const priceMatches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/g)].map((m) =>
    parseBrlNumber(m[0]),
  ).filter((n): n is number => n != null && n > 100);

  // Heuristic: largest R$ value is usually the listing price (condomínio/IPTU
  // tend to be <10k). If nothing >10k, fall back to the max.
  const price =
    priceMatches.find((n) => n >= 10000) ??
    (priceMatches.length ? Math.max(...priceMatches) : undefined);

  const area =
    num(firstMatch(/([\d.]+)\s*m²/i)) ??
    num(firstMatch(/([\d.]+)\s*m2\b/i)) ??
    num(firstMatch(/área\s*(?:útil|total)?\s*:?\s*([\d.]+)/i));

  const bedrooms =
    num(firstMatch(/(\d+)\s*(?:quartos?|dormitórios?|dorms?\.?)/i));

  const suites = num(firstMatch(/(\d+)\s*suítes?/i));

  const bathrooms = num(firstMatch(/(\d+)\s*banheiros?/i));

  const parking =
    num(firstMatch(/(\d+)\s*(?:vagas?\s*(?:de\s*garagem)?|garagens?)/i));

  // Condo & IPTU — look for the keyword with an R$ value within ~40 chars.
  const condoMatch = text.match(/condom[íi]nio[^R$]{0,40}R\$\s*([\d.]+(?:,\d{2})?)/i);
  const iptuMatch = text.match(/IPTU[^R$]{0,40}R\$\s*([\d.]+(?:,\d{2})?)/i);

  const condo = condoMatch ? parseBrlNumber(`R$ ${condoMatch[1]}`) : undefined;
  const iptu = iptuMatch ? parseBrlNumber(`R$ ${iptuMatch[1]}`) : undefined;

  const cep = firstMatch(/(\d{5}-?\d{3})/);

  // Photos — collect <img src> that look like listing media
  const photoSet = new Set<string>();
  $('img').each((_, el) => {
    const src =
      $(el).attr('src') ??
      $(el).attr('data-src') ??
      $(el).attr('data-lazy-src') ??
      $(el).attr('srcset')?.split(/\s/)[0];
    if (!src?.startsWith('http')) return;
    // Skip tiny icons / tracking pixels / logos
    if (/\/(logo|icon|pixel|sprite|favicon)/i.test(src)) return;
    const w = parseInt($(el).attr('width') ?? '0', 10);
    const h = parseInt($(el).attr('height') ?? '0', 10);
    if ((w && w < 200) || (h && h < 150)) return;
    photoSet.add(src);
  });

  const isRent =
    /aluguel|alugar|rent/i.test(url) ||
    /aluguel\s*(?:mensal|por\s*mês)/i.test(text);

  return {
    listingType: isRent ? 'rent' : 'sale',
    price,
    area,
    bedrooms,
    bathrooms,
    suites,
    parkingSpots: parking,
    condoFee: condo,
    iptu,
    address: cep ? { zipCode: cep } : undefined,
    photos: [...photoSet].slice(0, 40),
  };
}

// ─── Merge helper ─────────────────────────────────────────────────────────────
//
// Merges partials left-to-right: later sources only fill in missing values.
// Nested objects (address, photos, amenities) also deep-merge / union.
//
function merge(...parts: Array<Partial<ScrapedProperty> | null | undefined>): Partial<ScrapedProperty> {
  const out: Record<string, any> = {};
  const addressKeys = ['street', 'neighborhood', 'city', 'state', 'zipCode', 'fullText'] as const;

  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (v == null || v === '') continue;
      if (k === 'address') {
        out.address ??= {};
        for (const ak of addressKeys) {
          if (!out.address[ak] && (v as any)[ak]) out.address[ak] = (v as any)[ak];
        }
      } else if (k === 'photos' && Array.isArray(v)) {
        out.photos = dedupePhotos([...(out.photos ?? []), ...v]);
      } else if (k === 'amenities' && Array.isArray(v)) {
        const set = new Set([...(out.amenities ?? []), ...v]);
        out.amenities = [...set];
      } else if (out[k] == null || out[k] === '') {
        out[k] = v;
      }
    }
  }
  return out as Partial<ScrapedProperty>;
}

// ─── Public scraper ───────────────────────────────────────────────────────────
export async function scrapeGeneric(url: string): Promise<ScrapedProperty> {
  // Many SPAs (Loft, OLX "novo") need JS rendering. Try rendered first when a
  // ScraperAPI key is available; otherwise a plain fetch usually captures
  // enough meta + JSON-LD + server-rendered text.
  const html = await fetchHtml(url, Boolean(process.env.SCRAPERAPI_KEY));
  const $ = loadHtml(html);

  const parts: Array<Partial<ScrapedProperty> | null | undefined> = [];
  const methods: string[] = [];

  // 1. __NEXT_DATA__
  const nextData = extractNextData(html);
  if (nextData) {
    const p = fromNextData(nextData, url);
    if (p.price || p.area || p.bedrooms) {
      parts.push(p);
      methods.push('next_data');
    }
  }

  // 2. JSON-LD
  const schema = extractJsonLd(html);
  if (schema) {
    const p = fromSchema(schema, url);
    if (p.price || p.area || p.title) {
      parts.push(p);
      methods.push('schema_org');
    }
  }

  // 3. OpenGraph + meta
  const og = fromOpenGraph($, url);
  if (og.title || og.price || og.photos?.length) {
    parts.push(og);
    methods.push('opengraph');
  }

  // 4. Microdata
  const micro = fromMicrodata($);
  if (micro.title || micro.price || micro.area) {
    parts.push(micro);
    methods.push('microdata');
  }

  // 5. Heuristics (always run — only fills gaps)
  const heur = fromHeuristics($, url);
  parts.push(heur);
  methods.push('heuristic');

  const merged = merge(...parts);

  // Need at least one of: title, price, area — otherwise the scrape is a bust.
  if (!merged.title && !merged.price && !merged.area) {
    throw new Error(
      `PARSE_ERROR: Could not extract property data from ${hostLabel(url)}. ` +
        'The site may require JS rendering — set SCRAPERAPI_KEY, or fill the form manually.',
    );
  }

  // Derived fields
  const pricePerSqm =
    merged.pricePerSqm ??
    (merged.price && merged.area ? Math.round(merged.price / merged.area) : undefined);

  const primaryMethod =
    (methods.includes('next_data') && 'next_data') ||
    (methods.includes('schema_org') && 'schema_org') ||
    (methods.includes('opengraph') && 'opengraph') ||
    'heuristic';

  const confidence: ScrapedProperty['_confidence'] =
    primaryMethod === 'next_data' || primaryMethod === 'schema_org'
      ? 'high'
      : primaryMethod === 'opengraph'
        ? 'medium'
        : 'low';

  return {
    sourceUrl: url,
    sourceSite: 'generic',
    scrapedAt: new Date().toISOString(),
    type: detectPropertyType(merged.title, merged.description),
    ...merged,
    pricePerSqm,
    zipCode: merged.zipCode ?? merged.address?.zipCode,
    _extractionMethod: primaryMethod as ScrapedProperty['_extractionMethod'],
    _confidence: confidence,
  } as ScrapedProperty;
}
