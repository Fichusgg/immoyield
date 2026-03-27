import { AmortizationSystem, AmortizationPeriod } from './types';

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