import { describe, it, expect } from 'vitest';
import { irr, npv, monthlyToAnnual } from '../irr';

describe('IRR solver', () => {
  it('matches a known simple stream', () => {
    // -100, 60, 60 → IRR ≈ 0.1307
    const r = irr([-100, 60, 60]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1307, 3);
    expect(npv(r!, [-100, 60, 60])).toBeCloseTo(0, 5);
  });

  it('returns null when there is no sign change', () => {
    expect(irr([-100, -20, -10])).toBeNull();
    expect(irr([10, 20, 30])).toBeNull();
  });

  it('converts monthly to annual correctly', () => {
    expect(monthlyToAnnual(0.01)).toBeCloseTo(0.1268, 4);
  });

  it('handles a realistic 5-year rental stream', () => {
    // R$140k outlay, R$2k/mo cashflow for 60 months, exit R$180k net at m60
    const cfs = [-140_000, ...Array(59).fill(2000), 2000 + 180_000];
    const r = irr(cfs);
    expect(r).not.toBeNull();
    expect(monthlyToAnnual(r!)).toBeGreaterThan(0.05);
  });
});
