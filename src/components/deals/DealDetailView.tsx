'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, BarChart2 } from 'lucide-react';
import { SavedDeal } from '@/lib/supabase/deals';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { ShareButton } from '@/components/share/ShareButton';
import { DownloadPDFButton } from '@/components/pdf/DownloadPDFButton';
import ResultsScreen from '@/components/deals/ResultsScreen';
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

interface Props {
  deal: SavedDeal;
}

export default function DealDetailView({ deal }: Props) {
  const [activeSection, setActiveSection] = useState<NavSection>('analise');

  const m = deal.results_cache?.metrics;
  const type = (deal.property_type as PropertyType) ?? 'aluguel';
  const label = PROPERTY_TYPE_LABELS[type] ?? deal.property_type;
  const cashFlowPositive = (m?.monthlyCashFlow ?? 0) >= 0;

  const navItems: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    {
      id: 'descricao',
      label: 'Descrição do Imóvel',
      icon: <span className="text-[#1a5c3a]">🏠</span>,
    },
    {
      id: 'planilha',
      label: 'Planilha de Compra',
      icon: <span className="text-[#1a5c3a]">📋</span>,
    },
    {
      id: 'analise',
      label: 'Análise do Imóvel',
      icon: <BarChart2 size={14} className="text-[#1a5c3a]" />,
    },
  ];

  return (
    <div className="flex gap-6">
      {/* ── Left panel ───────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0">
        {/* Back link */}
        <Link
          href="/propriedades"
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-[#1a5c3a] hover:underline"
        >
          <ArrowLeft size={12} />
          Ver todos os imóveis
        </Link>

        {/* Property card */}
        <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          {/* Placeholder image */}
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
              <ShareButton dealId={deal.id} dealName={deal.name} compact />
            </div>
          </div>

          {/* Deal info */}
          <div className="p-4">
            <h2 className="text-sm font-bold text-[#1a1a1a]">{deal.name}</h2>
            <p className="mt-1 text-xs text-[#737373]">
              {new Date(deal.updated_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#1a1a1a]">
                {fmt(deal.inputs?.purchasePrice ?? 0)}
              </span>
              {m?.capRate != null && (
                <span className="text-xs font-semibold text-[#1a5c3a]">
                  {fmtPct(m.capRate)} Cap Rate
                </span>
              )}
            </div>
          </div>

          {/* Nav links */}
          <div className="border-t border-[#e5e5e3]">
            <p className="px-4 pt-3 pb-1 text-[9px] font-bold tracking-widest text-[#a3a3a1] uppercase">
              Análise
            </p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium transition-colors ${
                  activeSection === item.id
                    ? 'border-l-2 border-[#1a5c3a] bg-[#f5f5f3] text-[#1a1a1a]'
                    : 'border-l-2 border-transparent text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1a1a1a]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* Delete */}
          <div className="border-t border-[#e5e5e3] p-4">
            <Link href="/propriedades" className="text-xs text-[#a3a3a1] hover:text-red-500">
              ← Voltar ao dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Right content ────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a1a]">
              {activeSection === 'descricao'
                ? 'Descrição do Imóvel'
                : activeSection === 'planilha'
                  ? 'Planilha de Compra'
                  : 'Análise do Imóvel'}
            </h1>
            <nav className="mt-1 flex items-center gap-1 text-xs text-[#737373]">
              <Link href="/propriedades" className="text-[#1a5c3a] hover:underline">
                {label}
              </Link>
              <span>/</span>
              <span>{deal.name}</span>
              <span>/</span>
              <span className="text-[#1a1a1a]">
                {activeSection === 'descricao'
                  ? 'Descrição'
                  : activeSection === 'planilha'
                    ? 'Planilha'
                    : 'Análise'}
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <DownloadPDFButton
              result={deal.results_cache as AnalysisResult}
              inputs={deal.inputs as DealInput}
              dealName={deal.name}
              className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e3] bg-white px-3 py-2 text-xs font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f3]"
            />
            <button
              onClick={() => setActiveSection('planilha')}
              className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e3] bg-white px-3 py-2 text-xs font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f3]"
            >
              <Pencil size={12} />
              Editar
            </button>
          </div>
        </div>

        {/* ── KPI strip (always visible) ─────────────────────────────────────── */}
        {m && (
          <div className="mb-6 grid grid-cols-4 gap-3">
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
                      : 'text-[#1a1a1a]'
                  }`}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Section content ────────────────────────────────────────────────── */}
        {activeSection === 'descricao' && <DescricaoSection deal={deal} label={label} />}
        {activeSection === 'planilha' && <PlanilhaSection deal={deal} />}
        {activeSection === 'analise' && deal.results_cache && (
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-6">
            <ResultsScreen
              result={deal.results_cache as AnalysisResult}
              dealName={deal.name}
              inputs={deal.inputs as DealInput}
              onReset={() => {}}
              isAuthenticated={true}
              hideHeader
              hideSaveButton
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Descrição section ──────────────────────────────────────────────────────────

function DescricaoSection({ deal, label }: { deal: SavedDeal; label: string }) {
  return (
    <div className="space-y-4">
      <Section title="Detalhes do Imóvel">
        <Row label="Nome" value={deal.name} />
        <Row label="Tipo" value={label} />
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

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <Section title="Compra & Reforma">
        <RowCalc label="Preço de Compra" value={fmt(inp.purchasePrice)} />
        {inp.financing?.enabled && (
          <>
            <RowCalc label="Valor Financiado" value={`− ${fmt(inp.financing.downPayment)}`} sub />
            <RowCalc
              label="Entrada"
              value={fmt(inp.financing.downPayment)}
              highlighted
              label2="Entrada:"
            />
          </>
        )}
        <RowCalc
          label="Custos de Aquisição (ITBI + Cartório)"
          value={`+ ${fmt(inp.purchasePrice * inp.acquisitionCosts.itbiPercent + inp.acquisitionCosts.cartorio)}`}
          plus
        />
        <RowCalc
          label="Reformas / Benfeitorias"
          value={`+ ${fmt(inp.acquisitionCosts.reforms)}`}
          plus
        />
        <RowCalc
          label="Capital Total Necessário"
          value={fmt(m?.cashOutlay ?? m?.totalInvestment ?? 0)}
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
              value={fmt(deal.results_cache?.schedule?.[0]?.installment ?? 0)}
            />
          </>
        ) : (
          <Row label="Modalidade" value="À vista" />
        )}
      </Section>

      <Section title="Receitas & Despesas">
        {inp.propertyType === 'airbnb' ? (
          <>
            <Row label="Diária Média" value={fmt(inp.revenue?.dailyRate ?? 0)} />
            <Row label="Taxa de Ocupação" value={pct(inp.revenue?.occupancyRate ?? 0.65)} />
          </>
        ) : inp.propertyType === 'flip' ? (
          <>
            <Row label="Valor Pós-Reforma (ARV)" value={fmt(inp.revenue?.afterRepairValue ?? 0)} />
            <Row label="Prazo de Reforma" value={`${inp.revenue?.holdingMonths ?? 6} meses`} />
          </>
        ) : (
          <>
            <Row label="Aluguel Mensal Bruto" value={fmt(inp.revenue?.monthlyRent ?? 0)} />
            <Row label="Taxa de Vacância" value={pct(inp.revenue?.vacancyRate ?? 0.05)} />
          </>
        )}
        <Row label="Condomínio" value={fmt(inp.expenses?.condo ?? 0)} />
        <Row label="IPTU" value={fmt(inp.expenses?.iptu ?? 0)} />
        <Row label="Administração" value={pct(inp.expenses?.managementPercent ?? 0.1)} />
        <Row label="Manutenção" value={pct(inp.expenses?.maintenancePercent ?? 0.05)} />
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
      <span className="text-sm font-semibold text-[#1a1a1a]">{value}</span>
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
        {total && <span className="w-4 text-xs font-bold text-[#1a1a1a]">=</span>}
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
              : 'font-semibold text-[#1a1a1a]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
