export interface PropertyAnalysis {
  // Property Details
  address: string;
  purchasePrice: number;
  propertyType: 'house' | 'apartment' | 'commercial' | 'other';
  
  // Financial Details
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number; // in years
  
  // Income
  monthlyRent: number;
  otherIncome: number; // per month
  
  // Expenses (monthly)
  propertyTax: number;
  insurance: number;
  maintenance: number;
  propertyManagement: number;
  utilities: number;
  vacancyRate: number; // percentage
  
  // Additional
  appreciationRate: number; // annual percentage
  closingCosts: number;
}

export interface AnalysisResults {
  // Monthly Metrics
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;
  
  // Annual Metrics
  annualIncome: number;
  annualExpenses: number;
  annualCashFlow: number;
  
  // ROI Metrics
  cashOnCashReturn: number; // percentage
  capRate: number; // percentage
  grossRentMultiplier: number;
  
  // Loan Details
  monthlyMortgagePayment: number;
  totalMonthlyPayment: number;
  
  // Projections
  fiveYearAppreciation: number;
  tenYearAppreciation: number;
}

