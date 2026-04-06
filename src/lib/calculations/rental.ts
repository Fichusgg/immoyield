import { DealInputs, effectiveMonthlyRevenue } from './types';
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

  const monthlyGrossRent = effectiveMonthlyRevenue(inputs);

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

  // ── Reforma e Venda: ganho de capital ────────────────────────────────────
  let flipMetrics: {
    salePrice: number;
    sellingCosts: number;
    capitalGainTax: number;
    netProfit: number;
    roi: number;
    holdingMonths: number;
  } | null = null;

  if (inputs.propertyType === 'reforma') {
    const arv = inputs.revenue.afterRepairValue ?? 0;
    const holdingMonths = inputs.revenue.holdingMonths ?? 6;
    const sellingCostPct = inputs.expenses.sellingCostPercent ?? 0.06;
    const sellingCosts = arv * sellingCostPct;

    // Holding costs during renovation period (financing installments)
    const holdingFinancingCosts = firstInstallment * holdingMonths;

    const acquisitionTotal = totalInitialInvestment + holdingFinancingCosts;
    const grossProfit = arv - acquisitionTotal - sellingCosts;

    // Brazilian ganho de capital: 15% on profit up to R$5M
    const capitalGainTax = grossProfit > 0 ? grossProfit * 0.15 : 0;
    const netProfit = grossProfit - capitalGainTax;
    const roi = cashOutlay > 0 ? (netProfit / cashOutlay) * 100 : 0;

    flipMetrics = {
      salePrice: arv,
      sellingCosts,
      capitalGainTax,
      netProfit,
      roi,
      holdingMonths,
    };
  }

  // ── Gross rent waterfall (for results display) ────────────────────────────
  const grossRent =
    inputs.revenue.monthlyRent > 0
      ? inputs.revenue.monthlyRent
      : (inputs.revenue.dailyRate ?? 0) * 30;

  const vacancyLoss = grossRent * inputs.revenue.vacancyRate;
  const effectiveRent = grossRent - vacancyLoss;
  const operatingExpenses = monthlyOpExpenses;

  return {
    metrics: {
      capRate: ((noi * 12) / inputs.purchasePrice) * 100,
      cashOnCash: cashOutlay > 0 ? ((monthlyCashFlow * 12) / cashOutlay) * 100 : 0,
      totalInvestment: totalInitialInvestment,
      loanAmount,
      cashOutlay,
      monthlyNOI: noi,
      monthlyCashFlow,
      grossMonthlyRent: grossRent,
      vacancyLoss,
      effectiveRent,
      operatingExpenses,
      firstInstallment,
    },
    schedule,
    flipMetrics,
  };
}
