export type AmortizationSystem = 'SAC' | 'PRICE';

export interface DealInputs {
  purchasePrice: number;
  acquisitionCosts: {
    itbiPercent: number;
    cartorio: number;
    reforms: number;
  };
  financing: {
    enabled: boolean;
    downPayment: number;
    interestRateYear: number;
    termMonths: number;
    system: AmortizationSystem;
  };
  revenue: {
    monthlyRent: number;
    vacancyRate: number;
  };
  expenses: {
    condo: number;
    iptu: number;
    managementPercent: number;
    maintenancePercent: number;
  };
}

export interface AmortizationPeriod {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  remainingBalance: number;
}
