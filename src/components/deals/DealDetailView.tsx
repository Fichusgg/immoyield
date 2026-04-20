'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  BarChart2,
  BarChart,
  TrendingUp,
  TrendingDown,
  Home,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { SavedDeal } from '@/lib/supabase/deals';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { ShareButton } from '@/components/share/ShareButton';
import { DownloadPDFButton } from '@/components/pdf/DownloadPDFButton';
import ResultsScreen from '@/components/deals/ResultsScreen';
import BrazilianAnalysis from '@/components/deals/BrazilianAnalysis';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

type NavSection = 'descricao' | 'planilha' | 'analise';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}mi`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

interface Props {
  deal: SavedDeal;
}

export default function DealDetailView({ deal }: Props) {
  const [activeSection, setActiveSection] = useState<NavSection>('analise');

  const m = deal.results_cache?.metrics;
  const type = (deal.property_type as PropertyType) ?? 'aluguel';
  const label = PROPERTY_TYPE_LABELS[type] ?? deal.property_type;
  const cashFlowPositive = (m?.monthlyCashFlow ?? 0) >= 0;
  const hasWizardResults = !!(deal.results_cache && deal.inputs);

  const navItems: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    { id: 'analise', label: 'Análise', icon: <BarChart2 size={13} /> },
    { id: 'descricao', label: 'Descrição', icon: <Home size={13} /> },
    { id: 'planilha', label: 'Planilha de Compra', icon: <BarChart size={13} /> },
  ];

  const navItemClass = (id: NavSection) =>
    `flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium transition-colors ${
      activeSection === id
        ? 'border-l-2 border-[#4A7C59] bg-[#EBF3EE] text-[#4A7C59]'
        : 'border-l-2 border-transparent text-[#6B7280] hover:bg-[#F0EFEB] hover:text-[#1C2B20]'
    }`;

  return (
    <div className="flex gap-6">
      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sticky top-0 w-56 shrink-0 self-start">
        <Link
          href="/propriedades"
          className="mb-4 flex items-center gap-1.5 font-mono text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        >
          <ArrowLeft size={12} />
          Todos os imóveis
        </Link>

        {/* Property card */}
        <div className="overflow-hidden border border-[#E2E0DA] bg-[#FAFAF8]">
          {/* Thumbnail */}
          <div className="relative flex h-28 items-center justify-center bg-[#F0EFEB]">
            <Home size={32} className="text-[#D0CEC8]" />
            <div className="absolute right-2 bottom-2">
              <span className="bg-[#4A7C59] px-2 py-0.5 font-mono text-[9px] font-semibold text-white uppercase">
                {label}
              </span>
            </div>
            <div className="absolute top-2 right-2">
              <ShareButton dealId={deal.id} dealName={deal.title} compact />
            </div>
          </div>

          {/* Deal summary */}
          <div className="border-b border-[#E2E0DA] p-4">
            <h2 className="text-sm font-bold text-[#1C2B20]">{deal.title}</h2>
            <p className="mt-0.5 font-mono text-[10px] text-[#9CA3AF]">
              {new Date(deal.updated_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-[#1C2B20]">
                {fmt(deal.inputs?.purchasePrice ?? deal.price ?? 0)}
              </span>
              {m?.capRate != null && (
                <span className="font-mono text-xs font-semibold text-[#4A7C59]">
                  {fmtPct(m.capRate)} Cap
                </span>
              )}
            </div>
          </div>

          {/* Nav */}
          <div>
            <p className="px-4 pt-3 pb-1 font-mono text-[9px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Seções
            </p>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveSection(item.id)} className={navItemClass(item.id)}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1C2B20]">
              {activeSection === 'descricao' ? 'Descrição' : activeSection === 'planilha' ? 'Planilha de Compra' : 'Análise'}
            </h1>
            <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">{deal.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasWizardResults && (
              <DownloadPDFButton
                result={deal.results_cache as AnalysisResult}
                inputs={deal.inputs as DealInput}
                dealName={deal.title}
                className="flex items-center gap-1.5 border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2 font-mono text-xs font-medium text-[#6B7280] transition-colors hover:border-[#D0CEC8] hover:text-[#1C2B20]"
              />
            )}
            <button
              onClick={() => setActiveSection('planilha')}
              className="flex items-center gap-1.5 border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2 font-mono text-xs font-medium text-[#6B7280] transition-colors hover:border-[#D0CEC8] hover:text-[#1C2B20]"
            >
              <Pencil size={11} />
              Editar
            </button>
          </div>
        </div>

        {activeSection === 'descricao' && <DescricaoSection deal={deal} label={label} />}
        {activeSection === 'planilha' && <PlanilhaSection deal={deal} />}
        {activeSection === 'analise' && (
          <AnaliseSection deal={deal} hasWizardResults={hasWizardResults} m={m} cashFlowPositive={cashFlowPositive} />
        )}
      </div>
    </div>
  );
}

// ── Analysis section ───────────────────────────────────────────────────────────

type AnaliseMetrics = {
  capRate: number;
  cashOnCash: number;
  monthlyCashFlow: number;
  cashOutlay: number;
  totalInvestment: number;
  monthlyNOI?: number;
  loanAmount?: number;
} | null | undefined;

// Custom Recharts tooltip aligned to the design system
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2" style={{ boxShadow: '0 10px 30px rgba(28,43,32,0.08)' }}>
      <p className="mb-1 font-mono text-[10px] text-[#9CA3AF]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
};

function KpiCard({
  label,
  value,
  sub,
  benchmarkPct,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  benchmarkPct?: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
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
            className="h-0.5 bg-[#4A7C59] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, benchmarkPct))}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">{sub}</p>}
    </div>
  );
}

function AnaliseSection({
  deal,
  hasWizardResults,
  m,
  cashFlowPositive,
}: {
  deal: SavedDeal;
  hasWizardResults: boolean;
  m: AnaliseMetrics;
  cashFlowPositive: boolean;
}) {
  if (hasWizardResults && m) {
    // Build 30yr cashflow chart data from schedule
    const schedule = (deal.results_cache as AnalysisResult)?.schedule ?? [];
    const chartData = schedule
      .filter((_, i) => i % 12 === 0)
      .slice(0, 30)
      .map((p, i) => ({
        ano: `Ano ${i + 1}`,
        fluxo: +(m.monthlyNOI ?? 0) * 12 - p.installment * 12,
        saldo: +p.remainingBalance,
      }));

    // CDI estimate for comparison benchmark bar
    const CDI_ANNUAL = 10.75;
    const purchasePrice = deal.inputs?.purchasePrice ?? 0;
    const annualRent = (m.monthlyNOI ?? 0) * 12;
    const yieldBruto = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;
    const paybackYears = (m.monthlyNOI ?? 0) > 0 ? purchasePrice / ((m.monthlyNOI ?? 1) * 12) : 0;

    return (
      <div className="space-y-5">
        {/* Zone 1 — 6 KPI grid with benchmark bars */}
        <div className="grid grid-cols-2 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:grid-cols-3">
          <KpiCard
            label="Yield Bruto"
            value={`${yieldBruto.toFixed(1)}%`}
            benchmarkPct={(yieldBruto / 12) * 100}
            sub={`vs CDI ${CDI_ANNUAL}%`}
          />
          <KpiCard
            label="Cap Rate"
            value={fmtPct(m.capRate)}
            benchmarkPct={(m.capRate / 12) * 100}
          />
          <KpiCard
            label="Fluxo Mensal"
            value={`${fmt(m.monthlyCashFlow)}/mês`}
            positive={cashFlowPositive}
            negative={!cashFlowPositive}
          />
          <KpiCard
            label="Cash-on-Cash"
            value={fmtPct(m.cashOnCash)}
            benchmarkPct={(m.cashOnCash / CDI_ANNUAL) * 100}
            sub={`vs CDI ${CDI_ANNUAL}%`}
          />
          <KpiCard
            label="Payback"
            value={paybackYears > 0 ? `${paybackYears.toFixed(1)} anos` : '—'}
            benchmarkPct={paybackYears > 0 ? Math.max(0, 100 - (paybackYears / 30) * 100) : 0}
          />
          <KpiCard
            label="Capital Necessário"
            value={fmt(m.cashOutlay ?? m.totalInvestment)}
          />
        </div>

        {/* Zone 2 — Cashflow chart (annual, 30yr) */}
        {chartData.length > 0 && (
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <p className="mb-4 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Fluxo de Caixa Anual — 30 Anos
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fluxoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.12} />
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
                    tickFormatter={(v) => fmtK(v)}
                    tick={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="#E2E0DA" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="fluxo"
                    name="Fluxo Anual"
                    stroke="#4A7C59"
                    strokeWidth={1.5}
                    fill="url(#fluxoGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Zone 3 — Full wizard analysis */}
        <div className="border border-[#E2E0DA] bg-[#FAFAF8]">
          <div className="flex items-center gap-2 border-b border-[#E2E0DA] px-5 py-3">
            <BarChart size={13} className="text-[#4A7C59]" />
            <p className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Análise detalhada
            </p>
          </div>
          <div className="p-6">
            <ResultsScreen
              result={deal.results_cache as AnalysisResult}
              dealName={deal.title}
              inputs={deal.inputs as DealInput}
              onReset={() => {}}
              isAuthenticated={true}
              hideHeader
              hideSaveButton
            />
          </div>
        </div>

        {/* Benchmarks */}
        <BrazilianAnalysis deal={deal} defaultOpen={false} heading="Benchmarks de Mercado" />
      </div>
    );
  }

  // No wizard results
  return (
    <div className="space-y-4">
      <div className="border border-dashed border-[#A8C5B2] bg-[#EBF3EE] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#4A7C59]">
            <BarChart size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1C2B20]">Análise detalhada não calculada</p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Use o formulário de análise completa para calcular fluxo de caixa, amortização, projeções e ImmoScore.
            </p>
            <Link
              href="/deals/new"
              className="mt-3 inline-flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
            >
              Fazer análise completa →
            </Link>
          </div>
        </div>
      </div>
      <BrazilianAnalysis deal={deal} defaultOpen />
    </div>
  );
}

// ── Descrição section ──────────────────────────────────────────────────────────

function DescricaoSection({ deal, label }: { deal: SavedDeal; label: string }) {
  return (
    <div className="space-y-4">
      <Section title="Detalhes do Imóvel">
        <Row label="Nome" value={deal.title} />
        <Row label="Tipo" value={label} />
        {deal.city && <Row label="Cidade" value={[deal.city, deal.state].filter(Boolean).join(', ')} />}
        {deal.area && <Row label="Área" value={`${deal.area} m²`} />}
        {deal.bedrooms != null && <Row label="Quartos" value={String(deal.bedrooms)} />}
        <Row
          label="Salvo em"
          value={new Date(deal.updated_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        />
      </Section>
    </div>
  );
}

// ── Planilha section ───────────────────────────────────────────────────────────

function PlanilhaSection({ deal }: { deal: SavedDeal }) {
  const inp = deal.inputs;
  const m = deal.results_cache?.metrics;
  if (!inp) return <p className="text-sm text-[#6B7280]">Sem dados de planilha.</p>;

  const fmtR = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <Section title="Compra & Reforma">
        <RowCalc label="Preço de Compra" value={fmtR(inp.purchasePrice)} />
        {inp.financing?.enabled && (
          <>
            <RowCalc label="Valor Financiado" value={`− ${fmtR(inp.financing.downPayment)}`} sub />
            <RowCalc label="Entrada" value={fmtR(inp.financing.downPayment)} highlighted />
          </>
        )}
        <RowCalc
          label="Custos de Aquisição (ITBI + Cartório)"
          value={`+ ${fmtR(inp.purchasePrice * inp.acquisitionCosts.itbiPercent + inp.acquisitionCosts.cartorio)}`}
          plus
        />
        <RowCalc label="Reformas / Benfeitorias" value={`+ ${fmtR(inp.acquisitionCosts.reforms)}`} plus />
        <RowCalc label="Capital Total Necessário" value={fmtR(m?.cashOutlay ?? m?.totalInvestment ?? 0)} total />
      </Section>

      <Section title="Financiamento">
        {inp.financing?.enabled ? (
          <>
            <Row label="Sistema" value={inp.financing.system} />
            <Row label="Taxa de Juros" value={`${inp.financing.interestRateYear}% a.a.`} />
            <Row label="Prazo" value={`${inp.financing.termMonths} meses`} />
            <Row label="Parcela Inicial" value={fmtR(deal.results_cache?.schedule?.[0]?.installment ?? 0)} />
          </>
        ) : (
          <Row label="Modalidade" value="À vista" />
        )}
      </Section>

      <Section title="Receitas & Despesas">
        {inp.propertyType === 'airbnb' ? (
          <>
            <Row label="Diária Média" value={fmtR(inp.revenue?.dailyRate ?? 0)} />
            <Row label="Taxa de Ocupação" value={pct(inp.revenue?.occupancyRate ?? 0.65)} />
          </>
        ) : inp.propertyType === 'flip' ? (
          <>
            <Row label="Valor Pós-Reforma (ARV)" value={fmtR(inp.revenue?.afterRepairValue ?? 0)} />
            <Row label="Prazo de Reforma" value={`${inp.revenue?.holdingMonths ?? 6} meses`} />
          </>
        ) : (
          <>
            <Row label="Aluguel Mensal Bruto" value={fmtR(inp.revenue?.monthlyRent ?? 0)} />
            <Row label="Taxa de Vacância" value={pct(inp.revenue?.vacancyRate ?? 0.05)} />
          </>
        )}
        <Row label="Condomínio" value={fmtR(inp.expenses?.condo ?? 0)} />
        <Row label="IPTU" value={fmtR(inp.expenses?.iptu ?? 0)} />
        <Row label="Administração" value={pct(inp.expenses?.managementPercent ?? 0.1)} />
        <Row label="Manutenção" value={pct(inp.expenses?.maintenancePercent ?? 0.03)} />
      </Section>
    </div>
  );
}

// ── Shared UI primitives — aligned to design system ───────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden border border-[#E2E0DA] bg-[#FAFAF8]">
      <div className="border-b border-[#E2E0DA] bg-[#F0EFEB] px-5 py-2.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">{title}</p>
      </div>
      <div className="divide-y divide-[#F0EFEB]">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="font-mono text-sm font-semibold text-[#1C2B20]">{value}</span>
    </div>
  );
}

function RowCalc({
  label,
  value,
  sub,
  highlighted,
  plus,
  total,
}: {
  label: string;
  value: string;
  sub?: boolean;
  highlighted?: boolean;
  plus?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        total ? 'bg-[#EBF3EE]' : highlighted ? 'bg-[#F0EFEB]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {sub && <span className="w-4 font-mono text-xs text-[#9CA3AF]">−</span>}
        {plus && <span className="w-4 font-mono text-xs text-[#9CA3AF]">+</span>}
        {total && <span className="w-4 font-mono text-xs font-bold text-[#4A7C59]">=</span>}
        {!sub && !plus && !total && <span className="w-4" />}
        <span className={`text-sm ${total ? 'font-bold text-[#4A7C59]' : 'text-[#6B7280]'}`}>{label}</span>
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${
          total ? 'font-bold text-[#4A7C59]' : highlighted ? 'font-semibold text-[#4A7C59]' : 'font-semibold text-[#1C2B20]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
