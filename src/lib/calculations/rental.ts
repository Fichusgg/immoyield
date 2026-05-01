import { DealInputs, effectiveMonthlyRevenue } from './types';
import { calculateAmortization } from './financing';
import {
  computeRentalIR,
  computeSaleTax,
  type RentalTaxResult,
} from './taxes';
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

  // ── Imposto sobre receita de aluguel (PF: Carnê-Leão · PJ: Lucro Presumido)
  const regime = inputs.taxation?.regime ?? 'PF';
  const taxedRegime: 'PF' | 'PJ' | null =
    regime === 'PF' || regime === 'PJ' ? regime : null;
  const applyIR = taxedRegime !== null && inputs.propertyType !== 'flip';
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
        regime: taxedRegime,
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
    annualizedRoi: number;
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

    const capTax = taxedRegime
      ? computeSaleTax({
          salePrice: arv,
          gain: grossProfit,
          regime: taxedRegime,
          reinvestWithin180Days: inputs.taxation?.reinvestWithin180Days,
        }).tax
      : 0;
    const netProfit = grossProfit - capTax;
    const roi = cashOutlay > 0 ? (netProfit / cashOutlay) * 100 : 0;
    const annualizedRoi =
      holdingMonths > 0 && cashOutlay > 0 && netProfit > -cashOutlay
        ? (Math.pow(1 + netProfit / cashOutlay, 12 / holdingMonths) - 1) * 100
        : 0;

    flipMetrics = {
      salePrice: arv,
      sellingCosts,
      capitalGainTax: capTax,
      netProfit,
      roi,
      annualizedRoi,
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
      const irM = applyIR && taxedRegime
        ? computeRentalIR({
            grossMonthlyRent: rent,
            condo: condoExpense,
            iptu: iptuExpense,
            managementFee: rent * inputs.expenses.managementPercent,
            vacancyRate: inputs.revenue.vacancyRate,
            regime: taxedRegime,
          }).monthlyIR
        : 0;
      cashflows.push(noiM - installment - insurance - irM);
    }

    // Exit: sale proceeds - selling costs - loan payoff - capital gains tax
    const remainingBalance = schedule[holdMonths - 1]?.remainingBalance ?? 0;
    const sellingCostPct = inputs.expenses.sellingCostPercent ?? 0.06;
    const saleNet = propertyValue * (1 - sellingCostPct);
    const gain = Math.max(0, propertyValue - inputs.purchasePrice);
    const cgt = taxedRegime
      ? computeSaleTax({
          salePrice: propertyValue,
          gain,
          regime: taxedRegime,
          reinvestWithin180Days: inputs.taxation?.reinvestWithin180Days,
        }).tax
      : 0;
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

  // ── Yields (gross = pre-tax, net = post-tax) ──────────────────────────────
  // Annualised over the purchase price, expressed as % a.a. and % a.m.
  const annualGrossRent = grossRent * 12;
  const annualNetRent = annualGrossRent - (rentalTax?.annualIR ?? 0);
  const grossYieldAnnualPct =
    inputs.purchasePrice > 0 ? (annualGrossRent / inputs.purchasePrice) * 100 : 0;
  const netYieldAnnualPct =
    inputs.purchasePrice > 0 ? (annualNetRent / inputs.purchasePrice) * 100 : 0;
  const grossYieldMonthlyPct = grossYieldAnnualPct / 12;
  const netYieldMonthlyPct = netYieldAnnualPct / 12;

  // Cash-on-Cash, gross vs net of tax. The legacy `cashOnCash` already nets
  // tax via `monthlyCashFlow`; expose it explicitly under the new name and
  // also surface the pre-tax variant for the side-by-side display.
  const monthlyCashFlowPreTax = noi - monthlyDebtService;
  const cashOnCashGrossPct =
    cashOutlay > 0 ? ((monthlyCashFlowPreTax * 12) / cashOutlay) * 100 : 0;
  const cashOnCashNetPct =
    cashOutlay > 0 ? ((monthlyCashFlow * 12) / cashOutlay) * 100 : 0;

  // Rental ROI over the configured hold period (default 5 yrs).
  const rentalHoldYears = Math.max(
    1,
    Math.min(30, inputs.projections?.holdPeriodYears ?? 5),
  );
  let rentalRoiPct: number | null = null;
  let rentalRoiAnnualizedPct: number | null = null;
  if (inputs.propertyType !== 'flip' && cashOutlay > 0) {
    const cumulativeCashFlow = monthlyCashFlow * 12 * rentalHoldYears;
    const horizonMonths = Math.min(rentalHoldYears * 12, schedule.length);
    const remainingAtHorizon =
      horizonMonths > 0
        ? schedule[horizonMonths - 1]?.remainingBalance ?? 0
        : loanAmount;
    const equityBuildUp = loanAmount - remainingAtHorizon;
    const totalReturn = cumulativeCashFlow + equityBuildUp;
    rentalRoiPct = (totalReturn / cashOutlay) * 100;
    rentalRoiAnnualizedPct =
      totalReturn > -cashOutlay
        ? (Math.pow(1 + totalReturn / cashOutlay, 1 / rentalHoldYears) - 1) * 100
        : null;
  }

  const taxRegimeOut: 'PF' | 'PJ' | 'isento' | null =
    rentalTax?.regime ?? (regime === 'isento' ? 'isento' : taxedRegime);

  return {
    metrics: {
      capRate: ((noi * 12) / inputs.purchasePrice) * 100,
      cashOnCash: cashOutlay > 0 ? ((monthlyCashFlow * 12) / cashOutlay) * 100 : 0,
      cashOnCashOutOfPocket:
        outOfPocketCash > 0 ? ((monthlyCashFlow * 12) / outOfPocketCash) * 100 : 0,
      cashOnCashGrossPct,
      cashOnCashNetPct,
      totalInvestment: totalInitialInvestment,
      loanAmount,
      cashOutlay,
      fgtsAmount,
      outOfPocketCash,
      monthlyNOI: noi,
      annualNOI: noi * 12,
      monthlyCashFlow,
      monthlyCashFlowPreTax,
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
      taxRegime: taxRegimeOut,
      grossYieldAnnualPct,
      netYieldAnnualPct,
      grossYieldMonthlyPct,
      netYieldMonthlyPct,
      rentalRoiPct,
      rentalRoiAnnualizedPct,
      rentalHoldYears,
      irrAnnual,
      modality: inputs.financing.modality ?? null,
    },
    schedule,
    flipMetrics,
  };
}
