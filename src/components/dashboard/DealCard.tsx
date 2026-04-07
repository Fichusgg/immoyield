'use client';

import { SavedDeal, deleteDeal } from '@/lib/supabase/deals';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { ShareButton } from '@/components/share/ShareButton';
import { useState } from 'react';
import Link from 'next/link';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

interface DealCardProps {
  deal: SavedDeal;
  onDelete: () => void;
}

export default function DealCard({ deal, onDelete }: DealCardProps) {
  const [deleting, setDeleting] = useState(false);
  const m = deal.results_cache?.metrics;
  const positive = (m?.monthlyCashFlow ?? 0) >= 0;

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
    <div className="group relative flex flex-col gap-3 border border-[#27272a] bg-[#111111] p-5 transition-colors hover:border-[#3f3f46]">
      <Link
        href={`/imoveis/${deal.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Ver análise: ${deal.name}`}
      />
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#f4f4f5]">{deal.name}</p>
          {deal.property_type && (
            <span className="mt-0.5 inline-block border border-[#27272a] bg-[#1a1a1a] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
              {PROPERTY_TYPE_LABELS[deal.property_type as PropertyType] ?? deal.property_type}
            </span>
          )}
          <p className="mt-0.5 font-mono text-xs text-[#52525b]">
            {new Date(deal.updated_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative z-20">
            <ShareButton dealId={deal.id} dealName={deal.name} compact />
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Excluir análise"
            className="relative z-20 text-[#52525b] transition-colors hover:text-[#f87171] disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-[#27272a] bg-[#1a1a1a] p-3">
          <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
            Cap Rate
          </p>
          <p className="font-mono font-black text-[#f4f4f5]">{m?.capRate?.toFixed(2)}%</p>
        </div>
        <div className={`border p-3 ${positive ? 'border-[#14532d] bg-[#052e16]' : 'border-[#7f1d1d] bg-[#450a0a]'}`}>
          <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
            Fluxo/mês
          </p>
          <p className={`flex items-center gap-1 font-mono font-black ${positive ? 'text-[#22c55e]' : 'text-[#f87171]'}`}>
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {fmt(m?.monthlyCashFlow ?? 0)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-[#27272a] pt-2 font-mono text-xs text-[#52525b]">
        <span>{fmt(deal.inputs?.purchasePrice ?? 0)}</span>
        <span>{deal.inputs?.financing?.enabled ? deal.inputs.financing.system : 'À vista'}</span>
      </div>
    </div>
  );
}
