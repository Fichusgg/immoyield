'use client';

import Link from 'next/link';
import { Pencil, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { SavedDeal } from '@/lib/supabase/deals';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { KpiCard } from '@/components/property/KpiCard';
import { DonutChart } from '@/components/property/DonutChart';
import { brl, pct } from '@/components/property/format';

interface Props {
  deal: SavedDeal;
}

const fmtMoney = (v: number) => brl(v);
const fmtCompact = (v: number) => brl(v, { compact: true });

export default function AnaliseContent({ deal }: Props) {
  const m = deal.results_cache?.metrics;
  const inp = deal.inputs;

  if (!m || !inp) {
    return (
      <>
        <PageHeader
          title="Análise"
          breadcrumb={[
            { label: 'Imóveis', href: '/propriedades' },
            { label: deal.title, href: `/imoveis/${deal.id}/analise` },
            { label: 'Análise' },
          ]}
        />
        <div className="border border-dashed border-[#A8C5B2] bg-[#EBF3EE] p-6 text-center">
          <p className="text-sm font-semibold text-[#1C2B20]">
            Análise não calculada
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Use a Planilha de Compra para preencher os dados e gerar a análise.
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

  // ── Derived figures ──────────────────────────────────────────────────────
  const purchasePrice = inp.purchasePrice ?? 0;
  const loanAmount = m.loanAmount ?? 0;
  const downPayment = inp.financing?.enabled
    ? (inp.financing.downPayment ?? 0)
    : purchasePrice;
  const itbi = purchasePrice * (inp.acquisitionCosts?.itbiPercent ?? 0);
  const cartorio = inp.acquisitionCosts?.cartorio ?? 0;
  const escritura = inp.acquisitionCosts?.escritura ?? 0;
  const registro = inp.acquisitionCosts?.registro ?? 0;
  const avaliacao = inp.acquisitionCosts?.avaliacao ?? 0;
  const purchaseCostsTotal = itbi + cartorio + escritura + registro + avaliacao;
  const reformsTotal = inp.acquisitionCosts?.reforms ?? 0;
  const totalCashNeeded = m.cashOutlay ?? m.totalInvestment ?? 0;

  const grossRent = m.grossMonthlyRent ?? inp.revenue?.monthlyRent ?? 0;
  const vacancyLoss = m.vacancyLoss ?? grossRent * (inp.revenue?.vacancyRate ?? 0);
  const effectiveRent = m.effectiveRent ?? grossRent - vacancyLoss;
  const operatingExpenses = m.operatingExpenses ?? 0;
  const noi = m.monthlyNOI ?? 0;
  const debtService = m.firstInstallment ?? 0;
  const cashFlow = m.monthlyCashFlow ?? 0;

  const cashFlowPositive = cashFlow >= 0;

  // ── Donut datasets ───────────────────────────────────────────────────────
  const purchaseCostSlices = [
    { name: 'ITBI', value: itbi },
    { name: 'Escritura', value: escritura },
    { name: 'Registro', value: registro },
    { name: 'Avaliação', value: avaliacao },
    { name: 'Cartório (outros)', value: cartorio },
  ].filter((s) => s.value > 0);

  const rehabSlices = [{ name: 'Reformas / Benfeitorias', value: reformsTotal }].filter(
    (s) => s.value > 0
  );

  const datasets = [
    {
      key: 'purchase',
      label: 'Custos de Aquisição',
      slices: purchaseCostSlices.length > 0 ? purchaseCostSlices : [{ name: 'Sem custos', value: 1 }],
    },
    {
      key: 'rehab',
      label: 'Custos de Reforma',
      slices: rehabSlices.length > 0 ? rehabSlices : [{ name: 'Sem reformas', value: 1 }],
    },
  ];

  // ── Cash-flow chart (annual, 30y) ────────────────────────────────────────
  const schedule = deal.results_cache?.schedule ?? [];
  const annualNoi = noi * 12;
  const chartData = schedule
    .filter((_, i) => i % 12 === 0)
    .slice(0, 30)
    .map((p, i) => ({
      ano: `Ano ${i + 1}`,
      fluxo: annualNoi - p.installment * 12,
    }));

  const annualGrm = grossRent * 12 > 0 ? purchasePrice / (grossRent * 12) : 0;
  const dscr = debtService > 0 ? noi / debtService : 0;
  const rentToValue = purchasePrice > 0 ? ((grossRent * 12) / purchasePrice) * 100 : 0;
  const opExRatio = grossRent > 0 ? (operatingExpenses / grossRent) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Análise"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Análise' },
        ]}
        helper="Esta página mostra a composição do investimento, fluxo de caixa e retornos do imóvel."
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
              href={`/imoveis/${deal.id}/projecoes`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <TrendingUp size={12} />
              Projeções
            </Link>
          </>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Capital Necessário" value={fmtMoney(totalCashNeeded)} />
        <KpiCard
          label="Fluxo de Caixa"
          value={`${fmtMoney(cashFlow)}/mês`}
          tone={cashFlowPositive ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Rentabilidade Anual"
          value={pct(m.netYieldAnnualPct ?? 0)}
        />
        <KpiCard
          label={`ROI ${m.rentalHoldYears ?? 5}a`}
          value={
            m.rentalRoiPct != null && Number.isFinite(m.rentalRoiPct)
              ? pct(m.rentalRoiPct)
              : '—'
          }
        />
      </div>

      {/* ── Compra & Reforma ─────────────────────────────────────────────── */}
      <SectionHeading label="Compra & Reforma" />
      <FormCard className="mb-6 p-0">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_320px]">
          <div className="divide-y divide-[#F0EFEB]">
            <BreakdownRow label="Preço de Compra" value={fmtMoney(purchasePrice)} />
            {inp.financing?.enabled && (
              <BreakdownRow
                label="Valor Financiado"
                value={`− ${fmtMoney(loanAmount)}`}
                op="minus"
              />
            )}
            <BreakdownRow
              label="Entrada"
              value={fmtMoney(downPayment)}
              op="equals"
              emphasized
            />
            <BreakdownRow
              label="Custos de Aquisição"
              value={`+ ${fmtMoney(purchaseCostsTotal)}`}
              op="plus"
            />
            <BreakdownRow
              label="Custos de Reforma"
              value={`+ ${fmtMoney(reformsTotal)}`}
              op="plus"
            />
            <BreakdownRow
              label="Capital Total Necessário"
              value={fmtMoney(totalCashNeeded)}
              op="equals"
              total
            />
          </div>
          <div className="border-t border-[#F0EFEB] p-5 md:border-t-0 md:border-l">
            <DonutChart datasets={datasets} totalLabel="Total" />
          </div>
        </div>
      </FormCard>

      {/* ── Financiamento ──────────────────────────────────────────────────── */}
      {inp.financing?.enabled && (
        <>
          <SectionHeading label="Financiamento" />
          <FormCard className="mb-6">
            <SummaryRow label="Sistema de Amortização" value={inp.financing.system} />
            <SummaryRow label="Valor Financiado" value={fmtMoney(loanAmount)} />
            <SummaryRow label="Entrada" value={fmtMoney(downPayment)} />
            <SummaryRow
              label="Taxa de Juros"
              value={`${inp.financing.interestRateYear}% a.a.`}
            />
            <SummaryRow
              label="Prazo"
              value={`${inp.financing.termMonths} meses (${(inp.financing.termMonths / 12).toFixed(0)} anos)`}
            />
            <SummaryRow
              label="Parcela Inicial"
              value={`${fmtMoney(debtService)}/mês`}
              accent
            />
          </FormCard>
        </>
      )}

      {/* ── Fluxo de Caixa ─────────────────────────────────────────────────── */}
      <SectionHeading label="Fluxo de Caixa" />
      <FormCard className="mb-6 p-0">
        <div className="grid grid-cols-3 border-b border-[#F0EFEB] bg-[#F0EFEB] px-5 py-2.5">
          <span className="text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
            Item
          </span>
          <span className="text-right text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
            Mensal
          </span>
          <span className="text-right text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
            Anual
          </span>
        </div>
        <CashRow label="Aluguel Bruto" monthly={grossRent} />
        <CashRow label="Vacância" monthly={-vacancyLoss} subtract />
        <CashRow label="Aluguel Efetivo" monthly={effectiveRent} emphasized />
        <CashRow label="Despesas Operacionais" monthly={-operatingExpenses} subtract />
        <CashRow label="NOI (Resultado Operacional)" monthly={noi} emphasized />
        {inp.financing?.enabled && (
          <CashRow label="Serviço da Dívida" monthly={-debtService} subtract />
        )}
        <CashRow
          label="Fluxo de Caixa"
          monthly={cashFlow}
          total
          tone={cashFlowPositive ? 'positive' : 'negative'}
        />
      </FormCard>

      {/* ── Rentabilidade ─────────────────────────────────────────────────── */}
      <SectionHeading label="Rentabilidade" />
      <FormCard className="mb-6 p-0">
        {(() => {
          const regime = m.taxRegime ?? inp.taxation?.regime ?? 'PF';
          const regimeLabel =
            regime === 'PJ'
              ? 'CNPJ · Lucro Presumido'
              : regime === 'isento'
                ? 'Isento'
                : 'CPF · Carnê-Leão';
          const taxedRegime = regime !== 'isento';
          const annualIR = m.annualIR ?? 0;
          const monthlyIR = m.monthlyIR ?? 0;
          const grossAnnual = m.grossYieldAnnualPct ?? 0;
          const netAnnual = m.netYieldAnnualPct ?? 0;
          const grossMonthly = m.grossYieldMonthlyPct ?? 0;
          const netMonthly = m.netYieldMonthlyPct ?? 0;
          const taxImpactAnnualPct = grossAnnual - netAnnual;
          return (
            <>
              {/* Regime banner */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#F0EFEB] bg-[#F8F7F4] px-5 py-3">
                <span className="font-mono text-[10px] font-semibold tracking-[0.07em] text-[#6B7480] uppercase">
                  Regime tributário
                </span>
                <span className="font-mono text-xs font-semibold text-[#1C2B20]">
                  {regimeLabel}
                </span>
                {taxedRegime && (m.effectiveIRRate ?? 0) > 0 && (
                  <span className="ml-auto font-mono text-[11px] text-[#6B7280]">
                    Alíquota efetiva sobre receita ·{' '}
                    <span className="font-semibold text-[#1C2B20]">
                      {pct((m.effectiveIRRate ?? 0) * 100)}
                    </span>
                  </span>
                )}
              </div>
              {/* Gross vs Net rows */}
              <div className="grid grid-cols-3 border-b border-[#F0EFEB] bg-[#F0EFEB] px-5 py-2.5">
                <span className="text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
                  Métrica
                </span>
                <span className="text-right text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
                  Sem imposto
                </span>
                <span className="text-right text-[11px] font-semibold tracking-wider text-[#6B7480] uppercase">
                  Com imposto
                </span>
              </div>
              <YieldRow
                label="Rentabilidade Anual"
                gross={pct(grossAnnual)}
                net={pct(netAnnual)}
                emphasized
              />
              <YieldRow
                label="Rentabilidade Mensal"
                gross={pct(grossMonthly)}
                net={pct(netMonthly)}
              />
              <div className="grid grid-cols-3 items-center border-t border-[#F0EFEB] bg-[#FAFAF8] px-5 py-3">
                <span className="text-sm text-[#6B7280]">Fluxo de Caixa</span>
                <span className="text-right font-mono text-sm font-semibold text-[#6B7480] tabular-nums">
                  {fmtMoney((cashFlow + monthlyIR) * 12)}/ano
                </span>
                <span
                  className={`text-right font-mono text-sm font-bold tabular-nums ${
                    cashFlowPositive ? 'text-[#4A7C59]' : 'text-[#DC2626]'
                  }`}
                >
                  {fmtMoney(cashFlow * 12)}/ano
                </span>
              </div>

              {/* Tax effect callout */}
              {taxedRegime && annualIR > 0 && (
                <div className="border-t border-[#F0EFEB] bg-[#FFFBEB] px-5 py-4">
                  <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#B45309] uppercase">
                    Efeito do imposto na rentabilidade
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[#6B7280]">Imposto pago no ano</p>
                      <p className="font-mono text-base font-bold text-[#B45309] tabular-nums">
                        − {fmtMoney(annualIR)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#6B7280]">
                        Redução em pontos percentuais (a.a.)
                      </p>
                      <p className="font-mono text-base font-bold text-[#B45309] tabular-nums">
                        − {pct(taxImpactAnnualPct)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </FormCard>

      {/* ── 30-year cashflow chart ───────────────────────────────────────── */}
      {chartData.length > 0 && (
        <>
          <SectionHeading label="Fluxo Anual — 30 Anos" />
          <FormCard className="mb-6">
            <div className="h-56 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fluxoAnaliseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                  <XAxis
                    dataKey="ano"
                    tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E0DA' }}
                    interval={4}
                  />
                  <YAxis
                    tickFormatter={fmtCompact}
                    tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div
                          className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2"
                          style={{ boxShadow: '0 10px 30px rgba(28,43,32,0.08)' }}
                        >
                          <p className="font-mono text-[10px] text-[#6B7480]">{label}</p>
                          <p className="font-mono text-xs font-semibold text-[#4A7C59]">
                            {fmtMoney(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="#E2E0DA" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="fluxo"
                    stroke="#4A7C59"
                    strokeWidth={1.5}
                    fill="url(#fluxoAnaliseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FormCard>
        </>
      )}

      {/* ── Retornos de Investimento ────────────────────────────────────── */}
      <SectionHeading label="Retornos de Investimento" />
      <FormCard className="mb-6">
        <SummaryRow
          label={`ROI ${m.rentalHoldYears ?? 5} anos`}
          value={
            m.rentalRoiPct != null && Number.isFinite(m.rentalRoiPct)
              ? pct(m.rentalRoiPct)
              : '—'
          }
          accent
        />
        {m.rentalRoiAnnualizedPct != null && (
          <SummaryRow
            label="ROI Anualizado"
            value={pct(m.rentalRoiAnnualizedPct)}
            accent
          />
        )}
        {m.irrAnnual != null && (
          <SummaryRow label="TIR (IRR Anual · 5a com saída)" value={pct(m.irrAnnual)} accent />
        )}
        <SummaryRow label="GRM (Multiplicador de Aluguel Bruto)" value={annualGrm.toFixed(2)} />
        {inp.financing?.enabled && (
          <SummaryRow label="DSCR (Cobertura da Dívida)" value={dscr.toFixed(2)} />
        )}
        <SummaryRow label="Aluguel/Valor" value={pct(rentToValue)} />
        <SummaryRow label="Despesas/Receita" value={pct(opExRatio)} />
      </FormCard>
    </>
  );
}

// ── Yield row primitive — gross vs net side-by-side ──────────────────────────
function YieldRow({
  label,
  gross,
  net,
  emphasized,
}: {
  label: string;
  gross: string;
  net: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 items-center px-5 py-3 ${
        emphasized ? 'bg-[#EBF3EE]' : 'bg-[#FAFAF8]'
      }`}
    >
      <span
        className={`text-sm ${emphasized ? 'font-semibold text-[#1C2B20]' : 'text-[#6B7280]'}`}
      >
        {label}
      </span>
      <span className="text-right font-mono text-sm font-semibold text-[#6B7480] tabular-nums">
        {gross}
      </span>
      <span
        className={`text-right font-mono text-sm font-bold tabular-nums ${
          emphasized ? 'text-[#4A7C59]' : 'text-[#1C2B20]'
        }`}
      >
        {net}
      </span>
    </div>
  );
}

// ── Local row primitives ────────────────────────────────────────────────────

function BreakdownRow({
  label,
  value,
  op,
  emphasized,
  total,
}: {
  label: string;
  value: string;
  op?: 'plus' | 'minus' | 'equals';
  emphasized?: boolean;
  total?: boolean;
}) {
  const sym = op === 'plus' ? '+' : op === 'minus' ? '−' : op === 'equals' ? '=' : '';
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 ${
        total ? 'bg-[#EBF3EE]' : emphasized ? 'bg-[#F0EFEB]/60' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-3 text-center font-mono text-xs ${
            total ? 'font-bold text-[#4A7C59]' : 'text-[#6B7480]'
          }`}
        >
          {sym}
        </span>
        <span
          className={`text-sm ${
            total ? 'font-bold text-[#4A7C59]' : emphasized ? 'font-semibold text-[#1C2B20]' : 'text-[#6B7280]'
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${
          total
            ? 'font-bold text-[#4A7C59]'
            : emphasized
              ? 'font-semibold text-[#4A7C59]'
              : 'font-semibold text-[#1C2B20]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span
        className={`font-mono text-sm tabular-nums ${
          accent ? 'font-bold text-[#4A7C59]' : 'font-semibold text-[#1C2B20]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CashRow({
  label,
  monthly,
  emphasized,
  total,
  subtract,
  tone,
}: {
  label: string;
  monthly: number;
  emphasized?: boolean;
  total?: boolean;
  subtract?: boolean;
  tone?: 'positive' | 'negative';
}) {
  const annual = monthly * 12;
  const valueColor =
    tone === 'positive'
      ? 'text-[#4A7C59]'
      : tone === 'negative'
        ? 'text-[#DC2626]'
        : total
          ? 'text-[#1C2B20]'
          : 'text-[#1C2B20]';
  const fmt = (v: number) => (subtract ? `− ${brl(Math.abs(v))}` : brl(v));

  return (
    <div
      className={`grid grid-cols-3 items-center px-5 py-3 ${
        total ? 'bg-[#EBF3EE]' : emphasized ? 'bg-[#F0EFEB]/60' : ''
      }`}
    >
      <span
        className={`text-sm ${
          total ? 'font-bold text-[#1C2B20]' : emphasized ? 'font-semibold text-[#1C2B20]' : 'text-[#6B7280]'
        }`}
      >
        {label}
      </span>
      <span className={`text-right font-mono text-sm tabular-nums ${valueColor} ${total || emphasized ? 'font-bold' : 'font-semibold'}`}>
        {fmt(monthly)}
      </span>
      <span
        className={`text-right font-mono text-sm tabular-nums ${valueColor} ${
          total || emphasized ? 'font-bold' : 'font-medium'
        } opacity-80`}
      >
        {fmt(annual)}
      </span>
    </div>
  );
}
