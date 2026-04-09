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
export async function fetchHtml(url: string): Promise<string> {
  const scraperApiKey = process.env.SCRAPERAPI_KEY;

  let requestUrl = url;
  const config: AxiosRequestConfig = {
    timeout: 20000,
    headers: BROWSER_HEADERS,
  };

  if (scraperApiKey) {
    // Route through ScraperAPI (residential proxy, handles JS if needed)
    requestUrl = `https://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&country_code=br&render=false`;
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
export function extractJsonLd(html: string): Record<string, any> | null {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const match of matches) {
    try {
      const obj = JSON.parse(match[1]);
      if (
        obj['@type'] === 'RealEstateListing' ||
        obj['@type'] === 'Product' ||
        obj['@type'] === 'Apartment' ||
        obj['@type'] === 'House'
      ) {
        return obj;
      }
    } catch {
      continue;
    }
  }
  return null;
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

// ─── Detect property type from title ─────────────────────────────────────────
export function detectPropertyType(title: string | undefined): PropertyType | undefined {
  if (!title) return undefined;
  const t = title.toLowerCase();
  if (t.includes('apartamento') || t.includes('apto') || t.includes('flat') || t.includes('studio'))
    return 'apartment';
  if (t.includes('casa') || t.includes('sobrado') || t.includes('chácara')) return 'house';
  if (
    t.includes('loja') ||
    t.includes('sala comercial') ||
    t.includes('galpão') ||
    t.includes('prédio')
  )
    return 'commercial';
  if (t.includes('terreno') || t.includes('lote') || t.includes('área')) return 'land';
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

// ─── Build Cheerio instance ───────────────────────────────────────────────────
export function loadHtml(html: string) {
  return cheerio.load(html);
}
