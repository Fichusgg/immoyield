import { describe, it, expect } from 'vitest';
import { scoreComps, computeConfidence } from '../score';
import type { RentSubject, RentalListing } from '../types';

const subject: RentSubject = {
  city: 'São Paulo',
  neighborhood: 'Vila Madalena',
  bucket: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  area: 80,
};

function makeComp(rent: number, area: number, status: 'active' | 'leased' = 'active'): RentalListing {
  return {
    id: `c-${rent}-${area}-${status}`,
    source: 'vivareal',
    url: '',
    scrapedAt: '',
    bucket: 'apartment',
    monthlyRent: rent,
    area,
    status,
    neighborhood: 'Vila Madalena',
    city: 'São Paulo',
    bedrooms: 2,
    bathrooms: 2,
  };
}

describe('scoreComps — basic distribution', () => {
  it('returns zero score for empty comp set', () => {
    const r = scoreComps(subject, []);
    expect(r.score.count).toBe(0);
    expect(r.score.suggestedRent).toBe(0);
    expect(r.score.confidence).toBe('baixa');
  });

  it('projects each comp onto the subject area via R$/m²', () => {
    // One 80m² comp at R$ 4000/mo → R$ 50/m². For a subject of 80m² this
    // projects right back to R$ 4000.
    const r = scoreComps(subject, [makeComp(4000, 80)]);
    expect(r.scored[0].pricePerM2).toBe(50);
    expect(r.scored[0].estimatedRentForSubject).toBe(4000);
  });

  it('projects a 100m² comp at R$ 5000 onto an 80m² subject as R$ 4000', () => {
    const r = scoreComps(subject, [makeComp(5000, 100)]);
    expect(r.scored[0].pricePerM2).toBe(50);
    expect(r.scored[0].estimatedRentForSubject).toBe(4000);
  });
});

describe('scoreComps — weighting (leased vs active)', () => {
  it('weights leased comps at 1.0 and active at 0.7', () => {
    const r = scoreComps(subject, [
      makeComp(4000, 80, 'leased'),
      makeComp(5000, 80, 'active'),
    ]);
    expect(r.scored.find((s) => s.listing.status === 'leased')!.weight).toBe(1.0);
    expect(r.scored.find((s) => s.listing.status === 'active')!.weight).toBe(0.7);
  });

  it('a single leased comp pulls the median toward the leased value', () => {
    // Active only: median ≈ 5000. Add a leased comp at 3000 (weight 1.0
    // vs active 0.7) and the weighted median should drop materially.
    const activeOnly = scoreComps(subject, [
      makeComp(5000, 80, 'active'),
      makeComp(5100, 80, 'active'),
      makeComp(4900, 80, 'active'),
    ]);
    const withLeased = scoreComps(subject, [
      makeComp(5000, 80, 'active'),
      makeComp(5100, 80, 'active'),
      makeComp(4900, 80, 'active'),
      makeComp(3000, 80, 'leased'),
    ]);
    expect(withLeased.score.suggestedRent).toBeLessThan(activeOnly.score.suggestedRent);
  });
});

describe('scoreComps — IQR range', () => {
  it('produces a meaningful P25–P75 spread when rents vary', () => {
    const comps = [3000, 3500, 4000, 4500, 5000, 5500].map((r) => makeComp(r, 80));
    const result = scoreComps(subject, comps);
    expect(result.score.iqrLow).toBeLessThan(result.score.suggestedRent);
    expect(result.score.iqrHigh).toBeGreaterThan(result.score.suggestedRent);
    expect(result.score.iqrLow).toBeGreaterThanOrEqual(3000);
    expect(result.score.iqrHigh).toBeLessThanOrEqual(5500);
  });
});

describe('computeConfidence', () => {
  it('returns baixa for fewer than 3 comps', () => {
    const r = computeConfidence({
      count: 2,
      leasedShare: 0.5,
      iqrRatio: 0.05,
      relaxationStepCount: 0,
    });
    expect(r.confidence).toBe('baixa');
  });

  it('returns baixa when relaxation needed 3+ steps', () => {
    const r = computeConfidence({
      count: 8,
      leasedShare: 0.5,
      iqrRatio: 0.05,
      relaxationStepCount: 3,
    });
    expect(r.confidence).toBe('baixa');
  });

  it('returns alta with 6+ comps, tight IQR, leased data, no relaxation', () => {
    const r = computeConfidence({
      count: 8,
      leasedShare: 0.4,
      iqrRatio: 0.10,
      relaxationStepCount: 0,
    });
    expect(r.confidence).toBe('alta');
  });

  it('returns media when only active listings (no leased)', () => {
    const r = computeConfidence({
      count: 8,
      leasedShare: 0,
      iqrRatio: 0.10,
      relaxationStepCount: 0,
    });
    expect(r.confidence).toBe('media');
  });

  it('returns media when IQR is wide', () => {
    const r = computeConfidence({
      count: 8,
      leasedShare: 0.5,
      iqrRatio: 0.40,
      relaxationStepCount: 0,
    });
    expect(r.confidence).toBe('media');
  });
});
