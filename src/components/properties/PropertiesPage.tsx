'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SavedDeal, deleteDeal } from '@/lib/supabase/deals';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { useDealStore } from '@/store/useDealStore';
import DealWizard from '@/components/deals/DealWizard';
import DealCard from '@/components/dashboard/DealCard';
import {
  Home,
  CalendarDays,
  Wrench,
  Plus,
  Search,
  ArrowLeft,
} from 'lucide-react';

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
  const [showWizard, setShowWizard] = useState(false);

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

  // ── Derived data ──────────────────────────────────────────────────────────
  const countByCategory = (cat: Category) =>
    deals.filter((d) => mapToCategory(d.property_type) === cat).length;

  const filteredDeals = deals
    .filter((d) => mapToCategory(d.property_type) === activeCategory)
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const activeDef = CATEGORIES.find((c) => c.type === activeCategory)!;

  // ── Start new analysis in current category ────────────────────────────────
  const handleAddProperty = () => {
    reset();
    // Pre-set the property type so the wizard knows what category we're in
    updateFormData({ propertyType: activeCategory });
    setShowWizard(true);
  };

  const handleWizardDone = () => {
    setShowWizard(false);
    load(); // refresh list
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 gap-0">
      {/* ── Left sidebar — 3 category boxes ──────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#27272a] bg-[#111111] p-3">
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
                setSearch('');
              }}
              className={`flex flex-col gap-2 border p-4 text-left transition-colors ${
                active
                  ? 'border-[#22c55e] bg-[#052e16]'
                  : 'border-[#27272a] bg-[#1a1a1a] hover:border-[#3f3f46]'
              }`}
            >
              {/* Top row: label + count */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    active ? 'text-[#22c55e]' : 'text-[#f4f4f5]'
                  }`}
                >
                  {cat.label}
                </span>
                <span
                  className={`font-mono text-lg font-black ${
                    active ? 'text-[#22c55e]' : 'text-[#52525b]'
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Sub-items */}
              <div className="space-y-1">
                <div
                  className={`flex items-center gap-2 text-xs ${
                    active ? 'text-[#16a34a]' : 'text-[#52525b]'
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
      <div className="flex flex-1 flex-col overflow-y-auto bg-[#0a0a0a]">
        {showWizard ? (
          /* ── Inline wizard ──────────────────────────────────────────────── */
          <div className="flex-1 p-8">
            <button
              onClick={() => setShowWizard(false)}
              className="mb-6 flex items-center gap-1.5 text-sm text-[#52525b] transition-colors hover:text-[#a1a1aa]"
            >
              <ArrowLeft size={14} />
              Voltar para {activeDef.label}
            </button>
            <DealWizard benchmarks={benchmarks} onSaved={handleWizardDone} />
          </div>
        ) : (
          /* ── Property list view ─────────────────────────────────────────── */
          <div className="flex-1 p-8">
            {/* Page header */}
            <div className="mb-1">
              <h1 className="text-xl font-bold tracking-tight text-[#f4f4f5]">
                {activeDef.label}
              </h1>
              <p className="mt-0.5 text-sm text-[#52525b]">{activeDef.description}</p>
            </div>

            {/* Toolbar */}
            <div className="mb-5 flex items-center gap-3 border-b border-[#27272a] py-4">
              <div className="relative w-64">
                <Search
                  size={13}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#52525b]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar imóveis..."
                  className="w-full border border-[#27272a] bg-[#1a1a1a] py-1.5 pl-8 pr-3 text-sm text-[#f4f4f5] placeholder:text-[#52525b] outline-none focus:border-[#22c55e]"
                />
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#52525b]">Ordenar:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                    className="border border-[#27272a] bg-[#1a1a1a] px-2 py-1.5 font-mono text-xs text-[#a1a1aa] outline-none focus:border-[#22c55e]"
                  >
                    <option value="date">Data</option>
                    <option value="name">Nome</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 gap-px border border-[#27272a] bg-[#27272a] sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 animate-pulse bg-[#111111]" />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="py-16 text-center">
                <p className="font-mono text-sm text-[#f87171]">{error}</p>
                <button
                  onClick={load}
                  className="mt-4 border border-[#27272a] px-4 py-2 font-mono text-xs text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa]"
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
                className="mt-0 flex w-full items-center gap-4 border border-dashed border-[#27272a] bg-[#0a0a0a] p-5 text-left transition-colors hover:border-[#3f3f46] hover:bg-[#111111]"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-[#27272a] bg-[#1a1a1a]">
                  <Plus size={20} className="text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f4f4f5]">
                    Adicionar novo imóvel — {activeDef.label}
                  </p>
                  <p className="text-xs text-[#52525b]">
                    Clique para analisar um novo imóvel nesta categoria.
                  </p>
                </div>
                <Plus size={16} className="ml-auto text-[#3f3f46]" />
              </button>
            )}

            {/* Empty state */}
            {!loading && !error && filteredDeals.length === 0 && !search && (
              <div className="mt-4 text-center">
                <p className="text-sm text-[#52525b]">
                  Nenhum imóvel em "{activeDef.label}" ainda.
                </p>
              </div>
            )}
            {!loading && !error && filteredDeals.length === 0 && search && (
              <div className="mt-4 text-center">
                <p className="text-sm text-[#52525b]">
                  Nenhum resultado para "{search}".
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Property Row — DealCheck style (horizontal card with KPIs on right) ─────

function PropertyRow({ deal, onDelete }: { deal: SavedDeal; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const m = deal.results_cache?.metrics;
  const positive = (m?.monthlyCashFlow ?? 0) >= 0;

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

  return (
    <div className="group flex items-center border border-[#27272a] bg-[#111111] transition-colors hover:border-[#3f3f46]">
      {/* Left: property info */}
      <a
        href={`/imoveis/${deal.id}`}
        className="flex min-w-0 flex-1 items-center gap-4 p-4"
      >
        {/* Thumbnail placeholder */}
        <div className="flex h-16 w-20 shrink-0 items-center justify-center border border-[#27272a] bg-[#1a1a1a]">
          <Home size={20} className="text-[#3f3f46]" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#f4f4f5]">{deal.name}</p>
          <p className="mt-0.5 font-mono text-xs text-[#52525b]">
            {PROPERTY_TYPE_LABELS[deal.property_type as PropertyType] ?? deal.property_type}
          </p>
          {/* KPI strip */}
          {m && (
            <div className="mt-1.5 flex items-center gap-3 font-mono text-xs">
              <span className={positive ? 'text-[#22c55e]' : 'text-[#f87171]'}>
                {fmt(m.monthlyCashFlow ?? 0)}/mês
              </span>
              <span className="text-[#52525b]">
                {m.capRate?.toFixed(1)}% Cap Rate
              </span>
              <span className="text-[#52525b]">
                {m.cashOnCash?.toFixed(1)}% COC
              </span>
            </div>
          )}
        </div>
      </a>

      {/* Right: price + actions */}
      <div className="flex shrink-0 items-center gap-4 border-l border-[#27272a] px-5 py-4">
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-[#22c55e]">
            {fmt(deal.inputs?.purchasePrice ?? 0)}
          </p>
          <p className="font-mono text-[10px] text-[#52525b]">Preço de compra</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[#3f3f46] transition-colors hover:text-[#f87171] disabled:opacity-50"
          aria-label="Excluir"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 7 10 10M7 17 17 7"/></svg>
        </button>
      </div>
    </div>
  );
}
