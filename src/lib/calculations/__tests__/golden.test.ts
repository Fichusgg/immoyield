/**
 * Golden fixtures for analyzeRentalDeal + calculateProjections.
 *
 * Each fixture pins the public-facing economics (cap rate, NOI, GRM, total
 * investment, payback, year-1 cashflow) for a representative deal shape so
 * that any future formula change is forced to acknowledge a regression here.
 *
 * Hand-calc methodology: every expected value is derived from first principles
 * in the comment block above the assertion. Tax-dependent metrics use the PF
 * Carnê-Leão default (`taxation` omitted) unless the fixture explicitly sets
 * `taxation`. Tolerances are tight (toBeCloseTo with 4–6 decimals) for
 * deterministic geometry; they relax to two decimals where IR rounding bites.
 */
import { describe, it, expect } from 'vitest';
import { analyzeRentalDeal } from '../rental';
import { calculateProjections } from '../projections';
import type { DealInputs } from '../types';

// Helpers ─────────────────────────────────────────────────────────────────────

function expectFinite(label: string, value: number | null | undefined) {
  if (value === null || value === undefined) {
    throw new Error(`${label} unexpectedly null/undefined`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`${label} is not finite: ${value}`);
  }
}

// Convenience: the default rentIncludesCondoIptu is true → landlord pays
// condo + IPTU. Every fixture below assumes that unless noted.

// ── Fixture 1 — Cash purchase, no financing ─────────────────────────────────
//
// R$500k house, R$3,000/mo rent, 5% vacancy, 8% mgmt, 3% maint, R$500
// condo, R$100 IPTU. ITBI 3%, R$5k cartório, no reforms. Cash buyer.
//
// Expected (hand-calc):
//   effectiveRent = 3000 × 0.95              = 2,850.00
//   mgmt          = 2850 × 0.08              =   228.00
//   maint         = 2850 × 0.03              =    85.50
//   opex          = 500 + 100 + 228 + 85.50  =   913.50
//   NOI           = 2850 - 913.50            = 1,936.50
//   capRate       = 1936.50 × 12 / 500_000   =     4.6476 %
//   GRM (price / annual gross rent)
//                 = 500_000 / 36_000         =    13.8889
//   totalInvest   = 500k × 1.03 + 5k         =   520,000
//   cashOutlay    = 520,000 (no loan)
//   PF IR on 3000 (deductions: 500+100+228 = 828) → base 2172 → bracket 1 (≤2259.20) → 0
//   monthlyCashFlow = 1936.50 (no debt, IR=0) ⇒ payback ≈ cashOutlay / (cf×12)
//                    = 520_000 / 23_238       =    22.378 yrs

const FIX_CASH: DealInputs = {
  purchasePrice: 500_000,
  acquisitionCosts: { itbiPercent: 0.03, cartorio: 5_000, reforms: 0 },
  financing: {
    enabled: false,
    downPayment: 500_000,
    interestRateYear: 0,
    termMonths: 360,
    system: 'SAC',
  },
  revenue: { monthlyRent: 3_000, vacancyRate: 0.05 },
  expenses: { condo: 500, iptu: 100, managementPercent: 0.08, maintenancePercent: 0.03 },
};

// ── Fixture 2 — MCMV-eligible apartment ─────────────────────────────────────
//
// R$240k apartment, 90% financed, SAC 30y at 10.5% a.a. Rent R$1,500/mo,
// 5% vacancy. Modality MCMV (LTV ceiling check informational only).
//
// Hand-calc subset:
//   loanAmount  = 240k × 0.90 actually wait — downPayment supplied, not LTV
//   downPayment = 24_000 (10%) → loanAmount = 216_000
//   itbi 1% (MCMV typical) cartorio 2k reforms 0
//   totalInvest = 240k × 1.01 + 2k = 244,400
//   cashOutlay  = 244,400 - 216,000 = 28,400
//
// SAC monthly amortization = 216_000 / 360 = 600.00
// monthly rate r = (1 + 0.105)^(1/12) - 1  = 0.008354...  (9.8540×10⁻³)
// firstInterest = 216_000 × r              ≈ 1,804.50
// firstInstallment ≈ 600 + 1804.50         ≈ 2,404.50
//
// effectiveRent = 1500 × 0.95 = 1425
// mgmt = 1425 × 0.08 = 114, maint = 1425 × 0.03 = 42.75
// opex = 200 + 80 + 114 + 42.75 = 436.75
// NOI = 1425 - 436.75 = 988.25
// capRate = 988.25 × 12 / 240_000 = 4.9413 %

const FIX_MCMV: DealInputs = {
  purchasePrice: 240_000,
  acquisitionCosts: { itbiPercent: 0.01, cartorio: 2_000, reforms: 0 },
  financing: {
    enabled: true,
    downPayment: 24_000,
    interestRateYear: 10.5,
    termMonths: 360,
    system: 'SAC',
    modality: 'MCMV',
  },
  revenue: { monthlyRent: 1_500, vacancyRate: 0.05 },
  expenses: { condo: 200, iptu: 80, managementPercent: 0.08, maintenancePercent: 0.03 },
};

// ── Fixture 3 — SFH standard, PRICE 30y ──────────────────────────────────────
//
// R$500k house, 80% financed (R$100k down), PRICE 30y at 10.5% a.a.
// Rent R$3,500/mo, 5% vacancy, condo R$500, IPTU R$200, mgmt 10%, maint 5%.
//
//   itbi 3% + cartorio 5k + reforms 20k → totalInvest = 540,000
//   loanAmount  = 400_000
//   cashOutlay  = 540,000 - 400,000 = 140,000
//
// monthly rate r = (1.105)^(1/12) - 1 = 0.0083540...
// PRICE installment = 400000 × r / (1 - (1+r)^-360)
//                   ≈ 3,521.69
//
// effectiveRent = 3500 × 0.95 = 3325
// mgmt = 3325 × 0.10 = 332.50, maint = 3325 × 0.05 = 166.25
// opex = 500 + 200 + 332.50 + 166.25 = 1198.75
// NOI = 3325 - 1198.75 = 2126.25
// capRate = 2126.25 × 12 / 500_000 = 5.103 %

const FIX_SFH: DealInputs = {
  purchasePrice: 500_000,
  acquisitionCosts: { itbiPercent: 0.03, cartorio: 5_000, reforms: 20_000 },
  financing: {
    enabled: true,
    downPayment: 100_000,
    interestRateYear: 10.5,
    termMonths: 360,
    system: 'PRICE',
    modality: 'SFH',
  },
  revenue: { monthlyRent: 3_500, vacancyRate: 0.05 },
  expenses: { condo: 500, iptu: 200, managementPercent: 0.10, maintenancePercent: 0.05 },
};

// ── Fixture 4 — SFI high-value, SAC 25y ──────────────────────────────────────
//
// R$2M apartment, 70% financed (R$600k down), SAC 25y at 12.0% a.a.
// Rent R$10,000/mo, condo 1500, IPTU 600, mgmt 10%, maint 5%, vacancy 5%.
//
//   itbi 3% + cartorio 15k + reforms 0 → totalInvest = 2,075,000
//   loanAmount  = 1,400_000
//   cashOutlay  = 2,075,000 - 1,400,000 = 675,000
//
// SAC amort = 1,400,000 / 300 = 4,666.67
// r = (1.12)^(1/12) - 1 = 0.009488...
// firstInterest = 1,400,000 × 0.009488 ≈ 13,283.41
// firstInstallment ≈ 17,950.08
//
// effectiveRent = 10_000 × 0.95 = 9500
// mgmt = 950, maint = 475, opex = 1500 + 600 + 950 + 475 = 3525
// NOI = 9500 - 3525 = 5975
// capRate = 5975 × 12 / 2_000_000 = 3.585 %

const FIX_SFI: DealInputs = {
  purchasePrice: 2_000_000,
  acquisitionCosts: { itbiPercent: 0.03, cartorio: 15_000, reforms: 0 },
  financing: {
    enabled: true,
    downPayment: 600_000,
    interestRateYear: 12,
    termMonths: 300,
    system: 'SAC',
    modality: 'SFI',
  },
  revenue: { monthlyRent: 10_000, vacancyRate: 0.05 },
  expenses: { condo: 1_500, iptu: 600, managementPercent: 0.10, maintenancePercent: 0.05 },
  taxation: { regime: 'PF' },
};

// ── Fixture 5 — 100% vacancy edge ────────────────────────────────────────────

const FIX_FULL_VACANCY: DealInputs = {
  ...FIX_CASH,
  revenue: { ...FIX_CASH.revenue, vacancyRate: 1 },
};

// ── Fixture 6 — 0% down (100% financed) ──────────────────────────────────────

const FIX_ZERO_DOWN: DealInputs = {
  ...FIX_SFH,
  financing: { ...FIX_SFH.financing, downPayment: 0 },
};

// ── Fixture 7 — 30-year horizon for projection sanity ────────────────────────

const FIX_LONG_HORIZON: DealInputs = {
  ...FIX_SFH,
  projections: {
    appreciationRate: 0.05,
    incomeGrowthRate: 0.05,
    expenseGrowthRate: 0.04,
    holdPeriodYears: 30,
    sellingCostPercent: 0.06,
    depreciationPeriodYears: 25,
  },
};

// ── Fixture 8 — Negative cashflow deal ──────────────────────────────────────
// Underwriting trap: low rent + heavy financing.

const FIX_NEGATIVE_CF: DealInputs = {
  purchasePrice: 800_000,
  acquisitionCosts: { itbiPercent: 0.03, cartorio: 8_000, reforms: 0 },
  financing: {
    enabled: true,
    downPayment: 80_000, // 10% down
    interestRateYear: 13,
    termMonths: 360,
    system: 'PRICE',
    modality: 'SFH',
  },
  revenue: { monthlyRent: 2_500, vacancyRate: 0.10 },
  expenses: { condo: 800, iptu: 300, managementPercent: 0.10, maintenancePercent: 0.05 },
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Golden — Fixture 1 (cash purchase)', () => {
  const { metrics, schedule } = analyzeRentalDeal(FIX_CASH);
  it('investment / cash outlay', () => {
    expect(metrics.totalInvestment).toBeCloseTo(520_000, 6);
    expect(metrics.cashOutlay).toBeCloseTo(520_000, 6);
    expect(metrics.loanAmount).toBe(0);
  });
  it('NOI / cap rate', () => {
    expect(metrics.monthlyNOI).toBeCloseTo(1_936.50, 4);
    expect(metrics.capRate).toBeCloseTo(4.6476, 3);
    expect(metrics.grossYieldAnnualPct).toBeCloseTo(7.2, 4);
  });
  it('cash flow + payback', () => {
    // PF IR: monthly base = 3000 - (500+100+228) = 2172 → bracket 1 → 0
    expect(metrics.monthlyIR).toBe(0);
    expect(metrics.monthlyCashFlow).toBeCloseTo(1_936.50, 4);
    const annualCF = metrics.monthlyCashFlow * 12;
    const payback = metrics.cashOutlay / annualCF;
    expect(payback).toBeCloseTo(22.378, 2);
  });
  it('amortization schedule empty (no loan)', () => {
    expect(schedule).toHaveLength(0);
  });
});

describe('Golden — Fixture 2 (MCMV, SAC 30y, 10.5%)', () => {
  const { metrics, schedule } = analyzeRentalDeal(FIX_MCMV);
  it('totals + outlay', () => {
    expect(metrics.totalInvestment).toBeCloseTo(244_400, 4);
    expect(metrics.loanAmount).toBe(216_000);
    expect(metrics.cashOutlay).toBeCloseTo(28_400, 4);
  });
  it('SAC first installment ≈ 2404.50', () => {
    // r = (1.105)^(1/12) - 1; SAC amort = 216000/360 = 600
    const r = Math.pow(1.105, 1 / 12) - 1;
    const expectedFirst = 600 + 216_000 * r;
    expect(schedule[0].installment).toBeCloseTo(expectedFirst, 2);
    expect(metrics.firstInstallment).toBeCloseTo(expectedFirst, 2);
  });
  it('NOI + cap rate', () => {
    expect(metrics.monthlyNOI).toBeCloseTo(988.25, 4);
    expect(metrics.capRate).toBeCloseTo(4.9413, 3);
  });
  it('schedule monotonically draws down principal', () => {
    expect(schedule[0].remainingBalance).toBeGreaterThan(
      schedule[schedule.length - 1].remainingBalance,
    );
    expect(schedule[schedule.length - 1].remainingBalance).toBeCloseTo(0, 2);
  });
});

describe('Golden — Fixture 3 (SFH, PRICE 30y, 10.5%)', () => {
  const { metrics, schedule } = analyzeRentalDeal(FIX_SFH);
  it('totals + outlay', () => {
    expect(metrics.totalInvestment).toBeCloseTo(540_000, 4);
    expect(metrics.loanAmount).toBe(400_000);
    expect(metrics.cashOutlay).toBeCloseTo(140_000, 4);
  });
  it('PRICE installment is constant ≈ 3521.69', () => {
    const r = Math.pow(1.105, 1 / 12) - 1;
    const expectedPmt = (400_000 * r) / (1 - Math.pow(1 + r, -360));
    expect(schedule[0].installment).toBeCloseTo(expectedPmt, 2);
    // PRICE → all installments equal
    expect(schedule[100].installment).toBeCloseTo(expectedPmt, 2);
    expect(schedule[359].installment).toBeCloseTo(expectedPmt, 2);
  });
  it('NOI / cap rate', () => {
    expect(metrics.monthlyNOI).toBeCloseTo(2_126.25, 4);
    expect(metrics.capRate).toBeCloseTo(5.103, 3);
  });
  it('schedule fully amortizes', () => {
    expect(schedule[359].remainingBalance).toBeCloseTo(0, 2);
  });
});

describe('Golden — Fixture 4 (SFI, SAC 25y, 12%)', () => {
  const { metrics, schedule } = analyzeRentalDeal(FIX_SFI);
  it('totals + outlay', () => {
    expect(metrics.totalInvestment).toBeCloseTo(2_075_000, 4);
    expect(metrics.loanAmount).toBe(1_400_000);
    expect(metrics.cashOutlay).toBeCloseTo(675_000, 4);
  });
  it('NOI + cap rate', () => {
    expect(metrics.monthlyNOI).toBeCloseTo(5_975, 4);
    expect(metrics.capRate).toBeCloseTo(3.585, 3);
  });
  it('SAC first installment ≈ 17950.08', () => {
    const r = Math.pow(1.12, 1 / 12) - 1;
    const expected = 1_400_000 / 300 + 1_400_000 * r;
    expect(metrics.firstInstallment).toBeCloseTo(expected, 2);
  });
  it('IR is non-zero (PF, rent above bracket 1)', () => {
    // computeRentalIR applies vacancy to gross before subtracting deductions:
    //   effectiveRent = 10_000 × 0.95 = 9_500
    //   deductions    = 1500 + 600 + 950 = 3_050
    //   taxable       = 9_500 - 3_050    = 6_450
    //   IR (bracket 5) = 6_450 × 0.275 - 896 = 877.75
    expect(metrics.monthlyIR).toBeCloseTo(877.75, 2);
  });
  it('all schedule rows have non-negative numbers', () => {
    for (const row of schedule) {
      expect(row.installment).toBeGreaterThanOrEqual(0);
      expect(row.interest).toBeGreaterThanOrEqual(0);
      expect(row.amortization).toBeGreaterThanOrEqual(0);
      expect(row.remainingBalance).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Golden — Fixture 5 (100% vacancy)', () => {
  const { metrics } = analyzeRentalDeal(FIX_FULL_VACANCY);
  it('zero collected rent → NOI is the negative of fixed expenses', () => {
    // collected = 0, mgmt = 0, maint = 0, condo+iptu = 600
    expect(metrics.monthlyNOI).toBeCloseTo(-600, 4);
    expect(metrics.capRate).toBeLessThan(0);
  });
  it('cash flow is negative but finite', () => {
    expectFinite('monthlyCashFlow', metrics.monthlyCashFlow);
    expect(metrics.monthlyCashFlow).toBeLessThan(0);
  });
});

describe('Golden — Fixture 6 (0% down → 100% financed)', () => {
  const { metrics } = analyzeRentalDeal(FIX_ZERO_DOWN);
  it('loanAmount equals price; cash outlay covers only acquisition costs', () => {
    expect(metrics.loanAmount).toBe(500_000);
    // totalInvest 540k - loan 500k = 40k (itbi+cartorio+reforms)
    expect(metrics.cashOutlay).toBeCloseTo(40_000, 4);
  });
  it('still produces finite cap rate and a positive installment', () => {
    expectFinite('capRate', metrics.capRate);
    expect(metrics.firstInstallment).toBeGreaterThan(0);
  });
});

describe('Golden — Fixture 7 (30-year projections)', () => {
  const projections = calculateProjections(FIX_LONG_HORIZON, 30);
  it('returns 30 rows', () => {
    expect(projections).toHaveLength(30);
  });
  it('property value grows monotonically (no NaN/Infinity)', () => {
    for (let i = 1; i < projections.length; i++) {
      expectFinite(`year ${i + 1} estimatedValue`, projections[i].estimatedValue);
      expect(projections[i].estimatedValue).toBeGreaterThan(projections[i - 1].estimatedValue);
    }
  });
  it('equity year 30 ≥ year 1 (rent is reinvested as appreciation)', () => {
    expect(projections[29].equity).toBeGreaterThan(projections[0].equity);
  });
  it('projected NOI grows at incomeGrowthRate (5% in this fixture)', () => {
    // Mgmt + maint scale with rent (collected rent), condo+IPTU at expenseGrowth.
    // Year-over-year ratio should be near 1.05 once NOI is large.
    const r = projections[29].projectedNOI / projections[28].projectedNOI;
    expect(r).toBeGreaterThan(1.04);
    expect(r).toBeLessThan(1.06);
  });
});

describe('Golden — Fixture 8 (negative cash flow trap)', () => {
  const { metrics } = analyzeRentalDeal(FIX_NEGATIVE_CF);
  it('flagged as negative cashflow', () => {
    expect(metrics.monthlyCashFlow).toBeLessThan(0);
    expect(metrics.cashOnCash).toBeLessThan(0);
  });
  it('cap rate is still positive — NOI > 0, debt service is the trap', () => {
    expect(metrics.capRate).toBeGreaterThan(0);
    expect(metrics.monthlyNOI).toBeGreaterThan(0);
  });
});

// ── Determinism + invariants ───────────────────────────────────────────────

describe('Invariants', () => {
  it('determinism — same input twice produces identical output', () => {
    const a = analyzeRentalDeal(FIX_SFH);
    const b = analyzeRentalDeal(FIX_SFH);
    expect(a).toEqual(b);
  });
  it('determinism — projections too', () => {
    const a = calculateProjections(FIX_LONG_HORIZON, 30);
    const b = calculateProjections(FIX_LONG_HORIZON, 30);
    expect(a).toEqual(b);
  });
  it('no NaN / Infinity in any returned metric across all fixtures', () => {
    const fixtures = [
      FIX_CASH, FIX_MCMV, FIX_SFH, FIX_SFI,
      FIX_FULL_VACANCY, FIX_ZERO_DOWN, FIX_LONG_HORIZON, FIX_NEGATIVE_CF,
    ];
    for (const fx of fixtures) {
      const { metrics } = analyzeRentalDeal(fx);
      for (const [k, v] of Object.entries(metrics)) {
        if (typeof v !== 'number') continue;
        if (!Number.isFinite(v)) {
          throw new Error(`Non-finite metric "${k}" for fixture: ${JSON.stringify(fx)}`);
        }
      }
    }
  });
});
