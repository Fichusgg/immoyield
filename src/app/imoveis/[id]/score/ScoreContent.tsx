'use client';

import Link from 'next/link';
import {
  Pencil,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { SavedDeal } from '@/lib/supabase/deals';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { brl } from '@/components/property/format';
import {
  computeImmoScore,
  getScoreLabel,
  computePaybackYears,
} from '@/lib/scoring';
import { generateInsights, generateRisks } from '@/lib/insights';

interface Props {
  deal: SavedDeal;
}

const COMPONENTS: Array<{
  key: 'yield' | 'cashflow' | 'payback' | 'expenseRatio' | 'completeness';
  label: string;
  max: number;
  hint: string;
}> = [
  { key: 'yield', label: 'Yield', max: 35, hint: 'Cap rate vs. mercado nacional (média ~5,7%).' },
  { key: 'cashflow', label: 'Fluxo', max: 25, hint: 'Caixa mensal líquido — quanto sobra após financiamento e despesas.' },
  { key: 'payback', label: 'Payback', max: 20, hint: 'Anos para recuperar o capital aplicado, considerando o fluxo atual.' },
  { key: 'expenseRatio', label: 'Eficiência', max: 15, hint: 'Despesas operacionais sobre o aluguel bruto. Quanto menor, melhor.' },
  { key: 'completeness', label: 'Dados', max: 5, hint: 'Quantos campos-chave estão preenchidos.' },
];

export default function ScoreContent({ deal }: Props) {
  const m = deal.results_cache?.metrics;
  const inp = deal.inputs;

  if (!m || !inp) {
    return (
      <>
        <PageHeader
          title="ImmoScore"
          breadcrumb={[
            { label: 'Imóveis', href: '/propriedades' },
            { label: deal.title, href: `/imoveis/${deal.id}/analise` },
            { label: 'ImmoScore' },
          ]}
        />
        <div className="border border-dashed border-[#A8C5B2] bg-[#EBF3EE] p-6 text-center">
          <p className="text-sm font-semibold text-[#1C2B20]">
            Sem dados para pontuar
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Preencha a Planilha de Compra para gerar a pontuação do deal.
          </p>
          <Link
            href={`/imoveis/${deal.id}/planilha`}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Abrir Planilha de Compra →
          </Link>
        </div>
      </>
    );
  }

  // ── Score & component breakdown ─────────────────────────────────────────────
  const grossMonthlyRent = m.grossMonthlyRent ?? inp.revenue?.monthlyRent ?? 0;
  const operatingExpenses = m.operatingExpenses ?? 0;

  const scoreInputs = {
    capRate: m.capRate,
    monthlyCashFlow: m.monthlyCashFlow,
    cashOutlay: m.cashOutlay,
    grossMonthlyRent,
    operatingExpenses,
  };

  const score = computeImmoScore(scoreInputs);
  const label = getScoreLabel(score.total);
  const paybackYears = computePaybackYears(m.cashOutlay, m.monthlyCashFlow);

  // ── Insights — pass real per-line expenses straight from the worksheet ──────
  const condoMonthly = inp.expenses?.condo ?? 0;
  const iptuMonthly = (inp.expenses?.iptu ?? 0) / 12;

  const insightInputs = {
    monthlyCashFlow: m.monthlyCashFlow,
    capRate: m.capRate,
    cashOnCash: m.cashOnCash,
    cashOutlay: m.cashOutlay,
    grossMonthlyRent,
    condoMonthly,
    iptuMonthly,
    operatingExpenses,
    loanAmount: m.loanAmount ?? 0,
    purchasePrice: inp.purchasePrice ?? 0,
    vacancyRate: inp.revenue?.vacancyRate ?? 0,
  };

  const insights = generateInsights(insightInputs);
  const risks = generateRisks(insightInputs);

  return (
    <>
      <PageHeader
        title="ImmoScore"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'ImmoScore' },
        ]}
        helper="Avaliação 0–100 do deal, combinando rentabilidade, fluxo de caixa, payback e eficiência operacional. Salve a Planilha de Compra para atualizar a pontuação."
        actions={
          <>
            <Link
              href={`/imoveis/${deal.id}/planilha`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <Pencil size={12} />
              Editar Planilha
            </Link>
            <Link
              href={`/imoveis/${deal.id}/analise`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <BarChart2 size={12} />
              Análise
            </Link>
            <Link
              href={`/imoveis/${deal.id}/projecoes`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <TrendingUp size={12} />
              Projeções
            </Link>
          </>
        }
      />

      {/* ── Hero score card ──────────────────────────────────────────────── */}
      <div className={`mb-6 border p-6 ${label.bg} ${label.border}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Pontuação geral
            </p>
            <p className={`mt-1 font-mono text-5xl font-black tabular-nums ${label.color}`}>
              {score.total}
              <span className="ml-2 text-base font-semibold opacity-60">/ 100</span>
            </p>
            <p className={`mt-1 text-sm font-bold ${label.color}`}>{label.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
            <span className="text-[11px] text-[#6B7280]">Cap rate</span>
            <span className={`font-mono text-sm font-bold ${label.color}`}>
              {m.capRate.toFixed(2)}%
            </span>
            <span className="text-[11px] text-[#6B7280]">Cash-on-Cash</span>
            <span className={`font-mono text-sm font-bold ${label.color}`}>
              {m.cashOnCash.toFixed(2)}%
            </span>
            <span className="text-[11px] text-[#6B7280]">Fluxo mensal</span>
            <span
              className={`font-mono text-sm font-bold ${
                m.monthlyCashFlow >= 0 ? 'text-[#4A7C59]' : 'text-[#DC2626]'
              }`}
            >
              {brl(m.monthlyCashFlow)}
            </span>
            <span className="text-[11px] text-[#6B7280]">Payback</span>
            <span className={`font-mono text-sm font-bold ${label.color}`}>
              {paybackYears != null ? `${paybackYears.toFixed(1)} anos` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Component breakdown ──────────────────────────────────────────── */}
      <SectionHeading label="Como a nota foi composta" />
      <FormCard className="mb-6 p-0">
        <div className="divide-y divide-[#F0EFEB]">
          {COMPONENTS.map((c) => {
            const pts = score[c.key];
            const pct = (pts / c.max) * 100;
            return (
              <div key={c.key} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C2B20]">{c.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{c.hint}</p>
                  </div>
                  <p className="font-mono text-sm font-bold tabular-nums text-[#1C2B20]">
                    <span className={label.color}>{pts}</span>
                    <span className="text-[#9CA3AF]"> / {c.max}</span>
                  </p>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden bg-[#F0EFEB]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.max(2, pct)}%`,
                      backgroundColor: label.hex,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </FormCard>

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <SectionHeading label="Por que é interessante" />
      <FormCard className="mb-6">
        {insights.length > 0 ? (
          <ul className="divide-y divide-[#F0EFEB]">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <CheckCircle2
                  size={14}
                  className="mt-0.5 shrink-0 text-[#4A7C59]"
                />
                <span className="text-sm leading-snug text-[#1C2B20]">
                  {ins.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-3 px-5 py-4">
            <Info size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
            <p className="text-sm text-[#6B7280]">
              Nenhum destaque positivo claro neste cenário. Ajuste premissas na
              Planilha de Compra para explorar alternativas.
            </p>
          </div>
        )}
      </FormCard>

      {/* ── Risks ────────────────────────────────────────────────────────── */}
      <SectionHeading label="O que poderia ser melhor" />
      <FormCard className="mb-6">
        {risks.length > 0 ? (
          <ul className="divide-y divide-[#F0EFEB]">
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0 text-[#F59E0B]"
                />
                <span className="text-sm leading-snug text-[#1C2B20]">
                  {risk.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-3 px-5 py-4">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4A7C59]" />
            <p className="text-sm text-[#6B7280]">
              Nenhum risco material detectado pelas regras automáticas — ainda
              assim, valide vacância, condomínio e cenário macro antes de fechar.
            </p>
          </div>
        )}
      </FormCard>

      <p className="pt-1 pb-4 text-center font-mono text-[10px] text-[#9CA3AF]">
        Pontuação calculada com base nos dados salvos da Planilha de Compra. Ajuste
        os parâmetros e salve novamente para reavaliar.
      </p>
    </>
  );
}
