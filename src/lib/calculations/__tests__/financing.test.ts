import { describe, it, expect } from 'vitest';
import { calculateAmortization } from '../financing';

describe('Financing Logic', () => {
  it('should calculate SAC correctly (constant amortization)', () => {
    const principal = 100000;
    const months = 100;
    const res = calculateAmortization(principal, 12, months, 'SAC');
    
    expect(res[0].amortization).toBe(1000);
    expect(res[99].remainingBalance).toBeCloseTo(0, 0);
  });

  it('should calculate PRICE correctly (constant installments)', () => {
    const principal = 100000;
    const res = calculateAmortization(principal, 10, 120, 'PRICE');
    
    const firstInstallment = res[0].installment;
    const midInstallment = res[60].installment;
    expect(firstInstallment).toBeCloseTo(midInstallment, 2);
  });
});