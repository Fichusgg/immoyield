import { DealInputs, effectiveMonthlyRevenue } from './types';
import { calculateAmortization } from './financing';
import { computeRentalIR, capitalGainTax, type RentalTaxResult } from './taxes';
import { irr, monthlyToAnnual } from './irr';

/** Sum of explicit closing costs, falling back to legacy `cartorio`. */
function closingCostsTotal(c: DealInputs['acquisitionCosts']): number {
  const split = (c.escritura ?? 0) + (c.registro ?? 0) + (c.avaliacao ?? 0);
  return split > 0 ? split : c.cartorio;
}

/** Annual rent adjustment rate, honoring rentIndex + legacy IPCA flag. */
function annualRentGrowth(revenue: DealInputs['revenue']): number {
  if (revenue.rentIndex) {
    return revenue.annualRentIndexRate ?? revenue.annualIpcaRate ?? 0.04;
  }
  return revenue.ipcaIndexed ? (revenue.annualIpcaRate ?? 0.05) : 0;
}

export function analyzeRentalDeal(inputs: DealInputs) {
  const closing = closingCostsTotal(inputs.acquisitionCosts);
  const totalInitialInvestment =
    inputs.purchasePrice * (1 + inputs.acquisitionCosts.itbiPercent) +
    closing +
    inputs.acquisitionCosts.reforms;

  const loanAmount = inputs.financing.enabled
    ? inputs.purchasePrice - inputs.financing.downPayment
    : 0;

  // FGTS utilizado na entrada: reduz o caixa próprio de fato desembolsado,
  // mas continua compondo a "entrada" (não altera o saldo financiado).
  const fgtsAmount = Math.min(
    inputs.financing.fgtsAmount ?? 0,
    inputs.financing.downPayment,
  );
  const cashOutlay = totalInitialInvestment - loanAmount;
  const outOfPocketCash = Math.max(0, cashOutlay - fgtsAmount);

  const monthlyGrossRent = effectiveMonthlyRevenue(inputs);

  // When the rent advertised already includes condomínio + IPTU, the landlord
  // pays them out of the rent → they count as operating expenses. When it
  // doesn't (tenant pays the syndic / city directly), they're outside the
  // landlord's books and must be excluded from the deal economics.
  const landlordPaysCondoIptu = inputs.revenue.rentIncludesCondoIptu ?? true;
  const condoExpense = landlordPaysCondoIptu ? inputs.expenses.condo : 0;
  const iptuExpense = landlordPaysCondoIptu ? inputs.expenses.iptu : 0;

  const managementFee = inputs.revenue.monthlyRent * inputs.expenses.managementPercent;
  const monthlyOpExpenses =
    condoExpense +
    iptuExpense +
    managementFee +
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

  // ── Seguro DFI/MIP: % a.a. sobre saldo devedor, convertido para mês 1 ────
  const insurancePctYear = inputs.financing.insurancePercentYear ?? 0;
  const insuranceMonth1 = (loanAmount * insurancePctYear) / 12;

  const firstInstallment = schedule.length > 0 ? schedule[0].installment : 0;
  const monthlyDebtService = firstInstallment + insuranceMonth1;

  // ── Imposto de Renda sobre aluguel (PF: Carnê-Leão) ───────────────────────
  const regime = inputs.taxation?.regime ?? 'PF';
  const applyIR = regime === 'PF' && inputs.propertyType !== 'flip';
  const rentalTax: RentalTaxResult | null = applyIR
    ? computeRentalIR({
        grossMonthlyRent:
          inputs.revenue.monthlyRent > 0
            ? inputs.revenue.monthlyRent
            : (inputs.revenue.dailyRate ?? 0) * 30 * (inputs.revenue.occupancyRate ?? 0.65),
        condo: condoExpense,
        iptu: iptuExpense,
        managementFee,
        vacancyRate: inputs.revenue.vacancyRate,
      })
    : null;

  const monthlyCashFlow = noi - monthlyDebtService - (rentalTax?.monthlyIR ?? 0);

  // ── Reforma e Venda: ganho de capital ────────────────────────────────────
  let flipMetrics: {
    salePrice: number;
    sellingCosts: number;
    capitalGainTax: number;
    netProfit: number;
    roi: number;
    holdingMonths: number;
  } | null = null;

  if (inputs.propertyType === 'flip') {
    const arv = inputs.revenue.afterRepairValue ?? 0;
    const holdingMonths = inputs.revenue.holdingMonths ?? 6;
    const sellingCostPct = inputs.expenses.sellingCostPercent ?? 0.06;
    const sellingCosts = arv * sellingCostPct;

    const holdingFinancingCosts = firstInstallment * holdingMonths;

    const acquisitionTotal = totalInitialInvestment + holdingFinancingCosts;
    const grossProfit = arv - acquisitionTotal - sellingCosts;

    const capTax = capitalGainTax({
      gain: grossProfit,
      reinvestWithin180Days: inputs.taxation?.reinvestWithin180Days,
    });
    const netProfit = grossProfit - capTax;
    const roi = cashOutlay > 0 ? (netProfit / cashOutlay) * 100 : 0;

    flipMetrics = {
      salePrice: arv,
      sellingCosts,
      capitalGainTax: capTax,
      netProfit,
      roi,
      holdingMonths,
    };
  }

  // ── IRR (TIR) — 5-year hold with sale at appreciated value ────────────────
  // Conservative default: 5 years, no appreciation override here — caller
  // (projections) computes richer horizons. This TIR is for the rental
  // underwrite tile, not the long-term projection.
  let irrAnnual: number | null = null;
  if (inputs.propertyType !== 'flip' && cashOutlay > 0) {
    const holdMonths = 60;
    const annualGrowth = annualRentGrowth(inputs.revenue);
    const monthlyRentGrowth =
      annualGrowth > 0 ? Math.pow(1 + annualGrowth, 1 / 12) - 1 : 0;
    const monthlyAppreciation = Math.pow(1.05, 1 / 12) - 1; // 5% a.a. default

    const cashflows: number[] = [-cashOutlay];
    let rent = inputs.revenue.monthlyRent;
    let propertyValue = inputs.purchasePrice;

    for (let m = 1; m <= holdMonths; m++) {
      rent *= 1 + monthlyRentGrowth;
      propertyValue *= 1 + monthlyAppreciation;
      const period = schedule[m - 1];
      const installment = period?.installment ?? 0;
      const insurance = period ? (period.remainingBalance * insurancePctYear) / 12 : 0;
      const noiM =
        rent * (1 - inputs.revenue.vacancyRate) -
        (condoExpense +
          iptuExpense +
          rent * inputs.expenses.managementPercent +
          rent * inputs.expenses.maintenancePercent);
      const irM = applyIR
        ? computeRentalIR({
            grossMonthlyRent: rent,
            condo: condoExpense,
            iptu: iptuExpense,
            managementFee: rent * inputs.expenses.managementPercent,
            vacancyRate: inputs.revenue.vacancyRate,
          }).monthlyIR
        : 0;
      cashflows.push(noiM - installment - insurance - irM);
    }

    // Exit: sale proceeds - selling costs - loan payoff - capital gains tax
    const remainingBalance = schedule[holdMonths - 1]?.remainingBalance ?? 0;
    const sellingCostPct = inputs.expenses.sellingCostPercent ?? 0.06;
    const saleNet = propertyValue * (1 - sellingCostPct);
    const gain = Math.max(0, propertyValue - inputs.purchasePrice);
    const cgt = capitalGainTax({
      gain,
      reinvestWithin180Days: inputs.taxation?.reinvestWithin180Days,
    });
    const exit = saleNet - remainingBalance - cgt;
    cashflows[cashflows.length - 1] += exit;

    const monthlyIRR = irr(cashflows, 0.01);
    irrAnnual = monthlyIRR !== null ? monthlyToAnnual(monthlyIRR) * 100 : null;
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
      cashOnCashOutOfPocket:
        outOfPocketCash > 0 ? ((monthlyCashFlow * 12) / outOfPocketCash) * 100 : 0,
      totalInvestment: totalInitialInvestment,
      loanAmount,
      cashOutlay,
      fgtsAmount,
      outOfPocketCash,
      monthlyNOI: noi,
      monthlyCashFlow,
      grossMonthlyRent: grossRent,
      vacancyLoss,
      effectiveRent,
      operatingExpenses,
      firstInstallment,
      insuranceMonthly: insuranceMonth1,
      monthlyIR: rentalTax?.monthlyIR ?? 0,
      annualIR: rentalTax?.annualIR ?? 0,
      effectiveIRRate: rentalTax?.effectiveRate ?? 0,
      marginalIRRate: rentalTax?.marginalRate ?? 0,
      irrAnnual,
      modality: inputs.financing.modality ?? null,
    },
    schedule,
    flipMetrics,
  };
}
