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
/**
 * Thrown when ScraperAPI returns its account-level quota-exhausted 403.
 * Distinct from a target-site block — retrying with `premium=true` here
 * would only burn more credits we don't have.
 */
export class ScraperQuotaExhaustedError extends Error {
  constructor() {
    super(
      'ScraperAPI quota exhausted for this billing cycle. Upgrade plan or wait for next cycle.',
    );
    this.name = 'ScraperQuotaExhaustedError';
  }
}

const QUOTA_PHRASE = 'exhausted the API Credits';

export async function fetchHtml(url: string, render = false): Promise<string> {
  const scraperApiKey = process.env.SCRAPERAPI_KEY;

  const buildRequestUrl = (premium: boolean): string =>
    scraperApiKey
      ? `https://api.scraperapi.com/?api_key=${scraperApiKey}` +
        `&url=${encodeURIComponent(url)}&country_code=br` +
        `&render=${render ? 'true' : 'false'}` +
        (premium ? '&premium=true' : '')
      : url;

  const config: AxiosRequestConfig = {
    timeout: render ? 35000 : 20000,
    headers: BROWSER_HEADERS,
    // Don't throw on non-2xx so we can read the body and decide.
    validateStatus: () => true,
  };

  const send = async (premium: boolean): Promise<string> => {
    const r = await axios.get(buildRequestUrl(premium), config);
    if (r.status === 403 && typeof r.data === 'string' && r.data.includes(QUOTA_PHRASE)) {
      throw new ScraperQuotaExhaustedError();
    }
    if (r.status >= 200 && r.status < 300) return r.data as string;
    const err = new Error(`Request failed with status code ${r.status}`);
    (err as Error & { response?: { status: number } }).response = { status: r.status };
    throw err;
  };

  try {
    return await send(false);
  } catch (e) {
    if (e instanceof ScraperQuotaExhaustedError) throw e;
    const status =
      (e as { response?: { status?: number } })?.response?.status;
    // Target site temporarily blocked the proxy IP — retry once with
    // ScraperAPI's premium pool. Skip if we know the account is out of credits.
    if (scraperApiKey && (status === 403 || status === 429)) {
      return await send(true);
    }
    throw e;
  }
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

// ─── RSC payload extractor (Next.js App Router) ──────────────────────────────
//
// ZAP / VivaReal moved to Next.js App Router, which no longer embeds a single
// __NEXT_DATA__ blob. Instead it streams React Server Component chunks via
// `self.__next_f.push([1, "<chunk>"])` calls. Each chunk is a slice of a
// concatenated stream where lines look like:
//
//   3f:["$","$L40",null,{"baseData":{"pageData":{...}, ...}}]
//   41:T849,Listing description text...
//
// The pageData object contains the listing data we want, but some string
// fields are references like "$41" pointing to text chunks defined elsewhere
// in the same stream. We extract the balanced JSON containing "baseData",
// parse it, then walk it to resolve references.
//
export function extractRscPageData(html: string): Record<string, any> | null {
  // 1. Pull and decode all RSC stream chunks
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  const parts: string[] = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      parts.push(JSON.parse(`"${match[1]}"`));
    } catch {
      // skip malformed chunk
    }
  }
  if (parts.length === 0) return null;
  const stream = parts.join('');

  // 2. Build a chunk-id → resolved-value map by parsing each line of the stream
  const refs = parseRscChunks(stream);

  // 3. Find the balanced JSON object containing "baseData"
  const bdIdx = stream.indexOf('"baseData":');
  if (bdIdx === -1) return null;
  const json = extractBalancedObject(stream, bdIdx);
  if (!json) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  const pageData = parsed?.baseData?.pageData;
  if (!pageData || typeof pageData !== 'object') return null;

  // 4. Resolve $<hex> references in-place (mutates a copy)
  return resolveRscReferences(pageData, refs);
}

// Walks the RSC stream and records the value for each "<id>:<value>" line.
// Only handles text chunks (T<hex>,<text>) since that's all we currently
// need to resolve — references like $41 point to text bodies (descriptions).
//
// IMPORTANT: the hex length after `T` is the UTF-8 BYTE length of the body,
// not the character length. Brazilian portal listings are full of accented
// characters (á/ã/í) that are 2 bytes each, so a char-based slice would
// over-read into the next chunk's header. We slice at the byte level.
function parseRscChunks(stream: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /(?:^|\n)([a-f0-9]+):T([a-f0-9]+),/g;
  const buf = Buffer.from(stream, 'utf8');
  let m;
  while ((m = re.exec(stream)) !== null) {
    const id = m[1];
    const lenBytes = parseInt(m[2], 16);
    // Find ',' position in BYTE space (not char space) — m.index is a char
    // index but most ASCII characters before the body match 1:1 to bytes;
    // we re-locate via the buffer to be safe.
    const prefixCharEnd = stream.indexOf(',', m.index) + 1;
    const prefixByteEnd = Buffer.byteLength(stream.substring(0, prefixCharEnd), 'utf8');
    out.set(id, buf.subarray(prefixByteEnd, prefixByteEnd + lenBytes).toString('utf8'));
  }
  return out;
}

// Returns the substring for a balanced { ... } block whose opening brace is
// the nearest '{' at or before `pivot`. Respects strings and escapes.
function extractBalancedObject(str: string, pivot: number): string | null {
  const open = str.lastIndexOf('{', pivot);
  if (open === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return str.substring(open, i + 1);
    }
  }
  return null;
}

// Recursively replaces "$<hex>" references with resolved text chunks, and
// drops "$undefined" sentinel values. Returns a new tree (does not mutate).
function resolveRscReferences(value: any, refs: Map<string, string>): any {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value === '$undefined') return undefined;
    if (/^\$[a-f0-9]+$/.test(value)) {
      const id = value.slice(1);
      return refs.get(id) ?? value;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveRscReferences(v, refs));
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const resolved = resolveRscReferences(v, refs);
      if (resolved !== undefined) out[k] = resolved;
    }
    return out;
  }
  return value;
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

// Map a ZAP/VivaReal "unitType" enum string to our internal PropertyType.
// More reliable than guessing from the title — the enum is set per listing
// in the publishing flow.
const UNIT_TYPE_MAP: Record<string, PropertyType> = {
  APARTMENT: 'apartment',
  HOME: 'house',
  HOUSE: 'house',
  CONDOMINIUM: 'house',
  COUNTRY_HOUSE: 'house',
  FARM: 'house',
  ALLOTMENT_LAND: 'land',
  RESIDENTIAL_ALLOTMENT_LAND: 'land',
  COMMERCIAL_ALLOTMENT_LAND: 'land',
  LAND: 'land',
  COMMERCIAL_BUILDING: 'commercial',
  COMMERCIAL_PROPERTY: 'commercial',
  BUSINESS: 'commercial',
  OFFICE: 'commercial',
  WAREHOUSE_SHED: 'commercial',
  SHED_DEPOSIT_WAREHOUSE: 'commercial',
};

export function mapUnitType(code: string | undefined): PropertyType | undefined {
  if (!code) return undefined;
  return UNIT_TYPE_MAP[code.toUpperCase()];
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
