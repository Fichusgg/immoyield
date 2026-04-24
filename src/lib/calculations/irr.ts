// Internal rate of return (TIR) via Newton-Raphson with a bisection fallback.
//
// Input is a cash-flow stream where cashflows[0] is the initial outlay (negative)
// and subsequent entries are periodic cash flows. The returned rate is per-period:
// if cash flows are monthly, multiply by 12 (or compound) for annual.

export function npv(rate: number, cashflows: number[]): number {
  let s = 0;
  for (let t = 0; t < cashflows.length; t++) {
    s += cashflows[t] / Math.pow(1 + rate, t);
  }
  return s;
}

function npvDerivative(rate: number, cashflows: number[]): number {
  let s = 0;
  for (let t = 1; t < cashflows.length; t++) {
    s -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
  }
  return s;
}

/**
 * Per-period IRR. Returns null when the stream has no sign change or when
 * the solver fails to converge. Guess defaults to 1% per period.
 */
export function irr(
  cashflows: number[],
  guess = 0.01,
  maxIter = 100,
  tol = 1e-7,
): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((c) => c > 0);
  const hasNegative = cashflows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return null;

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(rate, cashflows);
    if (Math.abs(f) < tol) return rate;
    const df = npvDerivative(rate, cashflows);
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    if (next <= -0.9999) {
      rate = -0.9 + (Math.random() - 0.5) * 0.2;
      continue;
    }
    if (Math.abs(next - rate) < tol) return next;
    rate = next;
  }

  // Bisection fallback on [-0.999, 10]
  let lo = -0.999;
  let hi = 10;
  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < tol) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Convert a monthly rate to effective annual rate. */
export function monthlyToAnnual(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}
