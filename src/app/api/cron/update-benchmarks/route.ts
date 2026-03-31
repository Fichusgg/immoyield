/**
 * Weekly cron: fetches the latest CDI rate from BACEN SGS série 4389
 * and upserts it into market_benchmarks.
 *
 * BACEN endpoint returns the *daily* CDI rate (e.g. 0.05265).
 * We annualize it: (1 + daily/100)^252 - 1
 *
 * Secured by CRON_SECRET env var — set the same value in Vercel cron config.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const BACEN_CDI_URL =
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';

// Annualize a daily CDI rate using 252 business days convention
function annualizeCDI(dailyPercent: number): number {
  const daily = dailyPercent / 100;
  return ((1 + daily) ** 252 - 1) * 100;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch from BACEN
  let cdiAnnual: number;
  try {
    const res = await fetch(BACEN_CDI_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`BACEN responded ${res.status}`);
    const data = (await res.json()) as Array<{ data: string; valor: string }>;
    if (!data.length) throw new Error('Empty BACEN response');
    const dailyRate = parseFloat(data[0].valor);
    cdiAnnual = parseFloat(annualizeCDI(dailyRate).toFixed(4));
  } catch (err) {
    console.error('[cron/update-benchmarks] BACEN fetch failed', err);
    return NextResponse.json({ error: 'BACEN fetch failed' }, { status: 502 });
  }

  // Update by metric identifier (bypasses RLS via service_role key)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('market_benchmarks')
    .update({
      value: cdiAnnual,
      source: 'BACEN SGS 4389',
      updated_at: new Date().toISOString(),
    })
    .eq('metric', 'cdi');

  if (error) {
    console.error('[cron/update-benchmarks] update failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/update-benchmarks] CDI updated → ${cdiAnnual}% a.a.`);
  return NextResponse.json({ ok: true, cdi: cdiAnnual });
}
