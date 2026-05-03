/**
 * Rent Compare — scoring + confidence.
 *
 * Approach:
 *   1. Normalize each comp by R$/m² and project onto the SUBJECT's area.
 *      This dampens the area-mix noise inherent in raw rent comparisons.
 *   2. Weight leased comps higher than active listings (1.0 vs 0.7).
 *      Asks ≠ actuals. Quinto Andar surfaces leased data; portals like
 *      Vivareal/Zap don't, so their comps weigh in at 0.7.
 *   3. The recommendation is the WEIGHTED MEDIAN of the projected rents.
 *      The recommended range is the WEIGHTED P25–P75 (interquartile).
 *   4. Confidence rolls up: comp count, IQR/median tightness, leased share,
 *      and how much relaxation was needed.
 */

import type { RentalListing, RentSubject, RentScore, ScoredComp } from './types';

const WEIGHT_LEASED = 1.0;
const WEIGHT_ACTIVE = 0.7;

function weightedQuantile(samples: { v: number; w: number }[], q: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a.v - b.v);
  const totalW = sorted.reduce((s, x) => s + x.w, 0);
  if (totalW <= 0) return 0;
  const target = q * totalW;
  let cum = 0;
  for (let i = 0; i < sorted.length; i++) {
    cum += sorted[i].w;
    if (cum >= target) {
      // Linear interpolation for smoother boundaries
      if (i === 0) return sorted[0].v;
      const prev = cum - sorted[i].w;
      const ratio = (target - prev) / sorted[i].w;
      return sorted[i - 1].v + (sorted[i].v - sorted[i - 1].v) * ratio;
    }
  }
  return sorted[sorted.length - 1].v;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function scoreComps(
  subject: RentSubject,
  comps: RentalListing[],
  relaxationStepCount = 0,
): { score: RentScore; scored: ScoredComp[] } {
  if (subject.area <= 0 || comps.length === 0) {
    return {
      scored: [],
      score: {
        count: 0,
        suggestedRent: 0,
        iqrLow: 0,
        iqrHigh: 0,
        pricePerM2Median: 0,
        confidence: 'baixa',
        confidenceReason: 'Sem comparáveis suficientes',
        leasedShare: 0,
        iqrRatio: 0,
      },
    };
  }

  const scored: ScoredComp[] = comps.map((l) => {
    const ppm = l.area && l.area > 0 ? l.monthlyRent / l.area : 0;
    return {
      listing: l,
      pricePerM2: ppm,
      estimatedRentForSubject: ppm * subject.area,
      weight: l.status === 'leased' ? WEIGHT_LEASED : WEIGHT_ACTIVE,
    };
  });

  const samples = scored
    .filter((s) => s.pricePerM2 > 0)
    .map((s) => ({ v: s.estimatedRentForSubject, w: s.weight }));

  const suggested = weightedQuantile(samples, 0.5);
  const p25 = weightedQuantile(samples, 0.25);
  const p75 = weightedQuantile(samples, 0.75);
  const ppmValues = scored.filter((s) => s.pricePerM2 > 0).map((s) => s.pricePerM2);
  const ppmMedian = median(ppmValues);

  const leasedCount = scored.filter((s) => s.listing.status === 'leased').length;
  const leasedShare = leasedCount / scored.length;
  const iqrRatio = suggested > 0 ? (p75 - p25) / suggested : 1;

  const { confidence, confidenceReason } = computeConfidence({
    count: scored.length,
    leasedShare,
    iqrRatio,
    relaxationStepCount,
  });

  return {
    scored,
    score: {
      count: scored.length,
      suggestedRent: Math.round(suggested),
      iqrLow: Math.round(p25),
      iqrHigh: Math.round(p75),
      pricePerM2Median: Math.round(ppmMedian),
      confidence,
      confidenceReason,
      leasedShare,
      iqrRatio,
    },
  };
}

interface ConfidenceInput {
  count: number;
  leasedShare: number;
  iqrRatio: number;
  relaxationStepCount: number;
}

export function computeConfidence({
  count,
  leasedShare,
  iqrRatio,
  relaxationStepCount,
}: ConfidenceInput): { confidence: 'alta' | 'media' | 'baixa'; confidenceReason: string } {
  // Hard floor — fewer than 3 comps is always low confidence.
  if (count < 3) {
    return {
      confidence: 'baixa',
      confidenceReason: `Apenas ${count} comparável${count === 1 ? '' : 'is'} — mercado com pouco dado`,
    };
  }

  // Heavy relaxation = low confidence regardless of count.
  if (relaxationStepCount >= 3) {
    return {
      confidence: 'baixa',
      confidenceReason: 'Filtros muito relaxados para encontrar comparáveis',
    };
  }

  const tight = iqrRatio < 0.15;
  const looseIqr = iqrRatio > 0.30;
  const hasLeased = leasedShare > 0;

  if (count >= 6 && tight && hasLeased && relaxationStepCount <= 1) {
    return {
      confidence: 'alta',
      confidenceReason: `${count} comparáveis, faixa apertada e dados de aluguéis fechados`,
    };
  }

  if (count < 5 || looseIqr || (relaxationStepCount === 2)) {
    const reason = looseIqr
      ? 'Faixa de aluguéis ampla — comparáveis com bastante dispersão'
      : count < 5
      ? `Poucos comparáveis (${count}) para alta confiança`
      : 'Filtros precisaram ser relaxados';
    return { confidence: 'media', confidenceReason: reason };
  }

  return {
    confidence: 'media',
    confidenceReason: hasLeased
      ? 'Dados consistentes mas com base limitada'
      : 'Apenas anúncios ativos — sem aluguéis fechados como referência',
  };
}

/**
 * Build the plain-PT summary line shown to the user.
 * Example output: "Com base em 8 comparáveis no bairro (5 fechados nos
 * últimos 90 dias, 3 ativos), apartamentos 3/2 nesta região alugam por
 * cerca de R$ 2.275/mês, com faixa de R$ 2.150 a R$ 2.400. Confiança: alta."
 */
export function summarize(
  subject: RentSubject,
  scored: ScoredComp[],
  score: RentScore,
  relaxationLog: string[],
): string {
  if (score.count === 0) {
    return 'Não foi possível calcular um aluguel sugerido — sem comparáveis válidos.';
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

  const leasedCount = scored.filter((s) => s.listing.status === 'leased').length;
  const activeCount = scored.length - leasedCount;
  const scopeNote = relaxationLog.length === 0
    ? `no bairro de ${subject.neighborhood}`
    : `na região de ${subject.city}`;
  const breakdown = leasedCount > 0
    ? `${leasedCount} fechado${leasedCount === 1 ? '' : 's'} recentemente, ${activeCount} ativo${activeCount === 1 ? '' : 's'}`
    : `${activeCount} anúncio${activeCount === 1 ? '' : 's'} ativo${activeCount === 1 ? '' : 's'}`;

  const bedsBaths = subject.bathrooms != null
    ? `${subject.bedrooms}Q/${subject.bathrooms}B`
    : `${subject.bedrooms}Q`;

  return (
    `Com base em ${score.count} comparáveis ${scopeNote} ` +
    `(${breakdown}), imóveis ${bedsBaths} similares alugam por cerca de ` +
    `${fmt(score.suggestedRent)}/mês, com faixa de ${fmt(score.iqrLow)} a ${fmt(score.iqrHigh)}. ` +
    `Confiança: ${score.confidence}.`
  );
}
