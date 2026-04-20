export type AmortizationSystem = 'SAC' | 'PRICE';

export type FinancingModality = 'SFH' | 'SFI' | 'consorcio' | 'outro';

export interface DealInputs {
  purchasePrice: number;
  propertyType?: string;
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
    ipcaIndexed?: boolean;
    annualIpcaRate?: number;
    dailyRate?: number;
    occupancyRate?: number;
    afterRepairValue?: number;
    holdingMonths?: number;
  };
  expenses: {
    condo: number;
    iptu: number;
    managementPercent: number;
    maintenancePercent: number;
    sellingCostPercent?: number;
  };
}

export interface AmortizationPeriod {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  remainingBalance: number;
}

// Effective monthly rent considering property type
export function effectiveMonthlyRevenue(inputs: DealInputs): number {
  const type = inputs.propertyType ?? 'aluguel';
  if (type === 'airbnb') {
    const daily = inputs.revenue.dailyRate ?? 0;
    const occ = inputs.revenue.occupancyRate ?? 0.65;
    return daily * 30 * occ;
  }
  // aluguel / comercial / reforma (holding rent)
  return inputs.revenue.monthlyRent * (1 - inputs.revenue.vacancyRate);
}
