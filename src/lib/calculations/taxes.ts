// Brazilian tax engine: Carnê-Leão (IR on rental income for PF)
// and capital gains (ganho de capital) on sale.
//
// Tabela progressiva mensal do IRPF (vigente a partir de 05/2024).
// Fonte: Receita Federal — IN/RFB.
// Brackets are applied to (monthly rental - allowed deductions) for PF
// declarando no carnê-leão. PJ has a different regime and is out of scope here.

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

export interface RentalTaxResult {
  taxableMonthly: number;
  monthlyIR: number;
  annualIR: number;
  effectiveRate: number;   // annualIR / (12 * grossRent)  (pode ser 0 se isento)
  marginalRate: number;    // alíquota da faixa de incidência
}

export function computeRentalIR(args: {
  grossMonthlyRent: number;
  condo: number;
  iptu: number;
  managementFee: number;
  vacancyRate: number; // 0..1
}): RentalTaxResult {
  const effectiveRent = args.grossMonthlyRent * (1 - args.vacancyRate);
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
  };
}

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
