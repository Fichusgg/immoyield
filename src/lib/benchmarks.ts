import { createClient } from '@/lib/supabase/server';

export interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

const FALLBACKS: Benchmarks = {
  cdi: 13.65,
  fii: 8.0,
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
      .in('metric', ['cdi', 'fii_ifix']);

    if (error || !data?.length) return FALLBACKS;

    const byMetric = Object.fromEntries(data.map((r) => [r.metric, r]));

    return {
      cdi: byMetric['cdi']?.value ?? FALLBACKS.cdi,
      fii: byMetric['fii_ifix']?.value ?? FALLBACKS.fii,
      updatedAt: byMetric['cdi']?.updated_at ?? null,
    };
  } catch {
    return FALLBACKS;
  }
}
