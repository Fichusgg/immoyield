import { describe, it, expect } from 'vitest';
import {
  carneLeaoMonthly,
  computeRentalIR,
  capitalGainTax,
  lucroPresumidoMonthly,
  computeSaleTax,
  LUCRO_PRESUMIDO,
  CARNE_LEAO_BRACKETS_2024,
} from '../taxes';

describe('Carnê-Leão progressive IR (PF)', () => {
  it('returns zero in the exempt bracket', () => {
    expect(carneLeaoMonthly(2000)).toBe(0);
    expect(carneLeaoMonthly(2259.20)).toBe(0);
  });

  it('calculates IR in the 7.5% bracket', () => {
    // R$2500 - parcela a deduzir R$169.44
    expect(carneLeaoMonthly(2500)).toBeCloseTo(2500 * 0.075 - 169.44, 2);
  });

  it('calculates IR in the 15% bracket', () => {
    // R$3500 - parcela a deduzir R$381.44
    expect(carneLeaoMonthly(3500)).toBeCloseTo(3500 * 0.15 - 381.44, 2);
  });

  it('calculates IR in the 22.5% bracket', () => {
    // R$4200 - parcela a deduzir R$662.77
    expect(carneLeaoMonthly(4200)).toBeCloseTo(4200 * 0.225 - 662.77, 2);
  });

  it('calculates IR in the top bracket (27.5%)', () => {
    // R$10.000 - parcela a deduzir R$896 = R$1.854
    expect(carneLeaoMonthly(10_000)).toBeCloseTo(10_000 * 0.275 - 896, 2);
  });

  it('progressive table is monotonically increasing', () => {
    let prev = -1;
    for (const v of [0, 1000, 2259.20, 2500, 3500, 4200, 5000, 8000, 15_000]) {
      const ir = carneLeaoMonthly(v);
      expect(ir).toBeGreaterThanOrEqual(prev);
      prev = ir;
    }
  });

  it('deducts condo + iptu + mgmt fee before applying the table', () => {
    const res = computeRentalIR({
      grossMonthlyRent: 6800,
      condo: 1400,
      iptu: 750,
      managementFee: 340,
      vacancyRate: 0,
      regime: 'PF',
    });
    // taxable = 6800 - (1400 + 750 + 340) = 4310 → faixa 22.5%
    expect(res.taxableMonthly).toBeCloseTo(4310, 2);
    expect(res.marginalRate).toBe(0.225);
    expect(res.monthlyIR).toBeCloseTo(4310 * 0.225 - 662.77, 2);
    expect(res.regime).toBe('PF');
  });

  it('applies vacancy before deductions', () => {
    const res = computeRentalIR({
      grossMonthlyRent: 5000,
      condo: 0,
      iptu: 0,
      managementFee: 0,
      vacancyRate: 0.2, // 20% vacant → effective 4000
      regime: 'PF',
    });
    expect(res.taxableMonthly).toBeCloseTo(4000, 2);
    expect(res.marginalRate).toBe(0.225); // 4000 ≤ 4664.68
    expect(res.monthlyIR).toBeCloseTo(4000 * 0.225 - 662.77, 2);
  });

  it('drops to zero IR when deductions exceed rent', () => {
    const res = computeRentalIR({
      grossMonthlyRent: 1500,
      condo: 1000,
      iptu: 300,
      managementFee: 300,
      vacancyRate: 0,
      regime: 'PF',
    });
    expect(res.monthlyIR).toBe(0);
  });

  it('all bracket boundaries match the published parcela a deduzir', () => {
    // For each bracket boundary, IR should equal upper * rate - deduction.
    for (const b of CARNE_LEAO_BRACKETS_2024) {
      if (!Number.isFinite(b.upTo)) continue;
      expect(carneLeaoMonthly(b.upTo)).toBeCloseTo(b.upTo * b.rate - b.deduction, 2);
    }
  });
});

describe('Capital gain tax (PF)', () => {
  it('applies 15% below R$5M', () => {
    expect(capitalGainTax({ gain: 200_000 })).toBe(30_000);
  });

  it('applies escalating brackets above R$5M', () => {
    // Gain 7M → first 5M at 15%, next 2M at 17.5%
    expect(capitalGainTax({ gain: 7_000_000 })).toBeCloseTo(
      5_000_000 * 0.15 + 2_000_000 * 0.175,
      2,
    );
  });

  it('returns zero when reinvesting within 180 days', () => {
    expect(
      capitalGainTax({ gain: 500_000, reinvestWithin180Days: true })
    ).toBe(0);
  });

  it('returns zero for non-positive gain', () => {
    expect(capitalGainTax({ gain: -10_000 })).toBe(0);
  });
});

describe('Lucro Presumido (PJ)', () => {
  it('applies the textbook ~11.33% effective rate on gross rental revenue (below adicional threshold)', () => {
    // R$5k: presumed base = R$1600 → no IRPJ adicional.
    // Components:
    //   IRPJ:    1600 × 0.15  = 240
    //   CSLL:    1600 × 0.09  = 144
    //   PIS:     5000 × 0.0065 = 32.50
    //   COFINS:  5000 × 0.03   = 150
    //   total = 566.50  →  effective = 11.33%
    const r = lucroPresumidoMonthly(5_000);
    expect(r.components.irpj).toBeCloseTo(240, 2);
    expect(r.components.csll).toBeCloseTo(144, 2);
    expect(r.components.pis).toBeCloseTo(32.5, 2);
    expect(r.components.cofins).toBeCloseTo(150, 2);
    expect(r.components.irpjAdicional).toBe(0);
    expect(r.monthlyTax).toBeCloseTo(566.5, 2);
    expect(r.effectiveRate).toBeCloseTo(0.1133, 4);
  });

  it('triggers IRPJ adicional only when presumed base exceeds R$20k/month', () => {
    // Right at threshold: presumed base = R$20k (revenue = R$62.5k) → no adicional
    const atThreshold = lucroPresumidoMonthly(62_500);
    expect(atThreshold.components.irpjAdicional).toBe(0);

    // Well above: revenue = R$100k → presumed = R$32k → R$12k over threshold × 10% = R$1200
    const above = lucroPresumidoMonthly(100_000);
    expect(above.components.irpjAdicional).toBeCloseTo(
      (32_000 - LUCRO_PRESUMIDO.irpjAdicionalMonthlyThreshold) *
        LUCRO_PRESUMIDO.irpjAdicionalRate,
      2,
    );
  });

  it('total monthly tax equals the sum of components', () => {
    const r = lucroPresumidoMonthly(50_000);
    const summed =
      r.components.irpj +
      r.components.irpjAdicional +
      r.components.csll +
      r.components.pis +
      r.components.cofins;
    expect(r.monthlyTax).toBeCloseTo(summed, 6);
  });

  it('returns zero on zero/negative revenue', () => {
    expect(lucroPresumidoMonthly(0).monthlyTax).toBe(0);
    expect(lucroPresumidoMonthly(0).effectiveRate).toBe(0);
    expect(lucroPresumidoMonthly(-100).monthlyTax).toBe(0);
  });

  it('effective rate stays under 15% even at very high revenue', () => {
    // Sanity: sum of nominal rates is bounded.
    const r = lucroPresumidoMonthly(1_000_000);
    expect(r.effectiveRate).toBeLessThan(0.15);
    expect(r.effectiveRate).toBeGreaterThan(0.10);
  });
});

describe('computeRentalIR — regime branching', () => {
  const args = {
    grossMonthlyRent: 5_000,
    condo: 800,
    iptu: 300,
    managementFee: 500,
    vacancyRate: 0,
  } as const;

  it('routes to Carnê-Leão when regime is PF', () => {
    const r = computeRentalIR({ ...args, regime: 'PF' });
    expect(r.regime).toBe('PF');
    // taxable = 5000 - (800 + 300 + 500) = 3400  → faixa 15%
    expect(r.taxableMonthly).toBeCloseTo(3400, 2);
    expect(r.marginalRate).toBe(0.15);
    expect(r.monthlyIR).toBeCloseTo(3400 * 0.15 - 381.44, 2);
  });

  it('routes to Lucro Presumido when regime is PJ — ignores PF deductions', () => {
    const r = computeRentalIR({ ...args, regime: 'PJ' });
    expect(r.regime).toBe('PJ');
    // PJ taxes the effective rent (5000), not the post-deduction value.
    expect(r.taxableMonthly).toBeCloseTo(5_000, 2);
    expect(r.monthlyIR).toBeCloseTo(lucroPresumidoMonthly(5_000).monthlyTax, 4);
  });

  it('PJ tax is materially higher than PF for low rent (where PF is exempt)', () => {
    const lowRent = {
      grossMonthlyRent: 2_500,
      condo: 0,
      iptu: 0,
      managementFee: 0,
      vacancyRate: 0,
    } as const;
    const pf = computeRentalIR({ ...lowRent, regime: 'PF' });
    const pj = computeRentalIR({ ...lowRent, regime: 'PJ' });
    expect(pf.monthlyIR).toBeLessThan(pj.monthlyIR);
  });

  it('PJ tax can be lower than PF for high rent (where PF tops out at 27.5%)', () => {
    // PF effective on top bracket: 27.5% on the band, capped by deductions.
    // PJ: ~11.33% — much lower for high rent without big deductions.
    const highRent = {
      grossMonthlyRent: 30_000,
      condo: 0,
      iptu: 0,
      managementFee: 0,
      vacancyRate: 0,
    } as const;
    const pf = computeRentalIR({ ...highRent, regime: 'PF' });
    const pj = computeRentalIR({ ...highRent, regime: 'PJ' });
    expect(pj.monthlyIR).toBeLessThan(pf.monthlyIR);
  });

  it('default regime is PF when omitted', () => {
    const r = computeRentalIR({
      grossMonthlyRent: 5_000,
      condo: 0,
      iptu: 0,
      managementFee: 0,
      vacancyRate: 0,
    });
    expect(r.regime).toBe('PF');
  });
});

describe('computeSaleTax — regime branching', () => {
  it('PF: applies 15% on the gain', () => {
    const r = computeSaleTax({ salePrice: 800_000, gain: 200_000, regime: 'PF' });
    expect(r.regime).toBe('PF');
    expect(r.tax).toBe(30_000);
    expect(r.effectiveRate).toBeCloseTo(0.15, 4);
  });

  it('PJ: applies Lucro Presumido on the gross sale price (not the gain)', () => {
    const r = computeSaleTax({ salePrice: 800_000, gain: 200_000, regime: 'PJ' });
    expect(r.regime).toBe('PJ');
    expect(r.tax).toBeCloseTo(lucroPresumidoMonthly(800_000).monthlyTax, 4);
    // PJ on gross is much higher than PF 15% on gain when gain << price.
    expect(r.tax).toBeGreaterThan(30_000);
  });

  it('PF reinvestment exemption still applies', () => {
    const r = computeSaleTax({
      salePrice: 800_000,
      gain: 200_000,
      regime: 'PF',
      reinvestWithin180Days: true,
    });
    expect(r.tax).toBe(0);
  });

  it('PJ does NOT honor the 180-day reinvestment exemption (it is a PF rule)', () => {
    const r = computeSaleTax({
      salePrice: 800_000,
      gain: 200_000,
      regime: 'PJ',
      reinvestWithin180Days: true,
    });
    expect(r.tax).toBeGreaterThan(0);
  });
});
