/**
 * React hook — wraps the /api/parse-listing call with loading/error state.
 *
 * Usage:
 *   const { fetch, data, loading, error, reset } = useParseListing()
 *   await fetch('https://www.zapimoveis.com.br/imovel/...')
 */

'use client';

import { useState, useCallback } from 'react';
import type { ParseListingResponse, ScrapedProperty } from '@/lib/scrapers/types';

interface UseParseListing {
  fetch: (url: string) => Promise<ScrapedProperty | null>;
  data: ScrapedProperty | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useParseListing(): UseParseListing {
  const [data, setData] = useState<ScrapedProperty | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (url: string): Promise<ScrapedProperty | null> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await window.fetch('/api/parse-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const json: ParseListingResponse = await res.json();

      if (!json.ok || !json.data) {
        const msg = json.message ?? friendlyError(json.error);
        setError(msg);
        return null;
      }

      setData(json.data);
      return json.data;
    } catch (err: any) {
      const msg = 'Network error — check your connection and try again.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { fetch, data, loading, error, reset };
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case 'UNSUPPORTED_SITE':
      return 'This website is not supported yet. Supported: ZAP Imóveis, VivaReal, QuintoAndar.';
    case 'BLOCKED':
      return 'The listing site is blocking automated access. Make sure SCRAPERAPI_KEY is set in production.';
    case 'PARSE_ERROR':
      return 'The page loaded but the data could not be extracted. The site may have changed its layout.';
    case 'TIMEOUT':
      return 'The request timed out. The site may be slow — try again in a moment.';
    case 'INVALID_URL':
      return 'Please paste a valid property listing URL.';
    default:
      return 'Something went wrong. Try again or fill in the form manually.';
  }
}
