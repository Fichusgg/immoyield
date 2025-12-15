import { PropertyAnalysis, AnalysisResults } from '@/types/property';

export function calculateAnalysis(data: PropertyAnalysis): AnalysisResults {
  // Calculate monthly mortgage payment
  const monthlyInterestRate = data.interestRate / 100 / 12;
  const numberOfPayments = data.loanTerm * 12;
  
  const monthlyMortgagePayment = data.loanAmount > 0
    ? data.loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
    : 0;

  // Calculate total monthly expenses
  const vacancyLoss = (data.monthlyRent * data.vacancyRate) / 100;
  const effectiveMonthlyRent = data.monthlyRent - vacancyLoss;
  
  const monthlyExpenses =
    monthlyMortgagePayment +
    data.propertyTax +
    data.insurance +
    data.maintenance +
    data.propertyManagement +
    data.utilities;

  // Calculate monthly income
  const monthlyIncome = effectiveMonthlyRent + data.otherIncome;

  // Calculate monthly cash flow
  const monthlyCashFlow = monthlyIncome - monthlyExpenses;

  // Calculate annual metrics
  const annualIncome = monthlyIncome * 12;
  const annualExpenses = monthlyExpenses * 12;
  const annualCashFlow = monthlyCashFlow * 12;

  // Calculate ROI metrics
  const totalInvestment = data.downPayment + data.closingCosts;
  const cashOnCashReturn = totalInvestment > 0
    ? (annualCashFlow / totalInvestment) * 100
    : 0;

  // Cap Rate = NOI / Purchase Price
  // NOI = Annual Income - Annual Operating Expenses (excluding debt service)
  const annualOperatingExpenses = annualExpenses - (monthlyMortgagePayment * 12);
  const netOperatingIncome = annualIncome - annualOperatingExpenses;
  const capRate = data.purchasePrice > 0
    ? (netOperatingIncome / data.purchasePrice) * 100
    : 0;

  const grossRentMultiplier = data.monthlyRent > 0
    ? data.purchasePrice / (data.monthlyRent * 12)
    : 0;

  // Calculate appreciation projections
  const fiveYearAppreciation = data.purchasePrice *
    Math.pow(1 + data.appreciationRate / 100, 5) -
    data.purchasePrice;

  const tenYearAppreciation = data.purchasePrice *
    Math.pow(1 + data.appreciationRate / 100, 10) -
    data.purchasePrice;

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyCashFlow,
    annualIncome,
    annualExpenses,
    annualCashFlow,
    cashOnCashReturn,
    capRate,
    grossRentMultiplier,
    monthlyMortgagePayment,
    totalMonthlyPayment: monthlyExpenses,
    fiveYearAppreciation,
    tenYearAppreciation,
  };
}

