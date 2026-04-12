/**
 * insights.ts — rule-based generation of deal insights and risks.
 *
 * No AI required for v1 — deterministic rules derived from Brazilian real-estate
 * market benchmarks (FipeZap, BCB, SECOVI-SP 2025/2026).
 *
 * Each function returns an array of Portuguese-language strings ready to display.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsightInputs {
  /** Monthly net cash flow after all costs + financing (R$) */
  monthlyCashFlow: number;
  /** Cap rate % (annualNOI / purchasePrice × 100) */
  capRate: number;
  /** Cash-on-cash return % */
  cashOnCash: number;
  /** Total capital deployed by investor (R$) */
  cashOutlay: number;
  /** Gross monthly rent (R$) */
  grossMonthlyRent: number;
  /** Monthly condo fee (R$) */
  condoMonthly: number;
  /** Monthly IPTU portion (annualIptu / 12) (R$) */
  iptuMonthly: number;
  /** Total monthly operating expenses, excl. financing (R$) */
  operatingExpenses: number;
  /** Loan amount (R$) — 0 if cash purchase */
  loanAmount: number;
  /** Property purchase price (R$) */
  purchasePrice: number;
  /** Vacancy rate 0–1 */
  vacancyRate: number;
}

export interface Insight {
  text: string;
  /** Optional numeric anchor, e.g. the value that triggered the rule */
  value?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const R = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const Pct = (v: number, decimals = 1) => `${v.toFixed(decimals)}%`;

// ─── Positive insights — "Por que é interessante" ─────────────────────────────

export function generateInsights(inp: InsightInputs): Insight[] {
  const insights: Insight[] = [];

  // 1. Positive cash flow
  if (inp.monthlyCashFlow > 0) {
    insights.push({
      text: `Gera fluxo de caixa positivo de ${R(inp.monthlyCashFlow)}/mês desde o início — o imóvel se paga sem aportes adicionais.`,
      value: R(inp.monthlyCashFlow),
    });
  }

  // 2. High cap rate vs national average (5.71%)
  if (inp.capRate >= 7) {
    insights.push({
      text: `Cap rate de ${Pct(inp.capRate)} está acima da média nacional (5,7%) — retorno operacional sólido.`,
      value: Pct(inp.capRate),
    });
  } else if (inp.capRate >= 5.5) {
    insights.push({
      text: `Cap rate de ${Pct(inp.capRate)} está alinhado com as melhores praças do país — retorno competitivo.`,
      value: Pct(inp.capRate),
    });
  }

  // 3. Good cash-on-cash (beats SELIC 14.75% is rare; CDI ≈ 13.65%)
  if (inp.cashOnCash >= 14) {
    insights.push({
      text: `Retorno sobre capital próprio (CoC) de ${Pct(inp.cashOnCash)} supera o CDI — raro para imóveis financiados.`,
      value: Pct(inp.cashOnCash),
    });
  } else if (inp.cashOnCash >= 8) {
    insights.push({
      text: `Cash-on-cash de ${Pct(inp.cashOnCash)} é considerado bom para imóveis de renda no Brasil.`,
      value: Pct(inp.cashOnCash),
    });
  }

  // 4. Low condo-to-rent ratio (< 15% is healthy)
  const condoRentRatio =
    inp.grossMonthlyRent > 0 ? (inp.condoMonthly / inp.grossMonthlyRent) * 100 : 0;
  if (condoRentRatio > 0 && condoRentRatio < 15) {
    insights.push({
      text: `Condomínio representa apenas ${Pct(condoRentRatio)} do aluguel — baixa pressão sobre a rentabilidade.`,
      value: Pct(condoRentRatio),
    });
  }

  // 5. Cash purchase (no financing risk)
  if (inp.loanAmount === 0 && inp.cashOutlay > 0) {
    insights.push({
      text: 'Compra à vista elimina o risco de taxa de juros e reduz custos totais com o imóvel.',
    });
  }

  // 6. Low vacancy rate (< 5%)
  if (inp.vacancyRate < 0.05 && inp.vacancyRate >= 0) {
    insights.push({
      text: `Vacância projetada de ${Pct(inp.vacancyRate * 100)} — premissa conservadora; mercado nacional médio é 8–10%.`,
      value: Pct(inp.vacancyRate * 100),
    });
  }

  // 7. Low expense ratio (< 30%)
  const expenseRatio =
    inp.grossMonthlyRent > 0
      ? (inp.operatingExpenses / inp.grossMonthlyRent) * 100
      : 0;
  if (expenseRatio > 0 && expenseRatio < 30) {
    insights.push({
      text: `Custo operacional de ${Pct(expenseRatio)} do aluguel bruto — eficiência acima da média do mercado.`,
      value: Pct(expenseRatio),
    });
  }

  return insights.slice(0, 5); // cap at 5 insights
}

// ─── Risks ────────────────────────────────────────────────────────────────────

export function generateRisks(inp: InsightInputs): Insight[] {
  const risks: Insight[] = [];

  // 1. Negative cash flow
  if (inp.monthlyCashFlow < 0) {
    risks.push({
      text: `Fluxo de caixa negativo de ${R(Math.abs(inp.monthlyCashFlow))}/mês — exige aporte mensal do investidor enquanto financiado.`,
      value: R(Math.abs(inp.monthlyCashFlow)),
    });
  }

  // 2. High condo-to-rent ratio (> 30%)
  const condoRentRatio =
    inp.grossMonthlyRent > 0 ? (inp.condoMonthly / inp.grossMonthlyRent) * 100 : 0;
  if (condoRentRatio >= 30) {
    risks.push({
      text: `Condomínio corresponde a ${Pct(condoRentRatio)} do aluguel bruto — risco de comprimir ou eliminar o lucro.`,
      value: Pct(condoRentRatio),
    });
  } else if (condoRentRatio >= 20) {
    risks.push({
      text: `Condomínio de ${Pct(condoRentRatio)} do aluguel é elevado — monitore reajustes anuais da assembleia.`,
      value: Pct(condoRentRatio),
    });
  }

  // 3. Low cap rate (< 4%)
  if (inp.capRate > 0 && inp.capRate < 4) {
    risks.push({
      text: `Cap rate de ${Pct(inp.capRate)} fica abaixo do Tesouro Direto IPCA+ (~7%) — o custo de oportunidade é desfavorável.`,
      value: Pct(inp.capRate),
    });
  }

  // 4. High expense ratio (> 50%)
  const expenseRatio =
    inp.grossMonthlyRent > 0
      ? (inp.operatingExpenses / inp.grossMonthlyRent) * 100
      : 0;
  if (expenseRatio >= 50) {
    risks.push({
      text: `Despesas operacionais consomem ${Pct(expenseRatio)} do aluguel bruto — qualquer vacância estendida gera prejuízo imediato.`,
      value: Pct(expenseRatio),
    });
  }

  // 5. Long payback (> 25 years)
  const annualCF = inp.monthlyCashFlow * 12;
  if (annualCF > 0 && inp.cashOutlay > 0) {
    const paybackYears = inp.cashOutlay / annualCF;
    if (paybackYears > 25) {
      risks.push({
        text: `Payback simples de ${paybackYears.toFixed(0)} anos é muito longo — mudanças no mercado podem tornar o deal inviável antes do retorno.`,
        value: `${paybackYears.toFixed(0)} anos`,
      });
    } else if (paybackYears > 18) {
      risks.push({
        text: `Payback de ${paybackYears.toFixed(0)} anos requer horizonte de investimento longo — verifique se alinha com sua estratégia.`,
        value: `${paybackYears.toFixed(0)} anos`,
      });
    }
  }

  // 6. High vacancy assumption (> 15%)
  if (inp.vacancyRate > 0.15) {
    risks.push({
      text: `Vacância projetada de ${Pct(inp.vacancyRate * 100)} é muito alta — reduziria sensivelmente a rentabilidade líquida.`,
      value: Pct(inp.vacancyRate * 100),
    });
  }

  // 7. High leverage (LTV > 80%)
  if (inp.loanAmount > 0 && inp.purchasePrice > 0) {
    const ltv = (inp.loanAmount / inp.purchasePrice) * 100;
    if (ltv > 80) {
      risks.push({
        text: `LTV de ${Pct(ltv)} — alavancagem alta amplifica perdas em cenário de queda de preços ou alta de juros.`,
        value: Pct(ltv),
      });
    }
  }

  return risks.slice(0, 5); // cap at 5 risks
}
