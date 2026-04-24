import { describe, it, expect } from 'vitest';
import { carneLeaoMonthly, computeRentalIR, capitalGainTax } from '../taxes';

describe('Carnê-Leão progressive IR', () => {
  it('returns zero in the exempt bracket', () => {
    expect(carneLeaoMonthly(2000)).toBe(0);
    expect(carneLeaoMonthly(2259.20)).toBe(0);
  });

  it('calculates IR in the top bracket (27.5%)', () => {
    // R$10.000 - parcela a deduzir R$896 = R$1.854
    expect(carneLeaoMonthly(10_000)).toBeCloseTo(10_000 * 0.275 - 896, 2);
  });

  it('deducts condo + iptu + mgmt fee before applying the table', () => {
    const res = computeRentalIR({
      grossMonthlyRent: 6800,
      condo: 1400,
      iptu: 750,
      managementFee: 340,
      vacancyRate: 0,
    });
    // taxable = 6800 - (1400 + 750 + 340) = 4310 → faixa 22.5%
    expect(res.taxableMonthly).toBeCloseTo(4310, 2);
    expect(res.marginalRate).toBe(0.225);
    expect(res.monthlyIR).toBeCloseTo(4310 * 0.225 - 662.77, 2);
  });

  it('drops to zero IR when deductions exceed rent', () => {
    const res = computeRentalIR({
      grossMonthlyRent: 1500,
      condo: 1000,
      iptu: 300,
      managementFee: 300,
      vacancyRate: 0,
    });
    expect(res.monthlyIR).toBe(0);
  });
});

describe('Capital gain tax', () => {
  it('applies 15% below R$5M', () => {
    expect(capitalGainTax({ gain: 200_000 })).toBe(30_000);
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
