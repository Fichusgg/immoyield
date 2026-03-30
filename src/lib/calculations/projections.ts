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

  for (let year = 1; year <= years; year++) {
    currentPropertyValue *= 1 + annualAppreciation;

    projections.push({
      year,
      estimatedValue: currentPropertyValue,
      // Equity = Value - Debt (at the end of that year)
      equity: currentPropertyValue - (baseAnalysis.schedule[year * 12 - 1]?.remainingBalance || 0),
    });
  }

  return projections;
}
