'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, Calendar, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

interface PublicReportViewProps {
  dealName: string;
  propertyType?: string;
  updatedAt: string;
  viewCount: number;
  result: AnalysisResult;
  inputs: DealInput;
  benchmarks?: { cdi: number; fii: number; updatedAt: string | null };
  slug?: string;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}mi`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ── Design-system chart tooltip ───────────────────────────────────────────────

const DSTooltip = ({
  active,
  payload,
  label,
  prefix = '',
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
  prefix?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2"
      style={{ boxShadow: '0 10px 30px rgba(28,43,32,0.08)' }}
    >
      <p className="mb-1 font-mono text-[10px] text-[#9CA3AF]">
        {prefix}
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── KPI card ─────────────────────────────────────────────────────────────────

const KpiCard = ({
  label,
  value,
  sub,
  positive,
  negative,
  benchmarkPct,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  benchmarkPct?: number;
}) => (
  <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-4">
    <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
      {label}
    </p>
    <p
      className={`font-mono text-xl font-bold ${
        positive ? 'text-[#4A7C59]' : negative ? 'text-[#DC2626]' : 'text-[#1C2B20]'
      }`}
    >
      {value}
    </p>
    {benchmarkPct != null && (
      <div className="mt-2 h-0.5 w-full bg-[#E2E0DA]">
        <div
          className="h-0.5 bg-[#4A7C59]"
          style={{ width: `${Math.min(100, Math.max(0, benchmarkPct))}%` }}
        />
      </div>
    )}
    {sub && <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">{sub}</p>}
  </div>
);

// ── Section header ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
    {children}
  </p>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicReportView({
  dealName,
  updatedAt,
  viewCount,
  result,
  inputs,
  benchmarks,
}: PublicReportViewProps) {
  const { metrics, schedule, projections } = result;
  const cashFlowPositive = metrics.monthlyCashFlow >= 0;

  const cashflowMonthlyData = schedule.slice(0, 24).map((p) => ({
    mes: `M${p.month}`,
    fluxo: +(metrics.monthlyNOI - p.installment).toFixed(0),
  }));

  const projectionData = projections.map((p) => ({
    ano: `Ano ${p.year}`,
    valor: +p.estimatedValue.toFixed(0),
    equity: +p.equity.toFixed(0),
  }));

  const amortData = schedule
    .filter((_, i) => (i + 1) % 12 === 0)
    .map((p) => ({
      ano: `Ano ${Math.round(p.month / 12)}`,
      saldo: +p.remainingBalance.toFixed(0),
      juros: +(p.interest * 12).toFixed(0),
    }));

  const CDI_RATE = benchmarks?.cdi ?? 13.65;
  const FII_RATE = benchmarks?.fii ?? 8.0;
  const benchmarkData = [
    { name: 'Cap Rate', value: +metrics.capRate.toFixed(2), fill: '#4A7C59' },
    {
      name: 'Cash-on-Cash',
      value: +metrics.cashOnCash.toFixed(2),
      fill: metrics.cashOnCash >= 0 ? '#3D6B4F' : '#DC2626',
    },
    { name: 'CDI (ref.)', value: CDI_RATE, fill: '#9CA3AF' },
    { name: 'FII (ref.)', value: FII_RATE, fill: '#D0CEC8' },
  ];

  const formattedDate = new Date(updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const axisProps = {
    tick: { fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>

          <div className="hidden items-center gap-4 font-mono text-xs text-[#9CA3AF] sm:flex">
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {viewCount} {viewCount === 1 ? 'visualização' : 'visualizações'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formattedDate}
            </span>
          </div>

          <Link
            href="/auth"
            className="bg-[#4A7C59] px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Analisar meu imóvel →
          </Link>
        </div>
      </header>

      {/* ── Report body ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[64rem] space-y-10 px-4 py-10 pb-36 md:px-6">
        {/* Title block */}
        <div className="border-b border-[#E2E0DA] pb-6">
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
            Análise de Investimento · Compartilhado via ImmoYield
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C2B20] md:text-3xl">
            {dealName}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 border px-3 py-1 font-mono text-xs font-semibold ${
                cashFlowPositive
                  ? 'border-[#A8C5B2] bg-[#EBF3EE] text-[#4A7C59]'
                  : 'border-[#FCA5A5] bg-[#FEE2E2] text-[#DC2626]'
              }`}
            >
              {cashFlowPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              Fluxo de caixa {cashFlowPositive ? 'positivo' : 'negativo'}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-[#9CA3AF] sm:hidden">
              <Eye size={10} />
              {viewCount}
            </span>
          </div>
        </div>

        {/* KPI grid */}
        <div>
          <SectionLabel>Indicadores principais</SectionLabel>
          <div className="grid grid-cols-2 gap-px border border-[#E2E0DA] bg-[#E2E0DA] md:grid-cols-4">
            <KpiCard
              label="Fluxo de Caixa"
              value={`${fmt(metrics.monthlyCashFlow)}/mês`}
              positive={cashFlowPositive}
              negative={!cashFlowPositive}
            />
            <KpiCard
              label="Cap Rate"
              value={fmtPct(metrics.capRate)}
              benchmarkPct={(metrics.capRate / 12) * 100}
              sub={`vs CDI ${CDI_RATE}%`}
            />
            <KpiCard
              label="Cash-on-Cash"
              value={fmtPct(metrics.cashOnCash)}
              positive={metrics.cashOnCash >= 0}
              negative={metrics.cashOnCash < 0}
              benchmarkPct={(metrics.cashOnCash / CDI_RATE) * 100}
            />
            <KpiCard
              label="NOI Mensal"
              value={fmt(metrics.monthlyNOI)}
              sub="resultado operacional"
            />
          </div>
        </div>

        {/* Capital structure */}
        <div>
          <SectionLabel>Estrutura de Capital</SectionLabel>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8]">
            {[
              { label: 'Investimento total', value: fmt(metrics.totalInvestment) },
              { label: 'Capital próprio (entrada)', value: fmt(metrics.cashOutlay) },
              ...(metrics.loanAmount > 0
                ? [
                    { label: 'Financiamento', value: fmt(metrics.loanAmount) },
                    {
                      label: 'LTV',
                      value: fmtPct((metrics.loanAmount / metrics.totalInvestment) * 100),
                    },
                    { label: 'Parcela inicial', value: fmt(schedule[0]?.installment ?? 0) },
                  ]
                : []),
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? 'border-b border-[#F0EFEB]' : ''}`}
              >
                <span className="text-sm text-[#6B7280]">{row.label}</span>
                <span className="font-mono text-sm font-semibold text-[#1C2B20]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deal data */}
        <div>
          <SectionLabel>Dados do Imóvel</SectionLabel>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8]">
            {[
              { label: 'Preço de compra', value: fmt(inputs.purchasePrice) },
              { label: 'ITBI', value: fmtPct(inputs.acquisitionCosts.itbiPercent * 100) },
              { label: 'Aluguel bruto', value: `${fmt(inputs.revenue.monthlyRent)} /mês` },
              { label: 'Vacância estimada', value: fmtPct(inputs.revenue.vacancyRate * 100) },
              {
                label: 'Condomínio + IPTU',
                value: `${fmt(inputs.expenses.condo + inputs.expenses.iptu)} /mês`,
              },
              ...(inputs.financing.enabled
                ? [
                    {
                      label: 'Financiamento',
                      value: `${inputs.financing.system} · ${inputs.financing.interestRateYear}% a.a. · ${inputs.financing.termMonths}m`,
                    },
                  ]
                : [{ label: 'Financiamento', value: 'À vista' }]),
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? 'border-b border-[#F0EFEB]' : ''}`}
              >
                <span className="text-sm text-[#6B7280]">{row.label}</span>
                <span className="font-mono text-sm font-semibold text-[#1C2B20]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly cashflow chart */}
        {cashflowMonthlyData.length > 0 && (
          <div>
            <SectionLabel>Fluxo de Caixa — 24 Meses</SectionLabel>
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={cashflowMonthlyData}
                  barSize={6}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                  <XAxis dataKey="mes" {...axisProps} interval={5} />
                  <YAxis {...axisProps} tickFormatter={fmtK} width={56} />
                  <Tooltip content={<DSTooltip prefix="Mês " />} />
                  <ReferenceLine y={0} stroke="#E2E0DA" strokeWidth={1} />
                  <Bar dataKey="fluxo" name="Fluxo líquido">
                    {cashflowMonthlyData.map((entry, i) => (
                      <Cell key={`cf-${i}`} fill={entry.fluxo >= 0 ? '#4A7C59' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Benchmarks */}
        <div>
          <SectionLabel>Benchmarks — % a.a.</SectionLabel>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={benchmarkData}
                layout="vertical"
                barSize={12}
                margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
              >
                <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" {...axisProps} width={84} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(2)}%`, '']}
                  contentStyle={{
                    background: '#FAFAF8',
                    border: '1px solid #E2E0DA',
                    borderRadius: 0,
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="value">
                  {benchmarkData.map((entry, i) => (
                    <Cell key={`bm-${i}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-right font-mono text-[10px] text-[#9CA3AF]">
              CDI e FII são referências de mercado, não garantidas.
            </p>
          </div>
        </div>

        {/* 10-year projection */}
        {projectionData.length > 0 && (
          <div>
            <SectionLabel>Projeção 10 Anos — Valorização e Equity</SectionLabel>
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D6B4F" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3D6B4F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                  <XAxis dataKey="ano" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={fmtK} width={60} />
                  <Tooltip content={<DSTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 10,
                      color: '#9CA3AF',
                      paddingTop: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    name="Valor do imóvel"
                    stroke="#4A7C59"
                    strokeWidth={1.5}
                    fill="url(#valGrad)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    name="Equity acumulado"
                    stroke="#3D6B4F"
                    strokeWidth={1.5}
                    fill="url(#eqGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">
                Projeção assume 5% de valorização anual. Valores estimados, sem garantia.
              </p>
            </div>
          </div>
        )}

        {/* Amortization */}
        {amortData.length > 0 && (
          <div>
            <SectionLabel>Amortização — Saldo Devedor Anual</SectionLabel>
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={amortData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                  <XAxis dataKey="ano" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={fmtK} width={60} />
                  <Tooltip content={<DSTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 10,
                      color: '#9CA3AF',
                      paddingTop: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo devedor"
                    stroke="#DC2626"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="juros"
                    name="Juros pagos (ano)"
                    stroke="#9CA3AF"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center font-mono text-[10px] leading-relaxed text-[#9CA3AF]">
          Cálculos para fins informativos — ImmoYield não compra, vende nem recomenda imóveis e não
          presta consultoria de investimento.
        </p>
      </main>

      {/* ── Sticky footer — referral CTA ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="h-10 bg-gradient-to-t from-[#F8F7F4] to-transparent" />
        <div className="pointer-events-auto border-t border-[#E2E0DA] bg-[#FAFAF8]">
          <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#4A7C59]">
                <BarChart2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm leading-tight font-bold text-[#1C2B20]">
                  Analise seus próprios imóveis
                </p>
                <p className="hidden font-mono text-[10px] text-[#9CA3AF] sm:block">
                  Gratuito · Sem cartão de crédito
                </p>
              </div>
            </div>
            <Link
              href="/auth"
              className="bg-[#4A7C59] px-5 py-2.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
            >
              Criar minha própria análise →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
