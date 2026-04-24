import { DealInputs } from './types';
import { analyzeRentalDeal } from './rental';

export function calculateProjections(
  inputs: DealInputs,
  years: number = 10,
  annualAppreciation: number = 0.05
) {
  const baseAnalysis = analyzeRentalDeal(inputs);
  const projections = [];
  let currentPropertyValue = inputs.purchasePrice;

  const ipcaRate = inputs.revenue.rentIndex
    ? (inputs.revenue.annualRentIndexRate ?? inputs.revenue.annualIpcaRate ?? 0.04)
    : inputs.revenue.ipcaIndexed
      ? (inputs.revenue.annualIpcaRate ?? 0.05)
      : 0;

  for (let year = 1; year <= years; year++) {
    currentPropertyValue *= 1 + annualAppreciation;

    // IPCA-indexed rent grows each year
    const rentGrowthFactor = Math.pow(1 + ipcaRate, year);
    const projectedMonthlyRent = inputs.revenue.monthlyRent * rentGrowthFactor;
    const projectedNOI =
      projectedMonthlyRent * (1 - inputs.revenue.vacancyRate) -
      inputs.expenses.condo -
      inputs.expenses.iptu -
      inputs.revenue.monthlyRent * inputs.expenses.managementPercent -
      inputs.revenue.monthlyRent * inputs.expenses.maintenancePercent;

    const remainingBalance = baseAnalysis.schedule[year * 12 - 1]?.remainingBalance ?? 0;

    projections.push({
      year,
      estimatedValue: currentPropertyValue,
      equity: currentPropertyValue - remainingBalance,
      projectedNOI,
      projectedRent: projectedMonthlyRent,
    });
  }

  return projections;
}
