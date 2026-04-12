/**
 * Main scraper dispatcher — detects site from URL and calls the right scraper.
 */

import type { ScrapedProperty, SupportedSite, ParseListingResponse } from './types';
import { scrapeZap } from './zap';
import { scrapeVivaReal } from './vivareal';
import { scrapeQuintoAndar } from './quintoandar';

const SITE_PATTERNS: Record<SupportedSite, RegExp> = {
  zapimoveis: /zapimoveis\.com\.br/i,
  vivareal: /vivareal\.com\.br/i,
  quintoandar: /quintoandar\.com/i,
};

export function detectSite(url: string): SupportedSite | null {
  for (const [site, pattern] of Object.entries(SITE_PATTERNS)) {
    if (pattern.test(url)) return site as SupportedSite;
  }
  return null;
}

export async function parseListing(url: string): Promise<ParseListingResponse> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, error: 'INVALID_URL', message: 'The provided URL is not valid.' };
  }

  const site = detectSite(parsedUrl.href);
  if (!site) {
    return {
      ok: false,
      error: 'UNSUPPORTED_SITE',
      message: `Unsupported site. Supported: zapimoveis.com.br, vivareal.com.br, quintoandar.com`,
    };
  }

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
