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
      return 'Este site ainda não é suportado. Tente um link do ZAP, VivaReal, QuintoAndar ou outro portal imobiliário.';
    case 'BLOCKED':
      return 'O site está bloqueando o acesso automatizado. Defina SCRAPERAPI_KEY em produção.';
    case 'PARSE_ERROR':
      return 'A página foi carregada, mas não conseguimos extrair os dados. O site pode exigir JavaScript — configure SCRAPERAPI_KEY ou preencha o formulário manualmente.';
    case 'TIMEOUT':
      return 'A requisição excedeu o tempo limite. O site pode estar lento — tente novamente em instantes.';
    case 'INVALID_URL':
      return 'Cole um link de anúncio válido (http:// ou https://).';
    default:
      return 'Algo deu errado. Tente novamente ou preencha o formulário manualmente.';
  }
}
