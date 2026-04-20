import { AmortizationSystem, AmortizationPeriod, FinancingModality } from './types';

export function calculateAmortization(
  principal: number,
  annualRate: number,
  months: number,
  system: AmortizationSystem
): AmortizationPeriod[] {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const schedule: AmortizationPeriod[] = [];
  let remainingBalance = principal;

  for (let i = 1; i <= months; i++) {
    const interest = remainingBalance * monthlyRate;
    let amortization = 0;
    let installment = 0;

    if (system === 'PRICE') {
      installment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
      amortization = installment - interest;
    } else {
      // SAC: Constant Amortization
      amortization = principal / months;
      installment = amortization + interest;
    }

    remainingBalance -= amortization;

    schedule.push({
      month: i,
      installment: Math.max(0, installment),
      interest: Math.max(0, interest),
      amortization: Math.max(0, amortization),
      remainingBalance: Math.max(0, remainingBalance),
    });
  }

  return schedule;
}

export interface FinancingScenario {
  id: string;
  label: string;
  purchasePrice: number;
  downPayment: number;
  interestRateYear: number;
  termMonths: number;
  system: AmortizationSystem;
  modality?: FinancingModality;
}

export interface FinancingSimulationResult {
  scenarioId: string;
  label: string;

  loanAmount: number;
  downPaymentPercent: number;
  ltv: number;

  firstInstallment: number;
  lastInstallment: number;
  averageInstallment: number;

  totalPaid: number;
  totalInterest: number;
  totalInterestPercent: number;

  monthlyNOI: number | null;
  cashFlowMonth1: number | null;
  cashFlowAverage: number | null;
  cashFlowAnnual: number | null;
  dscr: number | null;
  cashOnCash: number | null;
  isProfitable: boolean | null;
  breakEvenRent: number;
  paybackYears: number | null;

  schedule: AmortizationPeriod[];
}

export function simulateFinancing(
  scenario: FinancingScenario,
  monthlyNOI: number | null,
  monthlyOperatingExpenses: number,
  acquisitionCosts: number,
): FinancingSimulationResult {
  const loanAmount = scenario.purchasePrice - scenario.downPayment;
  const schedule = loanAmount > 0
    ? calculateAmortization(loanAmount, scenario.interestRateYear, scenario.termMonths, scenario.system)
    : [];

  const firstInstallment = schedule[0]?.installment ?? 0;
  const lastInstallment = schedule[schedule.length - 1]?.installment ?? 0;
  const totalPaid = schedule.reduce((sum, p) => sum + p.installment, 0);
  const averageInstallment = schedule.length > 0 ? totalPaid / schedule.length : 0;
  const totalInterest = totalPaid - loanAmount;

  const cashFlowMonth1 = monthlyNOI !== null ? monthlyNOI - firstInstallment : null;
  const cashFlowAverage = monthlyNOI !== null ? monthlyNOI - averageInstallment : null;
  const cashFlowAnnual = cashFlowMonth1 !== null ? cashFlowMonth1 * 12 : null;
  const totalInvested = scenario.downPayment + acquisitionCosts;

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    loanAmount,
    downPaymentPercent: scenario.purchasePrice > 0 ? (scenario.downPayment / scenario.purchasePrice) * 100 : 0,
    ltv: scenario.purchasePrice > 0 ? (loanAmount / scenario.purchasePrice) * 100 : 0,
    firstInstallment,
    lastInstallment,
    averageInstallment,
    totalPaid,
    totalInterest,
    totalInterestPercent: loanAmount > 0 ? (totalInterest / loanAmount) * 100 : 0,
    monthlyNOI,
    cashFlowMonth1,
    cashFlowAverage,
    cashFlowAnnual,
    dscr: (monthlyNOI !== null && firstInstallment > 0) ? monthlyNOI / firstInstallment : null,
    cashOnCash: (cashFlowAnnual !== null && totalInvested > 0) ? (cashFlowAnnual / totalInvested) * 100 : null,
    isProfitable: cashFlowMonth1 !== null ? cashFlowMonth1 > 0 : null,
    breakEvenRent: firstInstallment + monthlyOperatingExpenses,
    paybackYears: (cashFlowAnnual !== null && cashFlowAnnual > 0)
      ? scenario.downPayment / cashFlowAnnual
      : null,
    schedule,
  };
}
