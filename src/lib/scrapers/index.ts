/**
 * Main scraper dispatcher.
 *
 * Routes to a site-specific scraper when the URL matches a known pattern,
 * otherwise falls back to the generic Brazilian real-estate extractor.
 */

import type { ScrapedProperty, SupportedSite, ParseListingResponse } from './types';
import { scrapeZap } from './zap';
import { scrapeVivaReal } from './vivareal';
import { scrapeQuintoAndar } from './quintoandar';
import { scrapeGeneric } from './generic';

const SITE_PATTERNS: Record<Exclude<SupportedSite, 'generic'>, RegExp> = {
  zapimoveis: /zapimoveis\.com\.br/i,
  vivareal: /vivareal\.com\.br/i,
  quintoandar: /quintoandar\.com/i,
};

export function detectSite(url: string): SupportedSite {
  for (const [site, pattern] of Object.entries(SITE_PATTERNS)) {
    if (pattern.test(url)) return site as SupportedSite;
  }
  return 'generic';
}

export async function parseListing(url: string): Promise<ParseListingResponse> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, error: 'INVALID_URL', message: 'The provided URL is not valid.' };
  }

  // Basic scheme / host sanity — rejects file://, data:, javascript: etc.
  if (!/^https?:$/.test(parsedUrl.protocol) || !parsedUrl.hostname) {
    return { ok: false, error: 'INVALID_URL', message: 'Only http(s) URLs are supported.' };
  }

  const site = detectSite(parsedUrl.href);

  try {
    let data: ScrapedProperty;

    switch (site) {
      case 'zapimoveis':
        data = await scrapeZap(url);
        break;
      case 'vivareal':
        data = await scrapeVivaReal(url);
        break;
      case 'quintoandar':
        data = await scrapeQuintoAndar(url);
        break;
      case 'generic':
        data = await scrapeGeneric(url);
        break;
    }

    return {
      ok: true,
      source: site,
      extractionMethod: data._extractionMethod,
      data,
    };
  } catch (err: any) {
    const message = err?.message ?? 'Unknown error';

    if (message.includes('PARSE_ERROR')) {
      return { ok: false, source: site, error: 'PARSE_ERROR', message };
    }
    if (err?.response?.status === 403 || err?.response?.status === 429) {
      return {
        ok: false,
        source: site,
        error: 'BLOCKED',
        message: `Site returned ${err.response.status}. Set SCRAPERAPI_KEY in your environment to use a residential proxy.`,
        retryAfter: err?.response?.status === 429 ? 60 : undefined,
      };
    }
    if (message.includes('timeout') || message.includes('ECONNABORTED')) {
      return { ok: false, source: site, error: 'TIMEOUT', message: 'Request timed out.' };
    }
    if (message.includes('SCRAPERAPI_KEY')) {
      return { ok: false, source: site, error: 'BLOCKED', message };
    }

    return {
      ok: false,
      source: site,
      error: 'NETWORK_ERROR',
      message,
    };
  }
}
