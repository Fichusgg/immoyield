// Brazilian tax engine for real-estate analysis.
//
// Two regimes supported:
//
//   • PF (Pessoa Física / CPF) — Carnê-Leão progressive table on rental income
//     and ganho de capital on sale (15% up to R$5M, escalating brackets above).
//
//   • PJ (Pessoa Jurídica / CNPJ) — Lucro Presumido. 32% presumption on rental
//     revenue, then IRPJ 15% + CSLL 9% on the presumed base, plus PIS 0.65%
//     and COFINS 3% on gross revenue. IRPJ "adicional" of 10% applies to the
//     presumed base that exceeds R$20k/month. Sale revenue follows the same
//     formula when the property is held by a holding/locadora.
//
// All rates and brackets below should be reviewed annually — refresh after
// each Receita Federal update (typically published in May).

import type { TaxRegime } from './types';

/** Subset of TaxRegime that triggers actual tax math. 'isento' returns zero. */
export type TaxedRegime = Exclude<TaxRegime, 'isento'>;

// ── PF — Carnê-Leão (rental income) ─────────────────────────────────────────
//
// Tabela progressiva mensal do IRPF — vigente desde 05/2024.
// Fonte: Receita Federal (IN/RFB). REVIEW ANNUALLY.

export interface IRBracket {
  upTo: number;      // upper bound of monthly income (BRL); Infinity for top bracket
  rate: number;      // marginal rate (0..1)
  deduction: number; // parcela a deduzir (BRL)
}

export const CARNE_LEAO_BRACKETS_2024: IRBracket[] = [
  { upTo: 2259.20, rate: 0.00,  deduction: 0.00    },
  { upTo: 2826.65, rate: 0.075, deduction: 169.44  },
  { upTo: 3751.05, rate: 0.15,  deduction: 381.44  },
  { upTo: 4664.68, rate: 0.225, deduction: 662.77  },
  { upTo: Infinity, rate: 0.275, deduction: 896.00 },
];

/** Calcula IR mensal sobre base (aluguel líquido de deduções permitidas). */
export function carneLeaoMonthly(
  taxableMonthly: number,
  brackets: IRBracket[] = CARNE_LEAO_BRACKETS_2024,
): number {
  if (taxableMonthly <= 0) return 0;
  for (const b of brackets) {
    if (taxableMonthly <= b.upTo) {
      return Math.max(0, taxableMonthly * b.rate - b.deduction);
    }
  }
  return 0;
}

/**
 * Deduções permitidas no carnê-leão sobre aluguel de PF:
 *  - IPTU pago pelo proprietário
 *  - taxa de condomínio paga pelo proprietário
 *  - comissão/taxa de administração
 *  - despesas de cobrança
 * (juros do financiamento NÃO são dedutíveis.)
 */
export function allowableRentalDeductionsMonthly(args: {
  condo: number;
  iptu: number;
  managementFee: number;
}): number {
  return (args.condo ?? 0) + (args.iptu ?? 0) + (args.managementFee ?? 0);
}

// ── PJ — Lucro Presumido ────────────────────────────────────────────────────
//
// Vigente em 2024-2026. REVIEW ANNUALLY.

export const LUCRO_PRESUMIDO = {
  /** Presumption percentage applied to gross revenue for IRPJ + CSLL base. */
  presumptionPercent: 0.32,
  /** Federal income tax on the presumed base. */
  irpjRate: 0.15,
  /** Adicional IRPJ on presumed base exceeding the monthly threshold. */
  irpjAdicionalRate: 0.10,
  irpjAdicionalMonthlyThreshold: 20_000,
  /** Social contribution on the presumed base. */
  csllRate: 0.09,
  /** PIS on gross revenue (cumulative, regime presumido). */
  pisRate: 0.0065,
  /** COFINS on gross revenue (cumulative, regime presumido). */
  cofinsRate: 0.03,
} as const;

export interface LucroPresumidoBreakdown {
  monthlyTax: number;
  /** Effective rate as fraction of gross monthly revenue. */
  effectiveRate: number;
  components: {
    irpj: number;
    irpjAdicional: number;
    csll: number;
    pis: number;
    cofins: number;
  };
}

/**
 * Calcula a carga tributária mensal sob Lucro Presumido.
 * Aplica-se tanto a receita de aluguel quanto a receita de venda quando a
 * pessoa jurídica é uma holding/locadora cujo objeto inclui a atividade.
 */
export function lucroPresumidoMonthly(grossMonthlyRevenue: number): LucroPresumidoBreakdown {
  if (grossMonthlyRevenue <= 0) {
    return {
      monthlyTax: 0,
      effectiveRate: 0,
      components: { irpj: 0, irpjAdicional: 0, csll: 0, pis: 0, cofins: 0 },
    };
  }

  const presumedBase = grossMonthlyRevenue * LUCRO_PRESUMIDO.presumptionPercent;
  const irpj = presumedBase * LUCRO_PRESUMIDO.irpjRate;
  const irpjAdicional =
    Math.max(0, presumedBase - LUCRO_PRESUMIDO.irpjAdicionalMonthlyThreshold) *
    LUCRO_PRESUMIDO.irpjAdicionalRate;
  const csll = presumedBase * LUCRO_PRESUMIDO.csllRate;
  const pis = grossMonthlyRevenue * LUCRO_PRESUMIDO.pisRate;
  const cofins = grossMonthlyRevenue * LUCRO_PRESUMIDO.cofinsRate;
  const total = irpj + irpjAdicional + csll + pis + cofins;

  return {
    monthlyTax: total,
    effectiveRate: total / grossMonthlyRevenue,
    components: { irpj, irpjAdicional, csll, pis, cofins },
  };
}

// TODO: Lucro Real / Simples Nacional — only Lucro Presumido is modelled.

// ── Unified rental tax interface ────────────────────────────────────────────

export interface RentalTaxResult {
  taxableMonthly: number;
  monthlyIR: number;
  annualIR: number;
  /** Effective tax rate as fraction of gross monthly rent. */
  effectiveRate: number;
  /** Marginal rate of the bracket hit (PF) or effective rate (PJ). */
  marginalRate: number;
  regime: TaxedRegime;
}

export function computeRentalIR(args: {
  grossMonthlyRent: number;
  condo: number;
  iptu: number;
  managementFee: number;
  vacancyRate: number; // 0..1
  regime?: TaxedRegime;
}): RentalTaxResult {
  const regime = args.regime ?? 'PF';
  const effectiveRent = args.grossMonthlyRent * (1 - args.vacancyRate);

  if (regime === 'PJ') {
    const breakdown = lucroPresumidoMonthly(effectiveRent);
    return {
      taxableMonthly: effectiveRent,
      monthlyIR: breakdown.monthlyTax,
      annualIR: breakdown.monthlyTax * 12,
      effectiveRate:
        args.grossMonthlyRent > 0 ? breakdown.monthlyTax / args.grossMonthlyRent : 0,
      marginalRate: breakdown.effectiveRate,
      regime: 'PJ',
    };
  }

  const deductions = allowableRentalDeductionsMonthly(args);
  const taxable = Math.max(0, effectiveRent - deductions);
  const monthlyIR = carneLeaoMonthly(taxable);

  const bracket =
    CARNE_LEAO_BRACKETS_2024.find((b) => taxable <= b.upTo) ??
    CARNE_LEAO_BRACKETS_2024[CARNE_LEAO_BRACKETS_2024.length - 1];

  return {
    taxableMonthly: taxable,
    monthlyIR,
    annualIR: monthlyIR * 12,
    effectiveRate:
      args.grossMonthlyRent > 0 ? monthlyIR / args.grossMonthlyRent : 0,
    marginalRate: bracket.rate,
    regime: 'PF',
  };
}

// ── Capital gain on sale ────────────────────────────────────────────────────

/**
 * Ganho de capital na venda de imóvel residencial (PF).
 * Alíquota padrão: 15% sobre o lucro. Brackets maiores (17.5-22.5%) aplicam-se
 * a valores > R$5M, modelados aqui de forma conservadora.
 *
 * Isenção de 180 dias: se o produto da venda for reinvestido em outro imóvel
 * residencial dentro de 180 dias, o ganho é isento (Lei 11.196/2005, art. 39).
 */
export function capitalGainTax(args: {
  gain: number;
  reinvestWithin180Days?: boolean;
}): number {
  if (args.gain <= 0) return 0;
  if (args.reinvestWithin180Days) return 0;
  const g = args.gain;
  if (g <= 5_000_000) return g * 0.15;
  if (g <= 10_000_000) return 5_000_000 * 0.15 + (g - 5_000_000) * 0.175;
  if (g <= 30_000_000)
    return 5_000_000 * 0.15 + 5_000_000 * 0.175 + (g - 10_000_000) * 0.20;
  return (
    5_000_000 * 0.15 +
    5_000_000 * 0.175 +
    20_000_000 * 0.20 +
    (g - 30_000_000) * 0.225
  );
}

export interface SaleTaxResult {
  tax: number;
  /** Effective tax rate against the chosen base (gain for PF, gross sale for PJ). */
  effectiveRate: number;
  regime: TaxedRegime;
}

/**
 * Tax on a real-estate sale.
 *  • PF: ganho de capital (incidência sobre o lucro)
 *  • PJ Lucro Presumido: incidência sobre a receita bruta da venda
 */
export function computeSaleTax(args: {
  salePrice: number;
  gain: number;
  regime?: TaxedRegime;
  reinvestWithin180Days?: boolean;
}): SaleTaxResult {
  const regime = args.regime ?? 'PF';
  if (regime === 'PJ') {
    const breakdown = lucroPresumidoMonthly(args.salePrice);
    return {
      tax: breakdown.monthlyTax,
      effectiveRate: breakdown.effectiveRate,
      regime: 'PJ',
    };
  }
  const tax = capitalGainTax({
    gain: args.gain,
    reinvestWithin180Days: args.reinvestWithin180Days,
  });
  return {
    tax,
    effectiveRate: args.gain > 0 ? tax / args.gain : 0,
    regime: 'PF',
  };
}
