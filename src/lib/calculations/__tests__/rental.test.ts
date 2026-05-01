import { describe, it, expect } from 'vitest';
import { analyzeRentalDeal } from '../rental';
import { DealInputs } from '../types';

describe('Rental Analysis Logic', () => {
  const mockInput: DealInputs = {
    purchasePrice: 500000,
    acquisitionCosts: {
      itbiPercent: 0.03, // 3%
      cartorio: 5000,
      reforms: 20000,
    },
    financing: {
      enabled: true,
      downPayment: 100000,
      interestRateYear: 10,
      termMonths: 360,
      system: 'SAC',
    },
    revenue: {
      monthlyRent: 3500,
      vacancyRate: 0.05, // 5%
    },
    expenses: {
      condo: 500,
      iptu: 200,
      managementPercent: 0.1, // 10%
      maintenancePercent: 0.05, // 5%
    },
  };

  it('should calculate the correct total investment and cash outlay', () => {
    const { metrics } = analyzeRentalDeal(mockInput);

    // Total = 500k + 15k (ITBI) + 5k (Cartorio) + 20k (Reforms) = 540,000
    expect(metrics.totalInvestment).toBe(540000);

    // Cash Outlay = Total (540k) - Loan (400k) = 140,000
    expect(metrics.cashOutlay).toBe(140000);
  });

  it('should calculate NOI correctly', () => {
    const { metrics } = analyzeRentalDeal(mockInput);

    // Gross = 3500 * 0.95 = 3325
    // Expenses = 500 (condo) + 200 (iptu) + 350 (mngmt) + 175 (maint) = 1225
    // NOI = 3325 - 1225 = 2100
    expect(metrics.monthlyNOI).toBe(2100);
  });

  it('should calculate Cap Rate correctly', () => {
    const { metrics } = analyzeRentalDeal(mockInput);

    // (2100 * 12) / 500,000 = 5.04%
    expect(metrics.capRate).toBeCloseTo(5.04, 2);
  });
});

// ─── Regime branching at the deal level ─────────────────────────────────────

describe('analyzeRentalDeal — CPF vs CNPJ', () => {
  const baseInput: DealInputs = {
    purchasePrice: 500_000,
    acquisitionCosts: { itbiPercent: 0.03, cartorio: 5_000, reforms: 0 },
    financing: {
      enabled: false,
      downPayment: 500_000,
      interestRateYear: 0,
      termMonths: 360,
      system: 'SAC',
    },
    revenue: { monthlyRent: 5_000, vacancyRate: 0 },
    expenses: { condo: 0, iptu: 0, managementPercent: 0, maintenancePercent: 0 },
  };

  it('PF (CPF): applies Carnê-Leão on rent net of deductions', () => {
    const { metrics } = analyzeRentalDeal({
      ...baseInput,
      taxation: { regime: 'PF' },
    });
    expect(metrics.taxRegime).toBe('PF');
    // 5000 in top bracket (>4664.68) → 27.5% × 5000 - 896 = 478.5
    expect(metrics.monthlyIR).toBeCloseTo(5_000 * 0.275 - 896, 2);
    expect(metrics.annualIR).toBeCloseTo(metrics.monthlyIR * 12, 2);
  });

  it('PJ (CNPJ): applies Lucro Presumido on gross rent', () => {
    const { metrics } = analyzeRentalDeal({
      ...baseInput,
      taxation: { regime: 'PJ' },
    });
    expect(metrics.taxRegime).toBe('PJ');
    // PJ at R$5k = 11.33% of 5000 = R$566.50
    expect(metrics.monthlyIR).toBeCloseTo(566.5, 2);
    expect(metrics.annualIR).toBeCloseTo(566.5 * 12, 2);
  });

  it('isento: zero IR for both rental and projections', () => {
    const { metrics } = analyzeRentalDeal({
      ...baseInput,
      taxation: { regime: 'isento' },
    });
    expect(metrics.monthlyIR).toBe(0);
    expect(metrics.annualIR).toBe(0);
  });

  it('PF and PJ produce different cash flows for the same deal', () => {
    const pf = analyzeRentalDeal({ ...baseInput, taxation: { regime: 'PF' } });
    const pj = analyzeRentalDeal({ ...baseInput, taxation: { regime: 'PJ' } });
    // Cash flows must differ — same gross rent, different tax math.
    expect(pf.metrics.monthlyCashFlow).not.toBe(pj.metrics.monthlyCashFlow);
    expect(pf.metrics.netYieldAnnualPct).not.toBe(pj.metrics.netYieldAnnualPct);
  });

  it('crossover: PF wins at low rent (parcela a deduzir > 27.5% bracket lift)', () => {
    // At R$5k rent, no deductions: PF = 5000×0.275 - 896 = 478.50
    //                              PJ = 5000×0.1133       = 566.50
    // PF tax is lower, so PF cashflow is higher.
    const lowRent = { ...baseInput, revenue: { monthlyRent: 5_000, vacancyRate: 0 } };
    const pf = analyzeRentalDeal({ ...lowRent, taxation: { regime: 'PF' } });
    const pj = analyzeRentalDeal({ ...lowRent, taxation: { regime: 'PJ' } });
    expect(pf.metrics.monthlyIR).toBeLessThan(pj.metrics.monthlyIR ?? 0);
    expect(pf.metrics.monthlyCashFlow).toBeGreaterThan(pj.metrics.monthlyCashFlow);
  });

  it('crossover: PJ wins at high rent where the 27.5% top bracket dominates', () => {
    // At R$30k rent: PF = 30000×0.275 - 896 = 7354 (~24.5% effective)
    //                PJ = 30000×0.1133       = 3399 (~11.33% effective)
    const highRent = { ...baseInput, revenue: { monthlyRent: 30_000, vacancyRate: 0 } };
    const pf = analyzeRentalDeal({ ...highRent, taxation: { regime: 'PF' } });
    const pj = analyzeRentalDeal({ ...highRent, taxation: { regime: 'PJ' } });
    expect(pj.metrics.monthlyIR).toBeLessThan(pf.metrics.monthlyIR ?? 0);
    expect(pj.metrics.monthlyCashFlow).toBeGreaterThan(pf.metrics.monthlyCashFlow);
  });

  it('gross yields are identical regardless of regime', () => {
    const pf = analyzeRentalDeal({ ...baseInput, taxation: { regime: 'PF' } });
    const pj = analyzeRentalDeal({ ...baseInput, taxation: { regime: 'PJ' } });
    expect(pf.metrics.grossYieldAnnualPct).toBeCloseTo(pj.metrics.grossYieldAnnualPct ?? 0, 6);
    expect(pf.metrics.grossMonthlyRent).toBe(pj.metrics.grossMonthlyRent);
  });

  it('default (no taxation field) behaves like PF', () => {
    const noRegime = analyzeRentalDeal(baseInput);
    const pfExplicit = analyzeRentalDeal({ ...baseInput, taxation: { regime: 'PF' } });
    expect(noRegime.metrics.monthlyIR).toBeCloseTo(pfExplicit.metrics.monthlyIR ?? 0, 2);
  });

  it('PJ effective rate hovers around 11.33% for sub-threshold revenue', () => {
    const { metrics } = analyzeRentalDeal({
      ...baseInput,
      revenue: { monthlyRent: 8_000, vacancyRate: 0 },
      taxation: { regime: 'PJ' },
    });
    expect(metrics.effectiveIRRate).toBeCloseTo(0.1133, 4);
  });

  it('PJ flip: sale tax applies Lucro Presumido on gross sale revenue', () => {
    const { flipMetrics } = analyzeRentalDeal({
      ...baseInput,
      propertyType: 'flip',
      revenue: { monthlyRent: 0, vacancyRate: 0, afterRepairValue: 800_000, holdingMonths: 6 },
      expenses: {
        condo: 0,
        iptu: 0,
        managementPercent: 0,
        maintenancePercent: 0,
        sellingCostPercent: 0.06,
      },
      taxation: { regime: 'PJ' },
    });
    // Lucro Presumido on R$800k revenue:
    //   presumed base = 256k → IRPJ 38.4k + adicional (256k-20k)*0.10 = 23.6k → 62k
    //   CSLL = 256k * 0.09 = 23.04k
    //   PIS = 800k * 0.0065 = 5.2k
    //   COFINS = 800k * 0.03 = 24k
    //   total ≈ 114.24k
    expect(flipMetrics?.capitalGainTax).toBeCloseTo(114_240, 0);
  });

  it('PF flip: sale tax is 15% of the gain (capital gain)', () => {
    const { flipMetrics } = analyzeRentalDeal({
      ...baseInput,
      propertyType: 'flip',
      revenue: { monthlyRent: 0, vacancyRate: 0, afterRepairValue: 800_000, holdingMonths: 6 },
      expenses: {
        condo: 0,
        iptu: 0,
        managementPercent: 0,
        maintenancePercent: 0,
        sellingCostPercent: 0.06,
      },
      taxation: { regime: 'PF' },
    });
    // grossProfit = 800k - acquisition - sellingCosts
    //   acquisition = 500k * 1.03 + 5000 = 520k
    //   sellingCosts = 800k * 0.06 = 48k
    //   grossProfit = 800k - 520k - 48k = 232k → CG = 232k * 0.15 = 34.8k
    expect(flipMetrics?.capitalGainTax).toBeCloseTo(34_800, 0);
  });
});
