/**
 * Quinto Andar rental search scraper.
 *
 * Quinto Andar's search page embeds a Redux store inside __NEXT_DATA__:
 *
 *   props.pageProps.initialState.search.visibleHouses.pages['0']  → ID list
 *   props.pageProps.initialState.houses[id]                       → house data
 *
 * QA renders 12 listings per page on the first page. We only pull the first
 * page — extra pages would require a follow-up fetch and the marginal data
 * isn't worth the cost for our use case (5–12 comps is plenty for a median).
 *
 * QA does NOT expose recently-leased data on the public search page; the
 * "Alugado recentemente" overlay is per-listing-detail. So all comps from
 * this source are `status: 'active'` and weight at 0.7 in the score module.
 *
 * URL pattern:
 *   /alugar/imovel/{bairro-slug}-{city-slug}-{uf}-brasil?quartos={n}
 *
 * Requires SCRAPERAPI_KEY with render=true — the page is a fully client-
 * rendered SPA and the static HTML shell carries no data.
 */

import axios from 'axios';
import { extractNextData, BROWSER_HEADERS } from '../utils';
import type { RentalListing, PropertyBucket } from '@/lib/rent-compare/types';
import type { RentalSearchQuery, RentalSearchResult } from './types';
import { slugify, toUf } from './slug';

function buildUrl(q: RentalSearchQuery): string | null {
  const uf = toUf(q.state);
  const citySlug = slugify(q.city);
  const bairroSlug = slugify(q.neighborhood);
  if (!uf || !citySlug || !bairroSlug) return null;
  return (
    `https://www.quintoandar.com.br/alugar/imovel/` +
    `${bairroSlug}-${citySlug}-${uf}-brasil?quartos=${q.bedrooms}`
  );
}

async function fetchRendered(url: string): Promise<string> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (apiKey) {
    const proxy =
      `https://api.scraperapi.com/?api_key=${apiKey}` +
      `&url=${encodeURIComponent(url)}&country_code=br&render=true`;
    const r = await axios.get(proxy, { headers: BROWSER_HEADERS, timeout: 45000 });
    return r.data as string;
  }
  // No proxy — fetch the SPA shell. Won't return useful data but doesn't crash.
  const r = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 20000 });
  return r.data as string;
}

interface QaHouse {
  id?: number | string;
  rentPrice?: number;
  totalCost?: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  type?: string; // "Apartamento" | "Casa" | "Cobertura" | "Studio" | "Kitnet" | …
  forRent?: boolean;
  forSale?: boolean;
  rented?: boolean;
  isFurnished?: boolean;
  condoIptu?: number;
  yearOfConstruction?: number;
  buildingYear?: number;
  neighbourhood?: string; // British spelling — that's what QA emits
  neighborhood?: string;
  regionName?: string;
  address?: { address?: string; city?: string; state?: string };
  publishedAt?: string;
  createdAt?: string;
}

function inferBucket(rawType: string | undefined): PropertyBucket {
  if (!rawType) return 'apartment';
  if (/casa|sobrado|chac/i.test(rawType)) return 'house';
  return 'apartment';
}

function buildListingUrl(id: number | string | undefined): string {
  if (id == null) return 'https://www.quintoandar.com.br/';
  return `https://www.quintoandar.com.br/imovel/${id}`;
}

function mapHouse(house: QaHouse): RentalListing | null {
  // Must be a rental
  if (house.forRent === false) return null;
  const rent = house.rentPrice;
  if (typeof rent !== 'number' || rent <= 0) return null;

  const id = house.id != null ? String(house.id) : null;
  if (!id) return null;

  const bucket = inferBucket(house.type);
  // QA uses neighbourhood (UK) — fall back to neighborhood if present.
  const bairro = house.neighbourhood ?? house.neighborhood;

  return {
    id: `quintoandar:${id}`,
    source: 'quintoandar',
    url: buildListingUrl(house.id),
    scrapedAt: new Date().toISOString(),
    street: house.address?.address,
    neighborhood: bairro,
    city: house.address?.city,
    state: house.address?.state,
    propertyType: house.type,
    bucket,
    bedrooms: typeof house.bedrooms === 'number' ? house.bedrooms : undefined,
    bathrooms: typeof house.bathrooms === 'number' ? house.bathrooms : undefined,
    area: typeof house.area === 'number' && house.area > 0 ? house.area : undefined,
    yearBuilt: house.yearOfConstruction ?? house.buildingYear,
    monthlyRent: rent,
    // QA collapses condo + IPTU into one number — keep it as condoFee for
    // display, even though it's not strictly the same thing as Vivareal's
    // monthlyCondoFee. The score module ignores condoFee for comparison
    // anyway, so the impedance mismatch doesn't affect correctness.
    condoFee: typeof house.condoIptu === 'number' ? house.condoIptu : undefined,
    status: house.rented ? 'leased' : 'active',
    isFurnished: house.isFurnished,
    isShortTerm: false,
    listedAt: house.publishedAt ?? house.createdAt,
  };
}

interface QaInitialState {
  houses?: Record<string, QaHouse>;
  search?: {
    visibleHouses?: {
      pages?: Record<string, string[]>;
      total?: number;
    };
  };
}

/**
 * Pure parser: HTML → RentalListing[]. Exposed for fixture-based testing
 * so we don't have to mock the network.
 */
export function parseQuintoAndarSearchHtml(html: string): RentalListing[] {
  const nd = extractNextData(html);
  if (!nd) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialState: QaInitialState = (nd as any).props?.pageProps?.initialState ?? {};
  const houseMap = initialState.houses ?? {};
  const ids = initialState.search?.visibleHouses?.pages?.['0'];
  const candidates: QaHouse[] = ids?.length
    ? ids.map((id) => houseMap[id]).filter((h): h is QaHouse => Boolean(h))
    : Object.values(houseMap);
  return candidates.map(mapHouse).filter((l): l is RentalListing => l != null);
}

export async function searchQuintoAndarRentals(
  query: RentalSearchQuery,
): Promise<RentalSearchResult> {
  const url = buildUrl(query);
  if (!url) {
    return { source: 'quintoandar', listings: [], error: 'invalid-query' };
  }

  let html: string;
  try {
    html = await fetchRendered(url);
  } catch (e) {
    return {
      source: 'quintoandar',
      listings: [],
      error: e instanceof Error ? e.message : 'fetch-error',
      searchUrl: url,
    };
  }

  const listings = parseQuintoAndarSearchHtml(html);
  return {
    source: 'quintoandar',
    listings,
    searchUrl: url,
    error: listings.length === 0 ? 'no-listings-extracted' : undefined,
  };
}
