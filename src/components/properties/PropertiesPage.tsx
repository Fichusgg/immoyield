'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SavedDeal, deleteDeal } from '@/lib/supabase/deals';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { useDealStore } from '@/store/useDealStore';
import DealWizard from '@/components/deals/DealWizard';
import UrlImportScreen from '@/components/deals/UrlImportScreen';
import { Home, CalendarDays, Wrench, Plus, Search, ArrowLeft, PencilLine, Link2 } from 'lucide-react';
import { getDealDisplayTitle } from '@/lib/deals/display';

// ─── The 3 DealCheck-style categories ────────────────────────────────────────

type Category = 'residential' | 'airbnb' | 'flip';

interface CategoryDef {
  type: Category;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryDef[] = [
  {
    type: 'residential',
    label: 'Aluguéis',
    description: 'Compra e aluguel de longo prazo para renda passiva.',
    icon: Home,
  },
  {
    type: 'airbnb',
    label: 'Airbnb / Temporada',
    description: 'Locação de curta temporada e maximização por diária.',
    icon: CalendarDays,
  },
  {
    type: 'flip',
    label: 'Reforma e Venda',
    description: 'Compra, reforma e venda para lucro no curto prazo.',
    icon: Wrench,
  },
];

// ─── Map "multifamily" and "commercial" into the 3 visible categories ────────
function mapToCategory(propertyType: string): Category {
  if (propertyType === 'airbnb') return 'airbnb';
  if (propertyType === 'flip') return 'flip';
  return 'residential'; // residential, multifamily, commercial all go here
}

interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

interface PropertiesPageProps {
  benchmarks?: Benchmarks;
}

export default function PropertiesPage({ benchmarks }: PropertiesPageProps) {
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('residential');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [showEntryChoice, setShowEntryChoice] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardOpenedFromChoice, setWizardOpenedFromChoice] = useState(false);

  const { reset, updateFormData } = useDealStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Você precisa estar logado.');

      const { data, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw new Error(`Erro ao carregar: ${fetchError.message}`);
      setDeals((data ?? []) as SavedDeal[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Auto-open wizard when arriving with `?wizard=1` ──────────────────────
  // The hero calculator seeds the deal store and links here. Open the wizard
  // immediately, *without* resetting — so the seeded values pre-fill the form.
  // We strip the param afterward so a refresh won't re-trigger the open.
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get('wizard') !== '1') return;
    setShowEntryChoice(false);
    setShowUrlImport(false);
    setShowWizard(true);
    setWizardOpenedFromChoice(false);
    router.replace('/propriedades');
  }, [searchParams, router]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const countByCategory = (cat: Category) =>
    deals.filter((d) => mapToCategory(d.property_type ?? 'residential') === cat).length;

  const filteredDeals = deals
    .filter((d) => mapToCategory(d.property_type ?? 'residential') === activeCategory)
    .filter((d) => !search || getDealDisplayTitle(d).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return getDealDisplayTitle(a).localeCompare(getDealDisplayTitle(b));
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const activeDef = CATEGORIES.find((c) => c.type === activeCategory)!;

  // ── Start new property — show entry method choice first ──────────────────
  const handleAddProperty = () => {
    setShowEntryChoice(true);
    setShowWizard(false);
  };

  const handleChooseAnalysis = () => {
    reset();
    updateFormData({ propertyType: activeCategory });
    setShowEntryChoice(false);
    setShowWizard(true);
    setWizardOpenedFromChoice(true);
  };

  const handleChooseImport = () => {
    setShowEntryChoice(false);
    setShowUrlImport(true);
  };

  /** Called by UrlImportScreen when the store is seeded and the wizard should open */
  const handleImportReady = (_prefilledCount: number) => {
    setShowUrlImport(false);
    setShowWizard(true);
    setWizardOpenedFromChoice(true);
  };

  const handleWizardBack = () => {
    setShowWizard(false);
    if (wizardOpenedFromChoice) {
      setShowEntryChoice(true);
    }
    setWizardOpenedFromChoice(false);
  };

  const handleWizardDone = (dealId: string | null) => {
    setShowWizard(false);
    setShowEntryChoice(false);
    setShowUrlImport(false);
    setWizardOpenedFromChoice(false);
    if (dealId) {
      router.push(`/imoveis/${dealId}`);
      return;
    }
    load();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 gap-0">
      {/* ── Left sidebar — 3 category boxes ──────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#E2E0DA] bg-[#FAFAF8] p-3">
        {CATEGORIES.map((cat) => {
          const count = countByCategory(cat.type);
          const active = activeCategory === cat.type;
          const Icon = cat.icon;

          return (
            <button
              key={cat.type}
              onClick={() => {
                setActiveCategory(cat.type);
                setShowWizard(false);
                setShowEntryChoice(false);
                setShowUrlImport(false);
                setWizardOpenedFromChoice(false);
                setSearch('');
              }}
              className={`flex flex-col gap-2 border p-4 text-left transition-colors ${
                active
                  ? 'border-[#4A7C59] bg-[#EBF3EE]'
                  : 'border-[#E2E0DA] bg-[#F0EFEB] hover:border-[#D0CEC8]'
              }`}
            >
              {/* Top row: label + count */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    active ? 'text-[#4A7C59]' : 'text-[#1C2B20]'
                  }`}
                >
                  {cat.label}
                </span>
                <span
                  className={`font-mono text-lg font-black ${
                    active ? 'text-[#4A7C59]' : 'text-[#9CA3AF]'
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Sub-items */}
              <div className="space-y-1">
                <div
                  className={`flex items-center gap-2 text-xs ${
                    active ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'
                  }`}
                >
                  <Icon size={12} />
                  <span>Imóveis</span>
                </div>
              </div>
            </button>
          );
        })}
      </aside>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-[#F8F7F4]">
        {showUrlImport ? (
          /* ── URL import screen ──────────────────────────────────────────── */
          <div className="flex-1 p-8">
            <UrlImportScreen
              propertyType={activeCategory}
              onReady={handleImportReady}
              onSkip={() => {
                setShowUrlImport(false);
                setShowWizard(true);
              }}
              onBack={() => {
                setShowUrlImport(false);
                setShowEntryChoice(true);
              }}
            />
          </div>
        ) : showEntryChoice ? (
          /* ── Entry method choice ────────────────────────────────────────── */
          <div className="flex-1 p-8">
            <button
              onClick={() => setShowEntryChoice(false)}
              className="mb-6 flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
            >
              <ArrowLeft size={14} />
              Voltar para {activeDef.label}
            </button>

            <h2 className="mb-1 text-lg font-bold tracking-tight text-[#1C2B20]">
              Adicionar imóvel — {activeDef.label}
            </h2>
            <p className="mb-6 text-sm text-[#9CA3AF]">
              Escolha como deseja cadastrar este imóvel
            </p>

            <div className="grid grid-cols-1 gap-4 max-w-2xl sm:grid-cols-2">
              {/* Option A — Manual entry */}
              <button
                type="button"
                onClick={handleChooseAnalysis}
                className="group flex cursor-pointer flex-col gap-4 border border-[#E2E0DA] bg-[#FAFAF8] p-6 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#4A7C59] hover:bg-[#EBF3EE] hover:shadow-[0_4px_14px_rgba(74,124,89,0.12)] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-[#D6E4DB] bg-[#E5EFE8] text-[#4A7C59] transition-colors group-hover:border-[#4A7C59] group-hover:bg-[#4A7C59] group-hover:text-white">
                  <PencilLine size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C2B20]">Preencher manualmente</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                    Insira os dados do imóvel passo a passo: financiamento, receitas, despesas e
                    projeções. Ideal para imóveis fora de portais ou com informações personalizadas.
                  </p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#4A7C59]">
                  Começar preenchimento
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-150 ease-out group-hover:translate-x-1"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </button>

              {/* Option B — Import from URL */}
              <button
                type="button"
                onClick={handleChooseImport}
                className="group flex cursor-pointer flex-col gap-4 border border-[#E2E0DA] bg-[#FAFAF8] p-6 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#4A7C59] hover:bg-[#EBF3EE] hover:shadow-[0_4px_14px_rgba(74,124,89,0.12)] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-[#D6E4DB] bg-[#E5EFE8] text-[#4A7C59] transition-colors group-hover:border-[#4A7C59] group-hover:bg-[#4A7C59] group-hover:text-white">
                  <Link2 size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C2B20]">Importar de um link</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                    Cole o link de qualquer portal imobiliário brasileiro (ZAP, VivaReal,
                    QuintoAndar, ImovelWeb, OLX) e preencheremos os dados automaticamente. Você
                    poderá revisar tudo antes de salvar.
                  </p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#4A7C59]">
                  Colar link
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-150 ease-out group-hover:translate-x-1"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        ) : showWizard ? (
          /* ── Inline wizard ──────────────────────────────────────────────── */
          <div className="flex-1 p-8">
            <button
              onClick={handleWizardBack}
              className="mb-6 flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
            >
              <ArrowLeft size={14} />
              {wizardOpenedFromChoice ? 'Voltar' : `Voltar para ${activeDef.label}`}
            </button>
            <DealWizard benchmarks={benchmarks} onSaved={handleWizardDone} />
          </div>
        ) : (
          /* ── Property list view ─────────────────────────────────────────── */
          <div className="flex-1 p-8">
            {/* Page header */}
            <div className="mb-4">
              <h1 className="text-xl font-bold tracking-tight text-[#1C2B20]">{activeDef.label}</h1>
              <p className="mt-0.5 text-sm text-[#9CA3AF]">{activeDef.description}</p>
            </div>

            {/* Aggregate KPI header */}
            {!loading && deals.length > 0 && (
              <PortfolioHeader deals={deals} />
            )}

            {/* Toolbar */}
            <div className="mb-5 flex items-center gap-3 border-b border-[#E2E0DA] py-4">
              <div className="relative w-64">
                <Search
                  size={13}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar imóveis..."
                  className="w-full border border-[#E2E0DA] bg-[#F0EFEB] py-1.5 pr-3 pl-8 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59]"
                />
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#9CA3AF]">Ordenar:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                    className="border border-[#E2E0DA] bg-[#F0EFEB] px-2 py-1.5 font-mono text-xs text-[#6B7280] outline-none focus:border-[#4A7C59]"
                  >
                    <option value="date">Data</option>
                    <option value="name">Nome</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 animate-pulse bg-[#FAFAF8]" />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="py-16 text-center">
                <p className="font-mono text-sm text-[#DC2626]">{error}</p>
                <button
                  onClick={load}
                  className="mt-4 border border-[#E2E0DA] px-4 py-2 font-mono text-xs text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Property cards */}
            {!loading && !error && filteredDeals.length > 0 && (
              <div className="space-y-0">
                {filteredDeals.map((d) => (
                  <PropertyRow key={d.id} deal={d} onDelete={load} />
                ))}
              </div>
            )}

            {/* Add new property CTA — always visible at bottom like DealCheck */}
            {!loading && !error && (
              <button
                onClick={handleAddProperty}
                className="mt-0 flex w-full items-center gap-4 border border-dashed border-[#E2E0DA] bg-[#F8F7F4] p-5 text-left transition-colors hover:border-[#D0CEC8] hover:bg-[#FAFAF8]"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-[#E2E0DA] bg-[#F0EFEB]">
                  <Plus size={20} className="text-[#4A7C59]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C2B20]">
                    Adicionar novo imóvel — {activeDef.label}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    Clique para analisar um novo imóvel nesta categoria.
                  </p>
                </div>
                <Plus size={16} className="ml-auto text-[#D0CEC8]" />
              </button>
            )}

            {/* Empty state */}
            {!loading && !error && filteredDeals.length === 0 && !search && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-8xl font-bold tabular-nums text-[#E2E0DA]">0</span>
                <p className="mt-4 text-sm font-semibold text-[#1C2B20]">
                  Nenhum deal em &quot;{activeDef.label}&quot; ainda.
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  Clique em &quot;Adicionar imóvel&quot; para começar sua primeira análise.
                </p>
              </div>
            )}
            {!loading && !error && filteredDeals.length === 0 && search && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-8xl font-bold text-[#E2E0DA]">?</span>
                <p className="mt-4 text-sm font-semibold text-[#1C2B20]">
                  Nenhum resultado para &quot;{search}&quot;.
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 font-mono text-xs text-[#9CA3AF] underline transition-colors hover:text-[#6B7280]"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Portfolio header — aggregate KPIs across all deals ──────────────────────

function PortfolioHeader({ deals }: { deals: SavedDeal[] }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const totalValue = deals.reduce((sum, d) => sum + (d.inputs?.purchasePrice ?? d.price ?? 0), 0);
  const dealsWithMetrics = deals.filter((d) => d.results_cache?.metrics);
  const avgCashFlow =
    dealsWithMetrics.length > 0
      ? dealsWithMetrics.reduce((sum, d) => sum + (d.results_cache?.metrics?.monthlyCashFlow ?? 0), 0) /
        dealsWithMetrics.length
      : null;
  const avgCapRate =
    dealsWithMetrics.length > 0
      ? dealsWithMetrics.reduce((sum, d) => sum + (d.results_cache?.metrics?.capRate ?? 0), 0) /
        dealsWithMetrics.length
      : null;

  return (
    <div className="mb-5 grid grid-cols-3 gap-px border border-[#E2E0DA] bg-[#E2E0DA]">
      <div className="bg-[#FAFAF8] px-4 py-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
          Deals em análise
        </p>
        <p className="mt-1 font-mono text-xl font-bold text-[#1C2B20]">{deals.length}</p>
      </div>
      <div className="bg-[#FAFAF8] px-4 py-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
          Valor total
        </p>
        <p className="mt-1 font-mono text-xl font-bold text-[#1C2B20]">{fmt(totalValue)}</p>
      </div>
      <div className="bg-[#FAFAF8] px-4 py-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
          Fluxo médio / Cap Rate
        </p>
        {avgCashFlow != null ? (
          <p className="mt-1 font-mono text-xl font-bold text-[#1C2B20]">
            {fmt(avgCashFlow)}{' '}
            <span className="text-sm font-medium text-[#9CA3AF]">
              · {avgCapRate?.toFixed(1)}% cap
            </span>
          </p>
        ) : (
          <p className="mt-1 font-mono text-sm text-[#9CA3AF]">—</p>
        )}
      </div>
    </div>
  );
}

// ─── Property Row — denser DealCheck style ────────────────────────────────────

function PropertyRow({ deal, onDelete }: { deal: SavedDeal; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const m = deal.results_cache?.metrics;
  const positive = (m?.monthlyCashFlow ?? 0) >= 0;
  const displayTitle = getDealDisplayTitle(deal);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const handleDelete = async () => {
    if (!confirm('Remover esta análise?')) return;
    setDeleting(true);
    try {
      await deleteDeal(deal.id);
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  const updatedAt = new Date(deal.updated_at);
  const dateLabel = updatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div className="group flex items-center border border-[#E2E0DA] bg-[#FAFAF8] transition-colors hover:border-[#D0CEC8]">
      {/* Left: property info */}
      <a href={`/imoveis/${deal.id}`} className="flex min-w-0 flex-1 items-center gap-4 p-4">
        {/* Thumbnail placeholder */}
        <div className="flex h-14 w-16 shrink-0 items-center justify-center border border-[#E2E0DA] bg-[#F0EFEB]">
          <Home size={18} className="text-[#D0CEC8]" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-bold text-[#1C2B20]">{displayTitle}</p>
            <span className="shrink-0 font-mono text-[10px] text-[#9CA3AF]">{dateLabel}</span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">
            {deal.property_type
              ? (PROPERTY_TYPE_LABELS[deal.property_type as PropertyType] ?? deal.property_type)
              : (deal.type ?? '—')}
          </p>
          {/* KPI strip — analysis deal */}
          {m && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
              <span className={`font-semibold ${positive ? 'text-[#4A7C59]' : 'text-[#DC2626]'}`}>
                {fmt(m.monthlyCashFlow ?? 0)}/mês
              </span>
              <span className="text-[#9CA3AF]">{m.capRate?.toFixed(1)}% Cap</span>
              <span className="text-[#9CA3AF]">{m.cashOnCash?.toFixed(1)}% COC</span>
            </div>
          )}
          {/* Meta strip — listing-imported deal */}
          {!m && (deal.city || deal.neighborhood) && (
            <p className="mt-1.5 font-mono text-xs text-[#9CA3AF]">
              {[deal.neighborhood, deal.city, deal.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </a>

      {/* Right: price + actions */}
      <div className="flex shrink-0 items-center gap-4 border-l border-[#E2E0DA] px-5 py-4">
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-[#1C2B20]">
            {fmt(deal.inputs?.purchasePrice ?? deal.price ?? 0)}
          </p>
          <p className="font-mono text-[10px] text-[#9CA3AF]">
            {deal.inputs ? 'Preço de compra' : 'Valor'}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[#D0CEC8] transition-colors hover:text-[#DC2626] disabled:opacity-50"
          aria-label="Excluir"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m7 7 10 10M7 17 17 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
