/**
 * VivaReal rental search scraper.
 *
 * Vivareal's search page bundles its result set as a JSON-LD `ItemList` of
 * schema.org `Apartment` items in `<script type="application/ld+json">`.
 * That's the cleanest extraction surface: structured, stable across deploys,
 * and includes everything we need (price, area, beds, baths, address city/
 * region, listing URL).
 *
 * The bairro is NOT a structured field — it's only in the `name` /
 * `keywords` strings ("…em Vila Madalena, São Paulo"). We parse it from
 * the `name` regex. The downstream filter then matches against the
 * subject's bairro.
 *
 * URL pattern:
 *   /aluguel/{uf}/{city-slug}/?bairros={encoded bairro}&quartos={n}&types={type}
 *
 *   {type} = 'apartamento_residencial' | 'casa_residencial'
 *
 * Vivareal does NOT strictly filter by `bairros` query (it tends to broaden
 * to the city), so the client-side bairro filter is doing the real work.
 */

import {
  fetchHtml,
  extractJsonLd,
  parseIntSafe,
} from '../utils';
import type { RentalListing, PropertyBucket } from '@/lib/rent-compare/types';
import type { RentalSearchQuery, RentalSearchResult } from './types';
import { slugify, toUf, toStateNameSlug } from './slug';

/**
 * Vivareal's URL state segment is inconsistent: SP and RJ use the bare UF
 * (`sp/sao-paulo/`, `rj/rio-de-janeiro/`) while all other states use the
 * full state-name slug (`santa-catarina/florianopolis/`).
 *
 * Returns both candidate URLs so the scraper can try them in order on 404.
 */
function buildCandidateUrls(q: RentalSearchQuery): string[] {
  const uf = toUf(q.state);
  const stateName = toStateNameSlug(q.state);
  const citySlug = slugify(q.city);
  if (!citySlug || !q.neighborhood) return [];
  const typeSlug = q.bucket === 'house' ? 'casa_residencial' : 'apartamento_residencial';
  const params = new URLSearchParams({
    bairros: q.neighborhood,
    quartos: String(q.bedrooms),
    types: typeSlug,
  });
  const qs = params.toString();
  const segments: string[] = [];
  // SP/RJ → UF first (their canonical form). Other states → state-name first.
  if (uf === 'sp' || uf === 'rj') {
    if (uf) segments.push(uf);
    if (stateName && stateName !== uf) segments.push(stateName);
  } else {
    if (stateName) segments.push(stateName);
    if (uf && uf !== stateName) segments.push(uf);
  }
  return segments.map(
    (seg) => `https://www.vivareal.com.br/aluguel/${seg}/${citySlug}/?${qs}`,
  );
}

interface JsonLdApartment {
  '@type'?: string | string[];
  '@id'?: string | number;
  name?: string;
  description?: string;
  url?: string;
  numberOfBedrooms?: number | string;
  numberOfBathroomsTotal?: number | string;
  numberOfBathrooms?: number | string;
  numberOfRooms?: number | string;
  floorSize?: { value?: number | string };
  petsAllowed?: boolean;
  offers?: { price?: number | string };
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
  };
  /**
   * Vivareal sometimes nests an additionalProperty array with condo fee.
   * The extracted block also has a top-level `propertyValue` for it.
   */
  propertyValue?: { name?: string; value?: number | string };
  keywords?: string;
}

/**
 * Parse the bairro out of the schema.org `name` text.
 * Format observed: "Apartamento para alugar com X m², N quartos, ... em <Bairro>, <Cidade>"
 *
 * Returns undefined when the string doesn't match — the downstream
 * filter will then reject the listing for `wrong-bairro`, which is
 * the safe default (don't claim a match we can't verify).
 */
function extractBairroFromName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const m = name.match(/em\s+([^,]+),\s*([^,]+?)\s*$/i);
  return m ? m[1].trim() : undefined;
}

function inferBucketFromName(name: string | undefined): PropertyBucket {
  if (!name) return 'apartment';
  if (/^casa\b|sobrado|chácara|chacara/i.test(name)) return 'house';
  return 'apartment';
}

function buildId(item: JsonLdApartment): string {
  const id = item['@id'] ?? item.url ?? Math.random().toString(36).slice(2);
  return `vivareal:${String(id)}`;
}

function isApartmentType(type: string | string[] | undefined): boolean {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => t === 'Apartment' || t === 'House' || t === 'Residence' || t === 'SingleFamilyResidence');
}

function mapItem(item: JsonLdApartment): RentalListing | null {
  if (!isApartmentType(item['@type'])) return null;

  const rent = typeof item.offers?.price === 'number'
    ? item.offers.price
    : Number(item.offers?.price ?? '');
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const area = parseIntSafe(item.floorSize?.value);
  const bedrooms = parseIntSafe(item.numberOfBedrooms);
  const bathrooms = parseIntSafe(item.numberOfBathroomsTotal ?? item.numberOfBathrooms);
  const bairro = extractBairroFromName(item.name);
  const bucket = inferBucketFromName(item.name);

  let condoFee: number | undefined;
  // propertyValue can be the condo block when name === 'Condominium Fee'
  if (
    item.propertyValue &&
    typeof item.propertyValue === 'object' &&
    /condom/i.test(item.propertyValue.name ?? '')
  ) {
    const v =
      typeof item.propertyValue.value === 'number'
        ? item.propertyValue.value
        : Number(item.propertyValue.value ?? '');
    if (Number.isFinite(v) && v > 0) condoFee = v;
  }

  // Vivareal markets some listings as furnished — surfaced via the keywords
  // string when present.
  const keywords = (item.keywords ?? '').toLowerCase();
  const isFurnished = /mobiliad/i.test(keywords) || /mobiliad/i.test(item.description ?? '');
  const isShortTerm = /temporada|por dia|short[- ]term/i.test(keywords);

  return {
    id: buildId(item),
    source: 'vivareal',
    url: item.url ?? '',
    scrapedAt: new Date().toISOString(),
    street: item.address?.streetAddress,
    neighborhood: bairro,
    city: item.address?.addressLocality,
    state: item.address?.addressRegion,
    propertyType: Array.isArray(item['@type']) ? item['@type'][0] : item['@type'],
    bucket,
    bedrooms,
    bathrooms,
    area,
    monthlyRent: rent,
    condoFee,
    status: 'active',
    isFurnished,
    isShortTerm,
  };
}

interface ItemListBlock {
  '@type'?: string;
  itemListElement?: Array<{ item?: JsonLdApartment }>;
}

/**
 * Find the JSON-LD ItemList block (separate from the per-page first-listing
 * RealEstateListing block) and return its items array, regardless of which
 * order Vivareal renders the JSON-LD scripts.
 */
function findItemList(html: string): JsonLdApartment[] {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as ItemListBlock;
      if (parsed['@type'] === 'ItemList' && Array.isArray(parsed.itemListElement)) {
        return parsed.itemListElement
          .map((el) => el.item)
          .filter((it): it is JsonLdApartment => Boolean(it));
      }
    } catch {
      // Continue — some blocks contain non-JSON or malformed content.
    }
  }
  return [];
}

/**
 * Pure parser: HTML → RentalListing[]. Exposed so tests can validate
 * extraction against fixture HTML without hitting the network.
 */
export function parseVivarealSearchHtml(html: string): RentalListing[] {
  const items = findItemList(html);
  if (items.length === 0) {
    const single = extractJsonLd(html);
    if (single) items.push(single as JsonLdApartment);
  }
  return items.map(mapItem).filter((l): l is RentalListing => l != null);
}

export async function searchVivarealRentals(
  query: RentalSearchQuery,
): Promise<RentalSearchResult> {
  const urls = buildCandidateUrls(query);
  if (urls.length === 0) {
    return { source: 'vivareal', listings: [], error: 'invalid-query' };
  }

  // Try each URL pattern in order. Stop on the first 200 with parsed listings.
  // 404s on a candidate URL are expected for some states — keep trying.
  let lastError: string | undefined;
  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      const listings = parseVivarealSearchHtml(html);
      if (listings.length > 0) {
        return { source: 'vivareal', listings, searchUrl: url };
      }
      // 200 but no listings — could be a real "no results" page. Don't fall
      // through to other URL forms; record and exit.
      return { source: 'vivareal', listings: [], searchUrl: url };
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'fetch-error';
      // Fall through to the next candidate URL.
    }
  }

  return {
    source: 'vivareal',
    listings: [],
    error: lastError ?? 'all-url-candidates-failed',
    searchUrl: urls[urls.length - 1],
  };
}
