'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Trash2, CheckCircle2, Home } from 'lucide-react';
import { ShareButton } from '@/components/share/ShareButton';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import type { SavedDeal } from '@/lib/supabase/deals';
import { brl, pct, area as fmtArea } from './format';
import { PROPERTY_NAV } from './sidebar-nav';
import { cn } from '@/lib/utils';

interface Props {
  deal: SavedDeal;
}

/**
 * Sticky property card + section nav, ~270px wide on desktop.
 * Uses usePathname() to highlight the active section.
 */
export function PropertySidebar({ deal }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  const propertyType = (deal.property_type as PropertyType) ?? 'residential';
  const typeLabel = PROPERTY_TYPE_LABELS[propertyType] ?? deal.property_type ?? 'Imóvel';
  const m = deal.results_cache?.metrics;
  const price = deal.inputs?.purchasePrice ?? deal.price ?? 0;
  const photo = deal.photos?.[0];

  const addressLine1 = deal.street ?? deal.title;
  const addressLine2 = [deal.neighborhood, deal.city, deal.state]
    .filter(Boolean)
    .join(', ');

  const specs = [
    deal.bedrooms != null ? `${deal.bedrooms} qtos` : null,
    deal.bathrooms != null ? `${deal.bathrooms} ban` : null,
    deal.area != null ? fmtArea(deal.area) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleDelete = async () => {
    if (!confirm(`Excluir "${deal.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('deals').delete().eq('id', deal.id);
      if (error) throw error;
      toast.success('Imóvel excluído');
      router.push('/propriedades');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      setDeleting(false);
    }
  };

  return (
    <aside className="h-full w-[270px] shrink-0 overflow-y-auto">
      <Link
        href="/propriedades"
        className="mb-3 flex items-center gap-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
      >
        <ArrowLeft size={12} />
        Ver todos os imóveis
      </Link>

      <div className="overflow-hidden border border-[#E2E0DA] bg-[#FAFAF8]">
        {/* ── Hero image ───────────────────────────────────────────────── */}
        <div className="relative h-36 bg-[#F0EFEB]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={deal.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Home size={36} className="text-[#D0CEC8]" />
            </div>
          )}

          {/* Top-left: status check */}
          <div className="absolute top-2 left-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4A7C59] text-white"
              aria-label="Imóvel ativo"
              title="Ativo"
            >
              <CheckCircle2 size={14} />
            </span>
          </div>

          {/* Top-right: share */}
          <div className="absolute top-2 right-2">
            <ShareButton dealId={deal.id} dealName={deal.title} compact />
          </div>

          {/* Bottom-center: status badges */}
          <div className="absolute right-2 bottom-2 left-2 flex items-center justify-center gap-1.5">
            <span className="bg-[#1C2B20]/85 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-white uppercase">
              {typeLabel}
            </span>
            <span className="bg-[#4A7C59] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-white uppercase">
              Ativo
            </span>
          </div>
        </div>

        {/* ── Title + dropdown caret ──────────────────────────────────── */}
        <div className="border-b border-[#E2E0DA] px-4 pt-4 pb-3">
          <button
            type="button"
            className="flex w-full items-start justify-between gap-2 text-left"
            aria-label="Trocar de imóvel"
            onClick={() => router.push('/propriedades')}
          >
            <h2 className="line-clamp-2 text-sm font-bold text-[#1C2B20]">{deal.title}</h2>
            <ChevronDown size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
          </button>

          {(addressLine1 || addressLine2) && (
            <div className="mt-2 space-y-0.5 text-xs leading-tight text-[#6B7280]">
              {addressLine1 && <p className="truncate">{addressLine1}</p>}
              {addressLine2 && <p className="truncate">{addressLine2}</p>}
            </div>
          )}

          {specs && (
            <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">{specs}</p>
          )}

          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-base font-bold text-[#1C2B20]">{brl(price)}</span>
            {m?.capRate != null && (
              <span className="font-mono text-xs font-semibold text-[#4A7C59]">
                {pct(m.capRate)} Cap
              </span>
            )}
          </div>
        </div>

        {/* ── Section nav ─────────────────────────────────────────────── */}
        <nav aria-label="Seções do imóvel">
          {PROPERTY_NAV.map((item, i) => {
            const href = `/imoveis/${deal.id}/${item.slug}`;
            const active = pathname === href;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.slug}>
                {item.group && (
                  <p className="px-4 pt-3 pb-1 text-[9px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
                    {item.group}
                  </p>
                )}
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 border-l-2 px-4 py-2.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-[#4A7C59] bg-[#EBF3EE] text-[#4A7C59]'
                      : 'border-transparent text-[#6B7280] hover:bg-[#F0EFEB] hover:text-[#1C2B20]',
                    !item.group && i === 0 ? 'mt-1' : ''
                  )}
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.comingSoon && (
                    <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide text-[#9CA3AF] uppercase">
                      Em Breve
                    </span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* ── Delete ──────────────────────────────────────────────────── */}
        <div className="border-t border-[#F0EFEB]">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEE2E2] disabled:opacity-50"
          >
            <Trash2 size={13} />
            {deleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </aside>
  );
}
