'use client';

import { useEffect, useState } from 'react';
import { SavedDeal } from '@/lib/supabase/deals';
import DealCard from './DealCard';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PROPERTY_TYPE_LABELS, PropertyType, PROPERTY_TYPES } from '@/lib/validations/deal';
import { Plus } from 'lucide-react';

const CATEGORY_ALL = 'all';
type Category = PropertyType | typeof CATEGORY_ALL;

export default function DealList() {
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>(CATEGORY_ALL);

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

  const countByType = (type: PropertyType) => deals.filter((d) => d.property_type === type).length;

  const filtered =
    activeCategory === CATEGORY_ALL
      ? deals
      : deals.filter((d) => d.property_type === activeCategory);

  if (loading) {
    return (
      <div className="flex gap-6">
        <aside className="w-52 shrink-0">
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[#e5e5e3]" />
            ))}
          </div>
        </aside>
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-[#e5e5e3] bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={load}
          className="mt-4 text-xs text-[#737373] underline hover:text-[#1a1a1a]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Category sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0">
        <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          {/* All */}
          <button
            onClick={() => setActiveCategory(CATEGORY_ALL)}
            className={`flex w-full items-center justify-between border-b border-[#e5e5e3] px-4 py-3 text-left transition-colors ${
              activeCategory === CATEGORY_ALL
                ? 'bg-[#1a1a1a] text-white'
                : 'text-[#1a1a1a] hover:bg-[#f5f5f3]'
            }`}
          >
            <span className="text-sm font-semibold">Todos</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeCategory === CATEGORY_ALL
                  ? 'bg-white/20 text-white'
                  : 'bg-[#f5f5f3] text-[#737373]'
              }`}
            >
              {deals.length}
            </span>
          </button>

          {/* Per type */}
          {PROPERTY_TYPES.map((type, i) => {
            const count = countByType(type);
            const active = activeCategory === type;
            const isLast = i === PROPERTY_TYPES.length - 1;
            return (
              <button
                key={type}
                onClick={() => setActiveCategory(type)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                  !isLast ? 'border-b border-[#e5e5e3]' : ''
                } ${
                  active
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1a1a1a]'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">{PROPERTY_TYPE_LABELS[type]}</p>
                  <p className={`text-[10px] ${active ? 'text-white/60' : 'text-[#a3a3a1]'}`}>
                    {count} {count === 1 ? 'análise' : 'análises'}
                  </p>
                </div>
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#f5f5f3] text-[#737373]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Link
          href="/analisar"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#e5e5e3] py-3 text-xs font-semibold text-[#737373] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
        >
          <Plus size={12} />
          Novo imóvel
        </Link>
      </aside>

      {/* ── Deal grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e5e5e3] py-20 text-center">
            <p className="mb-1 text-sm text-[#737373]">
              {activeCategory === CATEGORY_ALL
                ? 'Nenhuma análise salva ainda.'
                : `Nenhum imóvel do tipo "${PROPERTY_TYPE_LABELS[activeCategory as PropertyType]}" salvo.`}
            </p>
            <Link
              href="/analisar"
              className="mt-4 inline-block rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              + Nova análise
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((d) => (
              <DealCard key={d.id} deal={d} onDelete={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
