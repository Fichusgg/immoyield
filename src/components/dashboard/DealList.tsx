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
          <div className="space-y-px border border-[#27272a]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse bg-[#1a1a1a]" />
            ))}
          </div>
        </aside>
        <div className="grid flex-1 grid-cols-1 gap-px border border-[#27272a] bg-[#27272a] sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse bg-[#111111]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-[#f87171]">{error}</p>
        <button
          onClick={load}
          className="mt-4 border border-[#27272a] px-4 py-2 font-mono text-xs text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa]"
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
        <div className="border border-[#27272a] bg-[#111111]">
          {/* All */}
          <button
            onClick={() => setActiveCategory(CATEGORY_ALL)}
            className={`flex w-full items-center justify-between border-b border-[#27272a] px-4 py-3 text-left transition-colors ${
              activeCategory === CATEGORY_ALL
                ? 'border-l-2 border-l-[#22c55e] bg-[#052e16] text-[#22c55e]'
                : 'border-l-2 border-l-transparent text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-[#f4f4f5]'
            }`}
          >
            <span className="text-sm font-semibold">Todos</span>
            <span className={`font-mono px-2 py-0.5 text-[10px] font-bold ${
              activeCategory === CATEGORY_ALL
                ? 'bg-[#14532d] text-[#22c55e]'
                : 'bg-[#1a1a1a] text-[#52525b]'
            }`}>
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
                  !isLast ? 'border-b border-[#27272a]' : ''
                } ${
                  active
                    ? 'border-l-2 border-l-[#22c55e] bg-[#052e16]'
                    : 'border-l-2 border-l-transparent hover:bg-[#1a1a1a]'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold ${active ? 'text-[#22c55e]' : 'text-[#a1a1aa]'}`}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </p>
                  <p className={`font-mono text-[10px] ${active ? 'text-[#16a34a]' : 'text-[#52525b]'}`}>
                    {count} {count === 1 ? 'análise' : 'análises'}
                  </p>
                </div>
                {count > 0 && (
                  <span className={`font-mono px-2 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-[#14532d] text-[#22c55e]' : 'bg-[#1a1a1a] text-[#52525b]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Link
          href="/analisar"
          className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-[#27272a] py-3 font-mono text-xs font-semibold text-[#52525b] transition-colors hover:border-[#22c55e] hover:text-[#22c55e]"
        >
          <Plus size={12} />
          Novo imóvel
        </Link>
      </aside>

      {/* ── Deal grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-[#27272a] py-20 text-center">
            <p className="mb-1 text-sm text-[#52525b]">
              {activeCategory === CATEGORY_ALL
                ? 'Nenhuma análise salva ainda.'
                : `Nenhum imóvel do tipo "${PROPERTY_TYPE_LABELS[activeCategory as PropertyType]}" salvo.`}
            </p>
            <Link
              href="/analisar"
              className="mt-4 inline-block bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#16a34a]"
            >
              + Nova análise
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px border border-[#27272a] bg-[#27272a] sm:grid-cols-2">
            {filtered.map((d) => (
              <DealCard key={d.id} deal={d} onDelete={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
