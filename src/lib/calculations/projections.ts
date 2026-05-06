import { DealInputs } from './types';
import { analyzeRentalDeal } from './rental';

export function calculateProjections(
  inputs: DealInputs,
  years: number = 10,
  annualAppreciation?: number
) {
  const baseAnalysis = analyzeRentalDeal(inputs);
  const projections = [];
  let currentPropertyValue = inputs.purchasePrice;

  const appreciationRate = annualAppreciation ?? inputs.projections?.appreciationRate ?? 0.05;

  const rentGrowthRate =
    inputs.projections?.incomeGrowthRate ??
    (inputs.revenue.rentIndex
      ? (inputs.revenue.annualRentIndexRate ?? inputs.revenue.annualIpcaRate ?? 0.04)
      : inputs.revenue.ipcaIndexed
        ? (inputs.revenue.annualIpcaRate ?? 0.05)
        : 0);

  const expenseGrowthRate = inputs.projections?.expenseGrowthRate ?? 0;
  const landlordPaysCondoIptu = inputs.revenue.rentIncludesCondoIptu ?? true;

  for (let year = 1; year <= years; year++) {
    currentPropertyValue *= 1 + appreciationRate;

    const rentGrowthFactor = Math.pow(1 + rentGrowthRate, year);
    const projectedMonthlyRent = inputs.revenue.monthlyRent * rentGrowthFactor;
    const projectedCollectedRent = projectedMonthlyRent * (1 - inputs.revenue.vacancyRate);

    const expenseGrowthFactor = Math.pow(1 + expenseGrowthRate, year);
    const condo = landlordPaysCondoIptu ? inputs.expenses.condo * expenseGrowthFactor : 0;
    const iptu = landlordPaysCondoIptu ? inputs.expenses.iptu * expenseGrowthFactor : 0;
    const mgmt = projectedCollectedRent * inputs.expenses.managementPercent;
    const maint = projectedCollectedRent * inputs.expenses.maintenancePercent;

    const projectedNOI = projectedCollectedRent - condo - iptu - mgmt - maint;

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
