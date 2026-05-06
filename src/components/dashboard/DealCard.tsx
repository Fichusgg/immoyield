'use client';

import { SavedDeal, deleteDeal } from '@/lib/supabase/deals';
import { ImageOff, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { ShareButton } from '@/components/share/ShareButton';
import { useState } from 'react';
import Link from 'next/link';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { getDealDisplayTitle } from '@/lib/deals/display';

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
  const displayTitle = getDealDisplayTitle(deal);
  const photo = deal.photos?.[0];

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
    <div className="group relative flex flex-col border border-[#E2E0DA] bg-[#FAFAF8] transition-colors hover:border-[#D0CEC8]">
      <Link
        href={`/imoveis/${deal.id}`}
        className="absolute inset-0 z-10"
        aria-label={`Ver análise: ${displayTitle}`}
      />
      {/* Photo */}
      <div className="relative h-32 w-full overflow-hidden bg-[#F0EFEB]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#D0CEC8]">
            <ImageOff size={28} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#1C2B20]">{displayTitle}</p>
            {deal.property_type && (
              <span className="mt-0.5 inline-block border border-[#E2E0DA] bg-[#F0EFEB] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                {PROPERTY_TYPE_LABELS[deal.property_type as PropertyType] ?? deal.property_type}
              </span>
            )}
            <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">
              {new Date(deal.updated_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative z-20">
              <ShareButton dealId={deal.id} dealName={displayTitle} compact />
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Excluir análise"
              className="relative z-20 text-[#9CA3AF] transition-colors hover:text-[#DC2626] disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border border-[#E2E0DA] bg-[#F0EFEB] p-3">
            <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Cap Rate
            </p>
            <p className="font-mono font-black text-[#1C2B20]">{m?.capRate?.toFixed(2)}%</p>
          </div>
          <div
            className={`border p-3 ${positive ? 'border-[#A8C5B2] bg-[#EBF3EE]' : 'border-[#FECACA] bg-[#FEF2F2]'}`}
          >
            <p className="mb-1 font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
              Fluxo/mês
            </p>
            <p
              className={`flex items-center gap-1 font-mono font-black ${positive ? 'text-[#4A7C59]' : 'text-[#DC2626]'}`}
            >
              {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {fmt(m?.monthlyCashFlow ?? 0)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-[#E2E0DA] pt-2 font-mono text-xs text-[#9CA3AF]">
          <span>{fmt(deal.inputs?.purchasePrice ?? deal.price ?? 0)}</span>
          <span>
            {deal.inputs?.financing?.enabled
              ? deal.inputs.financing.system
              : deal.inputs
                ? 'À vista'
                : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
