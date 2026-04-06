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
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-[#e5e5e3] bg-white p-5 transition-shadow hover:shadow-md">
      <Link
        href={`/imoveis/${deal.id}`}
        className="absolute inset-0 z-10 rounded-2xl"
        aria-label={`Ver análise: ${deal.name}`}
      />
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900">{deal.name}</p>
          {deal.property_type && (
            <span className="mt-0.5 inline-block rounded-full bg-[#f5f5f3] px-2 py-0.5 text-[9px] font-bold tracking-widest text-[#737373] uppercase">
              {PROPERTY_TYPE_LABELS[deal.property_type as PropertyType] ?? deal.property_type}
            </span>
          )}
          <p className="mt-0.5 text-xs text-slate-400">
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
            className="relative z-20 text-slate-300 transition-colors hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
            Cap Rate
          </p>
          <p className="font-black text-slate-900">{m?.capRate?.toFixed(2)}%</p>
        </div>
        <div className={`rounded-xl p-3 ${positive ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className="mb-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
            Fluxo/mês
          </p>
          <p
            className={`flex items-center gap-1 font-black ${positive ? 'text-emerald-700' : 'text-red-600'}`}
          >
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {fmt(m?.monthlyCashFlow ?? 0)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-slate-50 pt-2 text-xs text-slate-400">
        <span>{fmt(deal.inputs?.purchasePrice ?? 0)}</span>
        <span>{deal.inputs?.financing?.enabled ? deal.inputs.financing.system : 'À vista'}</span>
      </div>
    </div>
  );
}
