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
