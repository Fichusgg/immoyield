import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import type { PropertyType } from './types';

// ─── HTTP fetch (with optional ScraperAPI proxy) ──────────────────────────────
//
// From a datacenter/server IP (Vercel, Railway, etc.) ZAP and VivaReal return 403.
// ScraperAPI routes requests through residential IPs and handles JS rendering.
//
// Set SCRAPERAPI_KEY in your .env.local to enable the proxy:
//   SCRAPERAPI_KEY=your_key_here
//
// Free tier: 5,000 req/month — https://www.scraperapi.com/pricing/
//
// render=true is needed for fully client-side SPAs (e.g. QuintoAndar).
// ZAP / VivaReal embed __NEXT_DATA__ in the HTML, so render=false is sufficient
// and faster.
//
export async function fetchHtml(url: string, render = false): Promise<string> {
  const scraperApiKey = process.env.SCRAPERAPI_KEY;

  let requestUrl = url;
  const config: AxiosRequestConfig = {
    timeout: render ? 35000 : 20000,
    headers: BROWSER_HEADERS,
  };

  if (scraperApiKey) {
    requestUrl =
      `https://api.scraperapi.com/?api_key=${scraperApiKey}` +
      `&url=${encodeURIComponent(url)}&country_code=br` +
      `&render=${render ? 'true' : 'false'}`;
  }

  const response = await axios.get(requestUrl, config);
  return response.data as string;
}

// ─── Standard browser-like headers (helps for direct fetches in dev) ─────────
export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

// ─── __NEXT_DATA__ extractor ──────────────────────────────────────────────────
export function extractNextData(html: string): Record<string, any> | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ─── JSON-LD schema.org extractor ────────────────────────────────────────────
//
// Returns the first JSON-LD block that looks like a real estate listing.
// We check known @types first, then fall back to any block with offers.price
// or numberOfBedrooms/floorSize — this catches sites that embed listing data
// under non-standard types.
//
export function extractJsonLd(html: string): Record<string, any> | null {
  const matches = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ];

  const REAL_ESTATE_TYPES = new Set([
    'RealEstateListing',
    'Apartment',
    'House',
    'Product',
    'Accommodation',
    'LodgingBusiness',
    'Residence',
    'SingleFamilyResidence',
    'Place',
  ]);

  const candidates: Record<string, any>[] = [];

  for (const match of matches) {
    try {
      const raw = JSON.parse(match[1]);
      // Handle both single objects and @graph arrays
      const blocks: any[] = Array.isArray(raw)
        ? raw
        : raw['@graph']
          ? raw['@graph']
          : [raw];

      for (const block of blocks) {
        const type = block['@type'];
        if (REAL_ESTATE_TYPES.has(type)) {
          return block; // strong match — return immediately
        }
        // Weaker match: has pricing or physical property details
        if (
          block.offers?.price != null ||
          block.numberOfBedrooms != null ||
          block.floorSize != null
        ) {
          candidates.push(block);
        }
      }
    } catch {
      continue;
    }
  }

  return candidates[0] ?? null;
}

// ─── Number parsing (handles "R$ 1.250.000" → 1250000) ───────────────────────
export function parseBrlNumber(text: string | undefined | null): number | undefined {
  if (!text) return undefined;
  // Remove R$, spaces, dots (thousand sep), keep comma (decimal sep in pt-BR)
  const cleaned = text
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

// ─── Safe integer parser — handles scalars, arrays, and string coercion ──────
//
// ZAP/VivaReal sometimes return bedrooms as [2] (single-element array) or
// [2, 3, 4] (listing with multiple unit variants). We take the first element
// for single listings. Returns undefined for null/NaN/non-positive.
//
export function parseIntSafe(
  val: string | number | (string | number)[] | undefined | null
): number | undefined {
  if (val == null) return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Math.round(Number(raw));
  return isFinite(n) && n >= 0 ? n : undefined;
}

// ─── Detect property type from title / description ───────────────────────────
export function detectPropertyType(
  title: string | undefined,
  description?: string | undefined
): PropertyType | undefined {
  const src = `${title ?? ''} ${description ?? ''}`.toLowerCase();
  if (!src.trim()) return undefined;
  if (src.match(/apartamento|apto\b|flat\b|studio\b|kitnet/)) return 'apartment';
  if (src.match(/\bcasa\b|sobrado|chácara|ch[aá]cara|villa|vil[al]a/)) return 'house';
  if (src.match(/loja\b|sala comercial|galpão|galpao|prédio|predio\b|comercial/))
    return 'commercial';
  if (src.match(/terreno|lote\b|área\b|area\b/)) return 'land';
  return 'other';
}

// ─── Deduplicate photo URLs ───────────────────────────────────────────────────
export function dedupePhotos(urls: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (url && url.startsWith('http') && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}

// ─── Amenity normalization ────────────────────────────────────────────────────
//
// ZAP/VivaReal return amenities as uppercase enum strings ("BALCONY", "POOL").
// QuintoAndar may use mixed-case Portuguese. Normalize to lowercase English slugs.
//
const AMENITY_MAP: Record<string, string> = {
  // English / enum keys
  POOL: 'pool',
  GYM: 'gym',
  BALCONY: 'balcony',
  GRILL: 'grill',
  BARBECUE: 'grill',
  ELEVATOR: 'elevator',
  DOORMAN: 'doorman',
  SECURITY: 'security',
  SAUNA: 'sauna',
  PLAYGROUND: 'playground',
  SPORTS_COURT: 'sports_court',
  PARTY_ROOM: 'party_room',
  PET_FRIENDLY: 'pet_friendly',
  FURNISHED: 'furnished',
  AIR_CONDITIONING: 'air_conditioning',
  LAUNDRY: 'laundry',
  STORAGE: 'storage',
  CONCIERGE: 'doorman',
  SWIMMING_POOL: 'pool',
  GARDEN: 'garden',
  SOLAR_PANELS: 'solar_panels',
  // Portuguese keys
  piscina: 'pool',
  academia: 'gym',
  varanda: 'balcony',
  churrasqueira: 'grill',
  elevador: 'elevator',
  portaria: 'doorman',
  sauna: 'sauna',
  playground: 'playground',
  quadra: 'sports_court',
  salão: 'party_room',
  'pet friendly': 'pet_friendly',
  mobiliado: 'furnished',
  'ar condicionado': 'air_conditioning',
  lavanderia: 'laundry',
  depósito: 'storage',
  jardim: 'garden',
};

export function normalizeAmenities(raw: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (!item) continue;
    const key = item.trim();
    const mapped = AMENITY_MAP[key] ?? AMENITY_MAP[key.toUpperCase()] ?? key.toLowerCase().replace(/\s+/g, '_');
    if (!seen.has(mapped)) {
      seen.add(mapped);
      result.push(mapped);
    }
  }
  return result;
}

// ─── Build Cheerio instance ───────────────────────────────────────────────────
export function loadHtml(html: string) {
  return cheerio.load(html);
}

// ─── Text extraction helpers for CSS fallback ─────────────────────────────────
//
// Given a list of selectors, returns the first non-empty text match.
//
export function firstText($: ReturnType<typeof loadHtml>, selectors: string[]): string {
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text) return text;
  }
  return '';
}

// Given a list of selectors, collects all src/data-src/srcset image URLs.
export function collectImages($: ReturnType<typeof loadHtml>, selectors: string[]): string[] {
  const urls: string[] = [];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const src =
        $(el).attr('src') ??
        $(el).attr('data-src') ??
        $(el).attr('data-lazy-src') ??
        $(el).attr('srcset')?.split(/\s/)[0];
      if (src) urls.push(src);
    });
  }
  return urls;
}
