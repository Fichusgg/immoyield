'use client';

/**
 * PublicReportView
 *
 * The page seen by anyone who receives a /r/[slug] link.
 * No auth required. Renders the full analysis with:
 *   - Branded header (watermark / growth driver)
 *   - KPI strip, capital breakdown
 *   - All charts (cashflow, benchmarks, projection, amortization)
 *   - Sticky footer CTA → immoyield signup
 */

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
import {
  TrendingUp,
  TrendingDown,
  Eye,
  ExternalLink,
  ArrowUpRight,
  BarChart2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PublicReportViewProps {
  dealName: string;
  propertyType?: string;
  updatedAt: string;
  viewCount: number;
  result: AnalysisResult;
  inputs: DealInput;
  slug?: string;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const KPICard = ({
  label,
  value,
  sub,
  highlight,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) => (
  <div
    className={`flex flex-col gap-1.5 rounded-2xl p-5 ${
      highlight
        ? 'bg-[#EBF3EE]0 text-white'
        : negative
          ? 'border border-red-100 bg-red-50'
          : 'border border-[#E2E0DA] bg-white'
    }`}
  >
    <span
      className={`text-[10px] font-bold tracking-widest uppercase ${highlight ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'}`}
    >
      {label}
    </span>
    <span
      className={`text-2xl font-black tracking-tight tabular-nums ${
        highlight
          ? 'text-white'
          : positive
            ? 'text-[#4A7C59]'
            : negative
              ? 'text-red-500'
              : 'text-[#1C2B20]'
      }`}
    >
      {value}
    </span>
    {sub && (
      <span className={`text-xs ${highlight ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'}`}>{sub}</span>
    )}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-xs font-black tracking-widest text-[#9CA3AF] uppercase">{children}</h3>
);

const ChartTooltip = ({
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
    <div className="rounded-xl border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2 text-xs text-[#1C2B20] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <p className="mb-1 text-[#9CA3AF]">
        {prefix}
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicReportView({
  dealName,
  updatedAt,
  viewCount,
  result,
  inputs,
}: PublicReportViewProps) {
  const { metrics, schedule, projections } = result;
  const cashFlowPositive = metrics.monthlyCashFlow >= 0;

  // Chart data
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

  const CDI_RATE = 10.5;
  const FII_RATE = 8.0;
  const benchmarkData = [
    { name: 'Cap Rate', value: +metrics.capRate.toFixed(2), fill: '#0ea5e9' },
    {
      name: 'Cash-on-Cash',
      value: +metrics.cashOnCash.toFixed(2),
      fill: metrics.cashOnCash >= 0 ? '#10b981' : '#DC2626',
    },
    { name: 'CDI (ref.)', value: CDI_RATE, fill: '#94a3b8' },
    { name: 'FII (ref.)', value: FII_RATE, fill: '#94a3b8' },
  ];

  const formattedDate = new Date(updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* ── Branded header (the watermark / growth driver) ────────────────── */}
      <header className="sticky top-0 z-20 border-b border-[#E2E0DA] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4A7C59]">
              <span className="text-xs font-black text-white">I</span>
            </div>
            <span className="font-black tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>

          {/* Meta pill */}
          <div className="hidden items-center gap-3 text-xs text-[#9CA3AF] sm:flex">
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {viewCount} {viewCount === 1 ? 'visualização' : 'visualizações'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formattedDate}
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/"
            className="hover:bg-[#EBF3EE]0 flex items-center gap-1.5 rounded-lg bg-[#4A7C59] px-3 py-1.5 text-xs font-black whitespace-nowrap text-white transition-colors"
          >
            Analisar meu imóvel <ArrowUpRight size={11} />
          </Link>
        </div>
      </header>

      {/* ── Report body ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10 pb-32">
        {/* Title block */}
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#9CA3AF] uppercase">
            Análise de Investimento · Compartilhado via ImmoYield
          </p>
          <h1 className="text-2xl font-black tracking-tight text-[#1C2B20]">{dealName}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                cashFlowPositive ? 'bg-[#EBF3EE] text-[#3D6B4F]' : 'bg-red-50 text-red-600'
              }`}
            >
              {cashFlowPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              Fluxo de caixa {cashFlowPositive ? 'positivo' : 'negativo'}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#9CA3AF] sm:hidden">
              <Eye size={10} />
              {viewCount}
            </span>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            label="Fluxo de Caixa"
            value={fmt(metrics.monthlyCashFlow)}
            sub="por mês"
            positive={cashFlowPositive}
            negative={!cashFlowPositive}
          />
          <KPICard
            label="Cap Rate"
            value={fmtPct(metrics.capRate)}
            sub="retorno bruto anual"
            highlight
          />
          <KPICard
            label="Cash-on-Cash"
            value={fmtPct(metrics.cashOnCash)}
            sub="retorno sobre capital próprio"
            positive={metrics.cashOnCash >= 0}
            negative={metrics.cashOnCash < 0}
          />
          <KPICard
            label="NOI Mensal"
            value={fmt(metrics.monthlyNOI)}
            sub="resultado operacional líquido"
          />
        </div>

        {/* Capital Breakdown */}
        <div>
          <SectionTitle>Estrutura de Capital</SectionTitle>
          <div className="divide-y divide-[#E2E0DA] rounded-2xl border border-[#E2E0DA] bg-white text-sm">
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
            ].map((row) => (
              <div key={row.label} className="flex justify-between px-4 py-3">
                <span className="text-[#6B7280]">{row.label}</span>
                <span className="font-bold text-[#1C2B20]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deal inputs summary */}
        <div>
          <SectionTitle>Dados do Imóvel</SectionTitle>
          <div className="divide-y divide-[#E2E0DA] rounded-2xl border border-[#E2E0DA] bg-white text-sm">
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
            ].map((row) => (
              <div key={row.label} className="flex justify-between px-4 py-3">
                <span className="text-[#6B7280]">{row.label}</span>
                <span className="font-bold text-[#1C2B20]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly cashflow chart */}
        {cashflowMonthlyData.length > 0 && (
          <div>
            <SectionTitle>Fluxo de Caixa Mensal — 24 Meses</SectionTitle>
            <div className="rounded-2xl border border-[#E2E0DA] bg-white p-5">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={cashflowMonthlyData}
                  barSize={8}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={5}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtK}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip prefix="Mês " />} />
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
                  <Bar dataKey="fluxo" name="Fluxo líquido" radius={[3, 3, 0, 0]}>
                    {cashflowMonthlyData.map((entry, i) => (
                      <Cell key={`cf-${i}`} fill={entry.fluxo >= 0 ? '#10b981' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Benchmarks */}
        <div>
          <SectionTitle>Benchmarks — % a.a.</SectionTitle>
          <div className="rounded-2xl border border-[#E2E0DA] bg-white p-5">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={benchmarkData}
                layout="vertical"
                barSize={16}
                margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v) => {
                    const num = typeof v === 'number' ? v : Number(v ?? 0);
                    return [`${num.toFixed(2)}%`, ''];
                  }}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {benchmarkData.map((entry, i) => (
                    <Cell key={`bm-${i}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-right text-[10px] text-[#9CA3AF]">
              CDI e FII são referências de mercado, não garantidas.
            </p>
          </div>
        </div>

        {/* 10-year projection */}
        {projectionData.length > 0 && (
          <div>
            <SectionTitle>Projeção 10 Anos — Valorização e Equity</SectionTitle>
            <div className="rounded-2xl border border-[#E2E0DA] bg-white p-5">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valGradPub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="eqGradPub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="ano"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtK}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 10, color: '#64748b', paddingTop: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    name="Valor do imóvel"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#valGradPub)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    name="Equity acumulado"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#eqGradPub)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-2 text-[10px] text-[#9CA3AF]">
                Projeção assume 5% de valorização anual. Valores estimados, sem garantia.
              </p>
            </div>
          </div>
        )}

        {/* Amortization */}
        {amortData.length > 0 && (
          <div>
            <SectionTitle>Amortização — Saldo Devedor Anual</SectionTitle>
            <div className="rounded-2xl border border-[#E2E0DA] bg-white p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={amortData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="ano"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtK}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 10, color: '#64748b', paddingTop: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo devedor"
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="juros"
                    name="Juros pagos (ano)"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Legal disclaimer */}
        <p className="text-center text-[10px] leading-relaxed text-[#9CA3AF]">
          Esta análise foi gerada automaticamente pelo ImmoYield para fins informativos. Projeções
          são estimativas sem garantia. Consulte um profissional de investimentos.
        </p>
      </main>

      {/* ── Sticky footer CTA (growth watermark) ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        {/* Gradient fade */}
        <div className="h-12 bg-gradient-to-t from-slate-50 to-transparent" />

        <div className="pointer-events-auto border-t border-[#E2E0DA] bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4A7C59]">
                <BarChart2 size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm leading-tight font-black text-[#1C2B20]">
                  Analise seus próprios imóveis
                </p>
                <p className="hidden text-xs text-[#9CA3AF] sm:block">
                  Gratuito · Sem cadastro de cartão
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="hover:bg-[#EBF3EE]0 flex items-center gap-1.5 rounded-xl bg-[#4A7C59] px-5 py-2.5 text-sm font-black whitespace-nowrap text-white shadow-lg shadow-emerald-500/25 transition-colors"
            >
              Começar grátis <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
