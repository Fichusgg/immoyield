'use client';

import { Plus } from 'lucide-react';

export type DealType = 'rentals' | 'brrrrs' | 'flips' | 'wholesale';

const DEAL_TYPES: Array<{
  id: DealType;
  title: string;
  count: number;
  meta: string[];
}> = [
  { id: 'rentals', title: 'Aluguéis', count: 12, meta: ['Imóveis', 'Critérios de Compra'] },
  { id: 'brrrrs', title: 'BRRRRs', count: 3, meta: ['Imóveis', 'Critérios de Compra'] },
  { id: 'flips', title: 'Reforma e Venda', count: 2, meta: ['Imóveis', 'Critérios de Compra'] },
  { id: 'wholesale', title: 'Atacado', count: 0, meta: ['Imóveis', 'Critérios de Compra'] },
];

export function AddDealSidebar({
  activeType,
  onTypeChange,
}: {
  activeType: DealType;
  onTypeChange: (type: DealType) => void;
}) {
  return (
    <div className="space-y-3">
      {DEAL_TYPES.map((t) => {
        const active = t.id === activeType;
        return (
          <div
            key={t.id}
            className={[
              'rounded-2xl border bg-[#efefed] p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors',
              active ? 'border-blue-200 bg-white shadow-sm' : 'border-[#e5e5e3] hover:bg-white',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onTypeChange(t.id)}
                className="min-w-0 text-left"
              >
                <p className="truncate text-sm font-semibold text-[#F0EFEB]">{t.title}</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#737373]">
                  <span className="font-semibold text-[#F0EFEB]">{t.count}</span> Negócios
                </p>
              </button>

              <button
                type="button"
                onClick={() => onTypeChange(t.id)}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-[#e5e5e3] bg-white text-[#F0EFEB] hover:bg-[#f5f5f3]',
                ].join(' ')}
                aria-label={`Adicionar negócio: ${t.title}`}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {t.meta.map((m) => (
                <div key={m} className="rounded-xl border border-[#e5e5e3] bg-[#f5f5f3] px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#F0EFEB]">{m}</p>
                  <p className="mt-0.5 text-[10px] text-[#737373]">Ver</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
