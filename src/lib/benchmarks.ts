import { createClient } from '@/lib/supabase/server';

export interface Benchmarks {
  cdi: number;
  fii: number;
  /** LCI: isenta de IR para PF, tipicamente 85–95% do CDI. */
  lci: number;
  /** LCA: mesma característica tributária que LCI. */
  lca: number;
  /** Tesouro IPCA+ (NTN-B): cupom real + IPCA. Valor abaixo é o retorno real a.a. */
  tesouroIpcaReal: number;
  /** IPCA projetado 12m (Focus). Usado para compor o Tesouro IPCA+ nominal. */
  ipcaProjected: number;
  updatedAt: string | null;
}

const FALLBACKS: Benchmarks = {
  cdi: 13.65,
  fii: 8.0,
  lci: 13.65 * 0.92,          // ~92% do CDI, isento de IR p/ PF
  lca: 13.65 * 0.92,
  tesouroIpcaReal: 6.2,        // taxa real típica NTN-B 2035
  ipcaProjected: 4.0,
  updatedAt: null,
};

/**
 * Reads the latest market benchmarks from Supabase.
 * Looks up rows by the `metric` column (stable text identifier).
 * Falls back to hardcoded defaults if the table is empty or unreachable.
 */
export async function getBenchmarks(): Promise<Benchmarks> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('market_benchmarks')
      .select('metric, value, updated_at')
      .in('metric', [
        'cdi',
        'fii_ifix',
        'lci',
        'lca',
        'tesouro_ipca_real',
        'ipca_projected',
      ]);

    if (error || !data?.length) return FALLBACKS;

    const byMetric = Object.fromEntries(data.map((r) => [r.metric, r]));
    const cdi = byMetric['cdi']?.value ?? FALLBACKS.cdi;

    return {
      cdi,
      fii: byMetric['fii_ifix']?.value ?? FALLBACKS.fii,
      lci: byMetric['lci']?.value ?? cdi * 0.92,
      lca: byMetric['lca']?.value ?? cdi * 0.92,
      tesouroIpcaReal:
        byMetric['tesouro_ipca_real']?.value ?? FALLBACKS.tesouroIpcaReal,
      ipcaProjected: byMetric['ipca_projected']?.value ?? FALLBACKS.ipcaProjected,
      updatedAt: byMetric['cdi']?.updated_at ?? null,
    };
  } catch {
    return FALLBACKS;
  }
}
