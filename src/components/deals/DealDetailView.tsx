'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, BarChart2, BarChart } from 'lucide-react';
import { SavedDeal } from '@/lib/supabase/deals';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { ShareButton } from '@/components/share/ShareButton';
import { DownloadPDFButton } from '@/components/pdf/DownloadPDFButton';
import ResultsScreen from '@/components/deals/ResultsScreen';
import BrazilianAnalysis from '@/components/deals/BrazilianAnalysis';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';
import type { DealInput } from '@/lib/validations/deal';

// ── Valid sidebar sections ──────────────────────────────────────────────────
// 'analise' is now the single consolidated analysis section — it always renders
// BrazilianAnalysis, and additionally shows the cached wizard ResultsScreen when
// available. The old separate 'calcular' section has been removed.
type NavSection = 'descricao' | 'planilha' | 'analise';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

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
    {
      id: 'descricao',
      label: 'Descrição do Imóvel',
      icon: <span>🏠</span>,
    },
    {
      id: 'planilha',
      label: 'Planilha de Compra',
      icon: <span>📋</span>,
    },
    {
      id: 'analise',
      label: 'Análise',
      icon: <BarChart2 size={14} />,
    },
  ];

  // ── Nav item class helper ────────────────────────────────────────────────
  // Fix: the old code used `text-[#F0EFEB]` for active/hover text. That colour
  // is `--bg-elevated` in the design system — a near-white background token,
  // not a foreground colour. On the white/cream card it was invisible.
  // Correct colours: active → accent text (#1a5c3a), hover → text-primary (#1c2b20).
  const navItemClass = (id: NavSection) =>
    `flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium transition-colors ${
      activeSection === id
        ? 'border-l-2 border-[#1a5c3a] bg-[#ebf3ee] text-[#1a5c3a]'
        : 'border-l-2 border-transparent text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1c2b20]'
    }`;

  return (
    <div className="flex gap-6">
      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0">
        <Link
          href="/propriedades"
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-[#1a5c3a] hover:underline"
        >
          <ArrowLeft size={12} />
          Ver todos os imóveis
        </Link>

        {/* Property card */}
        <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          {/* Thumbnail */}
          <div className="relative h-36 bg-gradient-to-br from-[#e5e5e3] to-[#d4d4d2]">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl opacity-40">🏠</span>
            </div>
            <div className="absolute right-2 bottom-2">
              <span className="rounded-full bg-[#1a5c3a] px-2 py-0.5 text-[10px] font-bold text-white">
                {label}
              </span>
            </div>
            <div className="absolute top-2 right-2">
              <ShareButton dealId={deal.id} dealName={deal.title} compact />
            </div>
          </div>

          {/* Deal summary */}
          <div className="p-4">
            {/* Fix: was text-[#F0EFEB] — invisible on white. Now text-[#1c2b20]. */}
            <h2 className="text-sm font-bold text-[#1c2b20]">{deal.title}</h2>
            <p className="mt-1 text-xs text-[#737373]">
              {new Date(deal.updated_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <div className="mt-3 flex items-center justify-between">
              {/* Fix: was text-[#F0EFEB] — invisible on white. Now text-[#1c2b20]. */}
              <span className="text-sm font-bold text-[#1c2b20]">
                {fmt(deal.inputs?.purchasePrice ?? deal.price ?? 0)}
              </span>
              {m?.capRate != null && (
                <span className="text-xs font-semibold text-[#1a5c3a]">
                  {fmtPct(m.capRate)} Cap Rate
                </span>
              )}
            </div>
          </div>

          {/* Nav */}
          <div className="border-t border-[#e5e5e3]">
            <p className="px-4 pt-3 pb-1 text-[9px] font-bold tracking-widest text-[#a3a3a1] uppercase">
              Seções
            </p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={navItemClass(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-[#e5e5e3] p-4">
            <Link href="/propriedades" className="text-xs text-[#a3a3a1] hover:text-red-500">
              ← Voltar ao dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            {/* Fix: was text-[#F0EFEB] — invisible. Now text-[#1c2b20]. */}
            <h1 className="text-xl font-bold text-[#1c2b20]">
              {activeSection === 'descricao'
                ? 'Descrição do Imóvel'
                : activeSection === 'planilha'
                  ? 'Planilha de Compra'
                  : 'Análise'}
            </h1>
            <nav className="mt-1 flex items-center gap-1 text-xs text-[#737373]">
              <Link href="/propriedades" className="text-[#1a5c3a] hover:underline">
                {label}
              </Link>
              <span>/</span>
              <span>{deal.title}</span>
              <span>/</span>
              {/* Fix: was text-[#F0EFEB]. Now text-[#1c2b20]. */}
              <span className="text-[#1c2b20]">
                {activeSection === 'descricao'
                  ? 'Descrição'
                  : activeSection === 'planilha'
                    ? 'Planilha'
                    : 'Análise'}
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {hasWizardResults && (
              <DownloadPDFButton
                result={deal.results_cache as AnalysisResult}
                inputs={deal.inputs as DealInput}
                dealName={deal.title}
                className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e3] bg-white px-3 py-2 text-xs font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f3]"
              />
            )}
            <button
              onClick={() => setActiveSection('planilha')}
              className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e3] bg-white px-3 py-2 text-xs font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f3]"
            >
              <Pencil size={12} />
              Editar
            </button>
          </div>
        </div>

        {/* ── Section content ─────────────────────────────────────────────────── */}
        {activeSection === 'descricao' && <DescricaoSection deal={deal} label={label} />}
        {activeSection === 'planilha' && <PlanilhaSection deal={deal} />}
        {activeSection === 'analise' && (
          <AnaliseSection deal={deal} hasWizardResults={hasWizardResults} m={m} cashFlowPositive={cashFlowPositive} />
        )}
      </div>
    </div>
  );
}

// ── Analysis section ──────────────────────────────────────────────────────────

type AnaliseMetrics = {
  capRate: number;
  cashOnCash: number;
  monthlyCashFlow: number;
  cashOutlay: number;
  totalInvestment: number;
} | null | undefined;

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
    return (
      <div className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Capital Necessário', value: fmt(m.cashOutlay ?? m.totalInvestment) },
            {
              label: 'Fluxo de Caixa',
              value: `${fmt(m.monthlyCashFlow)}/mês`,
              colored: true,
              positive: cashFlowPositive,
            },
            { label: 'Cap Rate', value: fmtPct(m.capRate) },
            { label: 'COC', value: fmtPct(m.cashOnCash) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-[#e5e5e3] bg-white p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
                {kpi.label}
              </p>
              <p
                className={`mt-1.5 text-lg font-bold tabular-nums ${
                  kpi.colored
                    ? kpi.positive
                      ? 'text-[#1a5c3a]'
                      : 'text-red-500'
                    : 'text-[#1c2b20]'
                }`}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Full wizard analysis */}
        <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          <div className="flex items-center gap-2 border-b border-[#e5e5e3] bg-[#f5f5f3] px-5 py-3">
            <BarChart size={13} className="text-[#1a5c3a]" />
            <p className="text-[10px] font-bold tracking-widest text-[#1a5c3a] uppercase">
              Análise do Investimento
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

        {/* Market benchmarks — supplementary context */}
        <BrazilianAnalysis
          deal={deal}
          defaultOpen={false}
          heading="Benchmarks de Mercado"
        />
      </div>
    );
  }

  // No wizard results — show market benchmarks + CTA
  return (
    <div className="space-y-4">
      {/* CTA to run full wizard analysis */}
      <div className="rounded-xl border border-dashed border-[#1a5c3a]/40 bg-[#f5fff8] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a5c3a]/10">
            <BarChart size={18} className="text-[#1a5c3a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1a5c3a]">Análise detalhada não calculada</p>
            <p className="mt-0.5 text-xs text-[#737373]">
              Use o formulário de análise completa para calcular fluxo de caixa, amortização, projeções de 10 anos e pontuação ImmoScore.
            </p>
            <Link
              href="/deals/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c3a] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#163f2a]"
            >
              Fazer análise completa →
            </Link>
          </div>
        </div>
      </div>

      {/* Market benchmarks — primary content when no wizard data */}
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
  if (!inp) return <p className="text-sm text-[#737373]">Sem dados de planilha.</p>;

  const fmtR = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <Section title="Compra & Reforma">
        <RowCalc label="Preço de Compra" value={fmtR(inp.purchasePrice)} />
        {inp.financing?.enabled && (
          <>
            <RowCalc label="Valor Financiado" value={`− ${fmtR(inp.financing.downPayment)}`} sub />
            <RowCalc label="Entrada" value={fmtR(inp.financing.downPayment)} highlighted label2="Entrada:" />
          </>
        )}
        <RowCalc
          label="Custos de Aquisição (ITBI + Cartório)"
          value={`+ ${fmtR(
            inp.purchasePrice * inp.acquisitionCosts.itbiPercent +
              inp.acquisitionCosts.cartorio,
          )}`}
          plus
        />
        <RowCalc
          label="Reformas / Benfeitorias"
          value={`+ ${fmtR(inp.acquisitionCosts.reforms)}`}
          plus
        />
        <RowCalc
          label="Capital Total Necessário"
          value={fmtR(m?.cashOutlay ?? m?.totalInvestment ?? 0)}
          total
        />
      </Section>

      <Section title="Financiamento">
        {inp.financing?.enabled ? (
          <>
            <Row label="Sistema" value={inp.financing.system} />
            <Row label="Taxa de Juros" value={`${inp.financing.interestRateYear}% a.a.`} />
            <Row label="Prazo" value={`${inp.financing.termMonths} meses`} />
            <Row
              label="Parcela Inicial"
              value={fmtR(deal.results_cache?.schedule?.[0]?.installment ?? 0)}
            />
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

// ── Shared UI primitives ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
      <div className="border-b border-[#e5e5e3] bg-[#f5f5f3] px-5 py-3">
        <p className="text-xs font-bold tracking-widest text-[#1a5c3a] uppercase">{title}</p>
      </div>
      <div className="divide-y divide-[#f5f5f3]">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-[#737373]">{label}</span>
      {/* Fix: was text-[#F0EFEB] — invisible on white. Now text-[#1c2b20]. */}
      <span className="text-sm font-semibold text-[#1c2b20]">{value}</span>
    </div>
  );
}

function RowCalc({
  label,
  label2,
  value,
  sub,
  highlighted,
  plus,
  total,
}: {
  label: string;
  label2?: string;
  value: string;
  sub?: boolean;
  highlighted?: boolean;
  plus?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        total ? 'bg-[#f5f5f3]' : highlighted ? 'bg-[#e8f5ee]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {sub && <span className="w-4 text-xs text-[#a3a3a1]">−</span>}
        {plus && <span className="w-4 text-xs text-[#a3a3a1]">+</span>}
        {/* Fix: was text-[#F0EFEB] — invisible on white. Now text-[#1c2b20]. */}
        {total && <span className="w-4 text-xs font-bold text-[#1c2b20]">=</span>}
        {!sub && !plus && !total && <span className="w-4" />}
        <span className={`text-sm ${total ? 'font-bold text-[#1a5c3a]' : 'text-[#737373]'}`}>
          {label2 ?? label}
        </span>
      </div>
      <span
        className={`text-sm tabular-nums ${
          total
            ? 'font-bold text-[#1a5c3a]'
            : highlighted
              ? 'font-bold text-[#1a5c3a]'
              : 'font-semibold text-[#1c2b20]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
