/**
 * ImmoScore — aggregate 0–100 quality score for a rental deal.
 *
 * Five weighted components:
 *   yield          35 pts  — cap rate vs market benchmarks
 *   cashflow       25 pts  — monthly net cash flow
 *   payback        20 pts  — simple payback period
 *   expense ratio  15 pts  — operating cost drag
 *   completeness    5 pts  — key data fields present
 *
 * Total: 100 pts
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoringInputs {
  /** Cap rate % (annualNOI / purchasePrice × 100) */
  capRate: number;
  /** Monthly net cash flow after financing (R$) */
  monthlyCashFlow: number;
  /** Total cash deployed by investor (down payment + costs) (R$) */
  cashOutlay: number;
  /** Gross monthly rent (R$) — used for expense ratio */
  grossMonthlyRent: number;
  /** Total monthly operating expenses, excluding financing (R$) */
  operatingExpenses: number;
}

export interface ScoreBreakdown {
  total: number;
  yield: number;
  cashflow: number;
  payback: number;
  expenseRatio: number;
  completeness: number;
}

export interface ScoreLabel {
  label: string;
  color: string;       // Tailwind text colour class
  bg: string;          // Tailwind bg colour class
  border: string;      // Tailwind border colour class
  hex: string;         // Hex for inline styles / SVG
}

// ─── Component scorers ────────────────────────────────────────────────────────

/** Yield component — 0–35 pts.
 *  Based on cap rate (net NOI / price).
 *  Benchmarks aligned with FipeZap national averages 2025/2026:
 *    national gross ≈ 5.71%, IFIX yield ≈ 11.64%, SELIC ≈ 14.75% */
function scoreYield(capRate: number): number {
  if (capRate >= 9)   return 35;
  if (capRate >= 7)   return 30;
  if (capRate >= 5.5) return 24;
  if (capRate >= 4)   return 16;
  if (capRate >= 2)   return 8;
  return 0;
}

/** Cash-flow component — 0–25 pts. */
function scoreCashFlow(monthlyCashFlow: number): number {
  if (monthlyCashFlow >= 800)  return 25;
  if (monthlyCashFlow >= 400)  return 20;
  if (monthlyCashFlow >= 1)    return 15;
  if (monthlyCashFlow >= -200) return 8;
  if (monthlyCashFlow >= -500) return 3;
  return 0;
}

/** Payback component — 0–20 pts.
 *  Simple payback = cashOutlay / annualCashFlow. */
function scorePayback(cashOutlay: number, monthlyCashFlow: number): number {
  const annualCF = monthlyCashFlow * 12;
  if (annualCF <= 0) return 0;
  const years = cashOutlay / annualCF;
  if (years <= 10) return 20;
  if (years <= 13) return 17;
  if (years <= 18) return 13;
  if (years <= 25) return 7;
  if (years <= 35) return 3;
  return 0;
}

/** Expense ratio component — 0–15 pts.
 *  Ratio = operatingExpenses / grossMonthlyRent.
 *  Lower expense drag = higher score. */
function scoreExpenseRatio(operatingExpenses: number, grossMonthlyRent: number): number {
  if (grossMonthlyRent <= 0) return 7; // no data → neutral
  const ratio = operatingExpenses / grossMonthlyRent;
  if (ratio <= 0.20) return 15;
  if (ratio <= 0.30) return 12;
  if (ratio <= 0.40) return 9;
  if (ratio <= 0.50) return 5;
  if (ratio <= 0.65) return 2;
  return 0;
}

/** Data completeness component — 0–5 pts. */
function scoreCompleteness(inputs: ScoringInputs): number {
  let pts = 0;
  if (inputs.capRate > 0)            pts += 1;
  if (inputs.grossMonthlyRent > 0)   pts += 1;
  if (inputs.cashOutlay > 0)         pts += 1;
  if (inputs.operatingExpenses > 0)  pts += 1;
  if (inputs.monthlyCashFlow !== 0)  pts += 1;
  return pts;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Compute the ImmoScore (0–100) with per-component breakdown. */
export function computeImmoScore(inputs: ScoringInputs): ScoreBreakdown {
  const yieldPts      = scoreYield(inputs.capRate);
  const cashflowPts   = scoreCashFlow(inputs.monthlyCashFlow);
  const paybackPts    = scorePayback(inputs.cashOutlay, inputs.monthlyCashFlow);
  const expensePts    = scoreExpenseRatio(inputs.operatingExpenses, inputs.grossMonthlyRent);
  const completePts   = scoreCompleteness(inputs);

  return {
    total:         yieldPts + cashflowPts + paybackPts + expensePts + completePts,
    yield:         yieldPts,
    cashflow:      cashflowPts,
    payback:       paybackPts,
    expenseRatio:  expensePts,
    completeness:  completePts,
  };
}

/** Return label, colours, and hex for a given total score. */
export function getScoreLabel(total: number): ScoreLabel {
  if (total >= 85) return {
    label: 'Excelente',
    color: 'text-emerald-700',
    bg:    'bg-emerald-50',
    border:'border-emerald-200',
    hex:   '#047857',
  };
  if (total >= 70) return {
    label: 'Bom',
    color: 'text-green-700',
    bg:    'bg-green-50',
    border:'border-green-200',
    hex:   '#15803d',
  };
  if (total >= 55) return {
    label: 'Regular',
    color: 'text-yellow-700',
    bg:    'bg-yellow-50',
    border:'border-yellow-200',
    hex:   '#a16207',
  };
  if (total >= 40) return {
    label: 'Fraco',
    color: 'text-orange-700',
    bg:    'bg-orange-50',
    border:'border-orange-200',
    hex:   '#c2410c',
  };
  return {
    label: 'Ruim',
    color: 'text-red-700',
    bg:    'bg-red-50',
    border:'border-red-200',
    hex:   '#b91c1c',
  };
}

/** Compute payback years for display (returns null when not computable). */
export function computePaybackYears(cashOutlay: number, monthlyCashFlow: number): number | null {
  const annualCF = monthlyCashFlow * 12;
  if (annualCF <= 0 || cashOutlay <= 0) return null;
  return cashOutlay / annualCF;
}
