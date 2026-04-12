'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SavedDeal } from '@/lib/supabase/deals';
import DealCard from './DealCard';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PROPERTY_TYPE_LABELS, PropertyType, PROPERTY_TYPES } from '@/lib/validations/deal';
import { Plus, Search } from 'lucide-react';
import { getDealDisplayTitle } from '@/lib/deals/display';

const PROPERTY_DESCRIPTIONS: Record<PropertyType, string> = {
  residential: 'Imóveis para aluguel de longo prazo e geração de renda passiva.',
  airbnb: 'Locação de curta temporada para maximizar rendimento por diária.',
  flip: 'Compra, reforma e venda para lucro no curto prazo.',
  multifamily: 'Edifícios com múltiplas unidades para escala na renda.',
  commercial: 'Imóveis comerciais com contratos de longo prazo.',
};

export default function DealList() {
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo') as PropertyType | null;
  const activeType = tipoParam && PROPERTY_TYPES.includes(tipoParam) ? tipoParam : null;

  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');

  const load = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Você precisa estar logado.');

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(`Erro ao carregar: ${error.message}`);
      setDeals((data ?? []) as SavedDeal[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar análises.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = deals
    .filter((d) => !activeType || d.property_type === activeType)
    .filter((d) => !search || getDealDisplayTitle(d).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return getDealDisplayTitle(a).localeCompare(getDealDisplayTitle(b));
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const title = activeType ? PROPERTY_TYPE_LABELS[activeType] : 'Todos os Imóveis';
  const description = activeType
    ? PROPERTY_DESCRIPTIONS[activeType]
    : 'Todas as análises salvas na sua conta.';

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse bg-[#F0EFEB]" />
        <div className="mb-6 flex gap-3 border-b border-[#E2E0DA] pb-4">
          <div className="h-8 w-64 animate-pulse bg-[#F0EFEB]" />
          <div className="ml-auto h-8 w-32 animate-pulse bg-[#F0EFEB]" />
        </div>
        <div className="grid grid-cols-1 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse bg-[#FAFAF8]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-[#DC2626]">{error}</p>
        <button
          onClick={load}
          className="mt-4 border border-[#E2E0DA] px-4 py-2 font-mono text-xs text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C2B20]">{title}</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">{description}</p>
        </div>
        <Link
          href={activeType ? `/analisar?tipo=${activeType}` : '/analisar'}
          className="flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          <Plus size={14} />
          Novo imóvel
        </Link>
      </div>

      {/* ── Filter toolbar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-3 border-b border-[#E2E0DA] pb-4">
        <div className="relative w-64">
          <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar imóveis..."
            className="w-full border border-[#E2E0DA] bg-[#F0EFEB] py-1.5 pr-3 pl-8 text-sm text-[#1C2B20] outline-none placeholder:text-[#9CA3AF] focus:border-[#4A7C59]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-[#9CA3AF]">Ordenar por:</span>
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

      {/* ── Deal grid ──────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-[#E2E0DA] py-20 text-center">
          <p className="mb-1 text-sm text-[#9CA3AF]">
            {activeType
              ? `Nenhum imóvel do tipo "${PROPERTY_TYPE_LABELS[activeType]}" salvo.`
              : search
                ? `Nenhum resultado para "${search}".`
                : 'Nenhuma análise salva ainda.'}
          </p>
          <Link
            href={activeType ? `/analisar?tipo=${activeType}` : '/analisar'}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#4A7C59] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            <Plus size={14} />
            Nova análise
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:grid-cols-2">
          {filtered.map((d) => (
            <DealCard key={d.id} deal={d} onDelete={load} />
          ))}
        </div>
      )}
    </div>
  );
}
