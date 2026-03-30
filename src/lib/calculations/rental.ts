import { DealInputs } from './types';
import { calculateAmortization } from './financing';

export function analyzeRentalDeal(inputs: DealInputs) {
  const totalInitialInvestment =
    inputs.purchasePrice * (1 + inputs.acquisitionCosts.itbiPercent) +
    inputs.acquisitionCosts.cartorio +
    inputs.acquisitionCosts.reforms;

  const loanAmount = inputs.financing.enabled
    ? inputs.purchasePrice - inputs.financing.downPayment
    : 0;

  const cashOutlay = totalInitialInvestment - loanAmount;

  const monthlyGrossRent = inputs.revenue.monthlyRent * (1 - inputs.revenue.vacancyRate);

  const monthlyOpExpenses =
    inputs.expenses.condo +
    inputs.expenses.iptu +
    inputs.revenue.monthlyRent * inputs.expenses.managementPercent +
    inputs.revenue.monthlyRent * inputs.expenses.maintenancePercent;

  const noi = monthlyGrossRent - monthlyOpExpenses;

  const schedule =
    loanAmount > 0
      ? calculateAmortization(
          loanAmount,
          inputs.financing.interestRateYear,
          inputs.financing.termMonths,
          inputs.financing.system
        )
      : [];

  const firstInstallment = schedule.length > 0 ? schedule[0].installment : 0;
  const monthlyCashFlow = noi - firstInstallment;

  return {
    metrics: {
      capRate: ((noi * 12) / inputs.purchasePrice) * 100,
      cashOnCash: ((monthlyCashFlow * 12) / cashOutlay) * 100,
      totalInvestment: totalInitialInvestment,
      loanAmount,
      cashOutlay,
      monthlyNOI: noi,
      monthlyCashFlow,
    },
    schedule,
  };
}
