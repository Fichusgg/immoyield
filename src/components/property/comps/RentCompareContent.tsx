'use client';

/**
 * RentCompare — automated rental comp discovery and market-rent recommendation.
 *
 * Replaces the contents of /imoveis/[id]/comps-aluguel for the rentals mode.
 * The page is the single user-facing entry point for the Rent Compare feature
 * described in the deal analyzer spec:
 *   - Pulls subject from SavedDeal (city/bairro/quartos/area/type)
 *   - Calls /api/rent-compare to fetch listings (Vivareal + Quinto Andar)
 *   - Runs filter+score+summary client-side so tolerances are live-editable
 *   - Lets the user manually exclude bad comps with one click and recalc
 *   - Persists the analysis snapshot to deals.comps so reload restores state
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Check,
  ExternalLink,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X as XIcon,
  TrendingUp,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal, RentalComp } from '@/lib/supabase/deals';
import {
  analyzeRentComps,
  deriveSubject,
  rentalCompToListing,
  listingToRentalComp,
  DEFAULT_FILTERS,
} from '@/lib/rent-compare';
import { analyzeRentalDeal } from '@/lib/calculations/rental';
import { calculateProjections } from '@/lib/calculations/projections';
import type { ExcludedListing, ExclusionReason, RentalListing } from '@/lib/rent-compare/types';
import type { RentalAnalysisFilters } from '@/lib/supabase/deals';
import { PageHeader } from '../PageHeader';
import { SectionHeading } from '../SectionHeading';
import { FormCard } from '../FormCard';
import { brl, num } from '../format';
import { patchDeal } from '../save-deal';
import { AddCompDialog } from './AddCompDialog';
import { fromCommon, type CompCommon } from './helpers';

interface Props {
  deal: SavedDeal;
}

interface ApiResponse {
  ok: boolean;
  listings: RentalListing[];
  sources: string[];
  perSource: { source: string; count: number; error?: string; searchUrl?: string }[];
  cacheHit: boolean;
  fetchedAt: string;
  message?: string;
  error?: string;
}

type SortKey = 'rent' | 'area' | 'pricePerM2' | 'date' | 'status';
type SortDir = 'asc' | 'desc';

export function RentCompareContent({ deal }: Props) {
  const router = useRouter();

  const subjectInfo = React.useMemo(() => deriveSubject(deal), [deal]);
  const subject = subjectInfo.subject;

  // Hydrate listings from the saved deal: convert RentalComp[] → RentalListing[]
  // so the same client logic works for both auto-imported and manual entries.
  const initialListings = React.useMemo<RentalListing[]>(() => {
    const stored = deal.comps?.rentals ?? [];
    return stored.map((c) => rentalCompToListing(c)).filter((l): l is RentalListing => l != null);
  }, [deal.comps?.rentals]);

  const [listings, setListings] = React.useState<RentalListing[]>(initialListings);

  const [filters, setFilters] = React.useState<RentalAnalysisFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...(deal.comps?.rentalAnalysis?.filters ?? {}),
  }));
  const [excludedIds, setExcludedIds] = React.useState<string[]>(
    deal.comps?.rentalAnalysis?.excludedIds ?? []
  );
  const [forceIncludedIds, setForceIncludedIds] = React.useState<string[]>(
    deal.comps?.rentalAnalysis?.forceIncludedIds ?? []
  );
  const [sources, setSources] = React.useState<string[]>(deal.comps?.rentalAnalysis?.sources ?? []);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<string | null>(
    deal.comps?.rentalAnalysis?.runAt ?? null
  );
  const [lastResponse, setLastResponse] = React.useState<ApiResponse | null>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);

  const [sortKey, setSortKey] = React.useState<SortKey>('pricePerM2');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [excludedOpen, setExcludedOpen] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CompCommon | null>(null);

  // ── Live analysis ──────────────────────────────────────────────────────────
  const analysis = React.useMemo(() => {
    if (!subject) return null;
    return analyzeRentComps({
      subject,
      listings,
      filters,
      excludedIds,
      forceIncludedIds,
    });
  }, [subject, listings, filters, excludedIds, forceIncludedIds]);

  const userExcluded = React.useMemo(
    () => listings.filter((l) => excludedIds.includes(l.id)),
    [listings, excludedIds]
  );

  // ── Sort kept comps for table display (declared before any early return
  //     so React Hook rules are honoured) ──────────────────────────────────
  const kept = analysis?.filterResult.kept ?? [];
  const sortedKept = React.useMemo(() => {
    const arr = [...kept];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'rent':
          return (a.monthlyRent - b.monthlyRent) * dir;
        case 'area':
          return ((a.area ?? 0) - (b.area ?? 0)) * dir;
        case 'pricePerM2':
          return (
            ((a.area ? a.monthlyRent / a.area : 0) - (b.area ? b.monthlyRent / b.area : 0)) * dir
          );
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'date': {
          const da = a.leasedAt ?? a.listedAt ?? a.scrapedAt;
          const db = b.leasedAt ?? b.listedAt ?? b.scrapedAt;
          return da.localeCompare(db) * dir;
        }
      }
    });
    return arr;
    // kept is recomputed every render from analysis; including analysis as
    // the dep is what we actually want here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, sortKey, sortDir]);

  // ── Search action ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!subject) return;
    setSearching(true);
    try {
      const res = await fetch('/api/rent-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: subject.city,
          neighborhood: subject.neighborhood,
          state: subject.state,
          bedrooms: subject.bedrooms,
          bucket: subject.bucket,
        }),
      });

      const data = (await res.json()) as ApiResponse;
      setLastResponse(data);
      if (!res.ok || !data.ok) {
        if (data.error === 'SCRAPER_QUOTA_EXHAUSTED') {
          // Long-lived toast — this is a billing issue, not a transient error.
          toast.error(data.message ?? 'Cota de busca esgotada', {
            description: 'Atualize o plano do ScraperAPI ou aguarde a renovação.',
            duration: 10000,
          });
          return;
        }
        throw new Error(data.message ?? 'Falha na busca');
      }

      // Merge with existing listings: keep manual entries (source 'manual'),
      // replace auto-imported ones with the fresh batch.
      const manualPrev = listings.filter((l) => l.source === 'manual');
      const nextListings = [...manualPrev, ...data.listings];
      // Reset exclusions when sources change — old excluded ids may not exist now.
      const nextExcluded = excludedIds.filter((id) => nextListings.some((l) => l.id === id));
      const nextForced = forceIncludedIds.filter((id) => nextListings.some((l) => l.id === id));

      setListings(nextListings);
      setSources(data.sources);
      setLastFetchedAt(data.fetchedAt);
      setExcludedIds(nextExcluded);
      setForceIncludedIds(nextForced);

      // Auto-persist so reopening the tab restores the comps without re-scraping.
      if (subject) {
        try {
          const a = analyzeRentComps({
            subject,
            listings: nextListings,
            filters,
            excludedIds: nextExcluded,
            forceIncludedIds: nextForced,
          });
          const rentals: RentalComp[] = nextListings.map(listingToRentalComp);
          await patchDeal(deal.id, {
            comps: {
              sales: deal.comps?.sales ?? [],
              rentals,
              rentalAnalysis: {
                runAt: data.fetchedAt,
                sources: data.sources,
                cacheHit: data.cacheHit,
                suggestedRent: a.score.suggestedRent,
                iqrLow: a.score.iqrLow,
                iqrHigh: a.score.iqrHigh,
                pricePerM2Median: a.score.pricePerM2Median,
                confidence: a.score.confidence,
                confidenceReason: a.score.confidenceReason,
                summary: a.summary,
                excludedIds: nextExcluded,
                forceIncludedIds: nextForced,
                filters,
                relaxationLog: a.filterResult.relaxationLog,
              },
            },
          });
        } catch (persistErr) {
          // Surface only in console — user can still save manually if this fails.
          console.warn('Falha ao persistir Rent Compare:', persistErr);
        }
      }

      if (data.listings.length === 0) {
        toast.info('Nenhum comparável encontrado nas fontes disponíveis.');
      } else {
        toast.success(
          `${data.listings.length} anúncios encontrados em ${data.sources.length} fonte${data.sources.length === 1 ? '' : 's'}.`
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na busca');
    } finally {
      setSearching(false);
    }
  };

  // ── Manual exclude / restore ───────────────────────────────────────────────
  const exclude = (id: string) => {
    setExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setForceIncludedIds((prev) => prev.filter((x) => x !== id));
  };
  const restore = (id: string) => {
    setExcludedIds((prev) => prev.filter((x) => x !== id));
  };

  // ── Force-include a filter-rejected comp ──────────────────────────────────
  const forceInclude = (id: string) => {
    setForceIncludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExcludedIds((prev) => prev.filter((x) => x !== id));
  };
  const removeForceInclude = (id: string) => {
    setForceIncludedIds((prev) => prev.filter((x) => x !== id));
  };

  // ── Manual add (fallback path) ─────────────────────────────────────────────
  const handleSaveManualComp = (comp: CompCommon) => {
    const rentalComp: RentalComp = fromCommon(comp, 'rentals') as RentalComp;
    rentalComp.source = 'manual';
    rentalComp.status = 'active';
    rentalComp.neighborhood = subject?.neighborhood;
    rentalComp.city = subject?.city;
    const listing = rentalCompToListing(rentalComp);
    if (!listing) return;

    setListings((prev) => {
      const idx = prev.findIndex((l) => l.id === listing.id);
      if (idx === -1) return [...prev, listing];
      const next = [...prev];
      next[idx] = listing;
      return next;
    });
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remover permanentemente este comparável?')) return;
    setListings((prev) => prev.filter((l) => l.id !== id));
    setExcludedIds((prev) => prev.filter((x) => x !== id));
  };

  // ── Persist ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const rentals: RentalComp[] = listings.map(listingToRentalComp);
      await patchDeal(deal.id, {
        comps: {
          sales: deal.comps?.sales ?? [],
          rentals,
          rentalAnalysis: {
            runAt: lastFetchedAt ?? new Date().toISOString(),
            sources,
            cacheHit: false,
            suggestedRent: analysis.score.suggestedRent,
            iqrLow: analysis.score.iqrLow,
            iqrHigh: analysis.score.iqrHigh,
            pricePerM2Median: analysis.score.pricePerM2Median,
            confidence: analysis.score.confidence,
            confidenceReason: analysis.score.confidenceReason,
            summary: analysis.summary,
            excludedIds,
            forceIncludedIds,
            filters,
            relaxationLog: analysis.filterResult.relaxationLog,
          },
        },
      });
      toast.success('Análise salva');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyAsRent = async () => {
    if (!analysis || !deal.inputs) return;
    setSaving(true);
    try {
      const nextInputs = {
        ...deal.inputs,
        revenue: {
          ...deal.inputs.revenue,
          monthlyRent: analysis.score.suggestedRent,
        },
      };
      const nextAnalysis = analyzeRentalDeal(nextInputs);
      const projections = calculateProjections(
        nextInputs,
        nextInputs.projections?.holdPeriodYears ?? 10,
        nextInputs.projections?.appreciationRate ?? 0.05
      );
      await patchDeal(deal.id, {
        inputs: nextInputs,
        results_cache: { ...nextAnalysis, projections },
      });
      toast.success(
        `Aluguel atualizado para ${brl(analysis.score.suggestedRent)}/mês. Análise recalculada.`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aplicar');
    } finally {
      setSaving(false);
    }
  };

  // ── Empty subject ─────────────────────────────────────────────────────────
  if (!subject) {
    const have = {
      cidade: deal.city ?? deal.inputs?.property?.address?.city ?? '—',
      bairro: deal.neighborhood ?? deal.inputs?.property?.address?.neighborhood ?? '—',
      quartos: deal.bedrooms ?? deal.inputs?.property?.bedrooms ?? '—',
      área: deal.area ?? deal.inputs?.property?.squareFootage ?? '—',
    };
    return (
      <>
        <PageHeader
          title="Rent Compare"
          breadcrumb={[
            { label: 'Imóveis', href: '/propriedades' },
            { label: deal.title, href: `/imoveis/${deal.id}/analise` },
            { label: 'Comparáveis de Aluguel' },
          ]}
        />
        <FormCard className="p-6">
          <p className="text-sm text-[#1C2B20]">
            Para buscar comparáveis estes campos do imóvel precisam estar preenchidos:
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-xs">
            {(['cidade', 'bairro', 'quartos', 'área'] as const).map((k) => {
              const isMissing = subjectInfo.missing.includes(k);
              return (
                <li
                  key={k}
                  className={`flex items-center gap-2 ${
                    isMissing ? 'text-[#DC2626]' : 'text-[#6B7280]'
                  }`}
                >
                  <span className="inline-block w-3 text-center">{isMissing ? '✗' : '✓'}</span>
                  <span className="w-20 capitalize">{k}:</span>
                  <span className="text-[#1C2B20]">{String(have[k])}</span>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/imoveis/${deal.id}/descricao`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Editar dados do imóvel
          </Link>
        </FormCard>
      </>
    );
  }

  const score = analysis?.score;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const confidenceTone =
    score?.confidence === 'alta'
      ? 'bg-[#EBF3EE] text-[#4A7C59] border-[#A8C5B2]'
      : score?.confidence === 'media'
        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]'
        : 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]';

  return (
    <>
      <PageHeader
        title="Rent Compare"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Comparáveis de Aluguel' },
        ]}
        helper="Aluguel de mercado baseado em anúncios ativos e aluguéis fechados recentemente em portais brasileiros."
        actions={
          <>
            <Link
              href={`/imoveis/${deal.id}/analise`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <BarChart2 size={12} />
              Análise
            </Link>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
            >
              <Search size={12} />
              {searching ? 'Buscando…' : listings.length === 0 ? 'Buscar Comparáveis' : 'Atualizar'}
            </button>
          </>
        }
      />

      {/* ── Subject summary ──────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#E2E0DA] pb-3">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
          Imóvel em análise
        </span>
        <span className="text-sm font-semibold text-[#1C2B20]">
          {subject.bucket === 'house' ? 'Casa' : 'Apartamento'} · {subject.bedrooms}Q
          {subject.bathrooms != null ? `/${subject.bathrooms}B` : ''} · {num(subject.area)} m² ·{' '}
          {subject.neighborhood}, {subject.city}
          {subject.state ? `/${subject.state}` : ''}
        </span>
        {lastFetchedAt &&
          (() => {
            const ageDays = (Date.now() - new Date(lastFetchedAt).getTime()) / 86_400_000;
            const stale = ageDays > 7;
            return (
              <span
                className={`ml-auto font-mono text-[10px] ${
                  stale ? 'text-[#B45309]' : 'text-[#6B7480]'
                }`}
              >
                Última busca:{' '}
                {new Date(lastFetchedAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {sources.length > 0 && ` · ${sources.join(', ')}`}
                {stale && ' · resultados desatualizados, considere atualizar'}
              </span>
            );
          })()}
      </div>

      {/* ── Hero recommendation ──────────────────────────────────────────── */}
      {score && score.count > 0 && (
        <>
          <div className="mb-3 grid grid-cols-1 gap-0 border border-[#E2E0DA] bg-[#FAFAF8] lg:grid-cols-[1.4fr_1fr]">
            {/* Left: hero suggested rent */}
            <div className="flex flex-col justify-between gap-5 border-b border-[#E2E0DA] bg-[#EBF3EE] p-6 lg:border-r lg:border-b-0">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#4A7C59] uppercase">
                  Aluguel sugerido de mercado
                </p>
                <p className="mt-1.5 font-mono text-[40px] leading-none font-bold tracking-tight text-[#1C2B20]">
                  {brl(score.suggestedRent)}
                  <span className="ml-1 text-base font-medium text-[#6B7480]">/mês</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${confidenceTone}`}
                  >
                    Confiança {score.confidence}
                  </span>
                  <span className="font-mono text-[11px] text-[#6B7280]">
                    {score.count} comp{score.count === 1 ? '' : 's'} · mediana ponderada
                  </span>
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#3F4A45]">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-[#4A7C59]" />
                  <p>{analysis?.summary}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyAsRent}
                disabled={saving || !deal.inputs}
                className="inline-flex w-full items-center justify-center gap-1.5 bg-[#4A7C59] px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#3D6B4F] disabled:opacity-60 sm:w-auto sm:self-start"
              >
                <Check size={12} />
                Aplicar como aluguel
              </button>
            </div>

            {/* Right: supporting stats */}
            <div className="grid grid-cols-2 gap-px bg-[#E2E0DA]">
              <StatCell
                label="Faixa de mercado"
                value={`${brl(score.iqrLow)} – ${brl(score.iqrHigh)}`}
                sub="Percentil 25 – 75"
              />
              <StatCell
                label="Mediana R$/m²"
                value={brl(score.pricePerM2Median)}
                sub={`× ${num(subject.area)} m² do imóvel`}
              />
              <StatCell
                label="Comparáveis usados"
                value={String(score.count)}
                sub={`${userExcluded.length} excluído${userExcluded.length === 1 ? '' : 's'}`}
              />
              <StatCell
                label="Confiança"
                value={score.confidence.toUpperCase()}
                sub={score.confidenceReason}
              />
            </div>
          </div>

          {analysis && analysis.filterResult.relaxationLog.length > 0 && (
            <div className="mb-4 border border-[#FCD34D] bg-[#FEF3C7] px-4 py-2.5">
              <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-[#92400E] uppercase">
                Filtros relaxados
              </p>
              <ul className="space-y-0.5 text-xs text-[#92400E]">
                {analysis.filterResult.relaxationLog.map((entry, i) => (
                  <li key={i}>· {entry}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── Filter controls ──────────────────────────────────────────────── */}
      <details className="mb-5 border border-[#E2E0DA] bg-[#FAFAF8] [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-[10px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase transition-colors select-none hover:bg-[#F0EFEB]">
          <span className="flex items-center gap-2">
            Filtros
            <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-[#6B7480]">
              {filters.scope === 'bairro' ? 'Bairro' : 'Cidade'} · ±
              {Math.round(filters.areaTolerancePct * 100)}% área ·{' '}
              {filters.bedroomTolerance === 0
                ? 'mesmo nº quartos'
                : `±${filters.bedroomTolerance}Q`}{' '}
              · ±{filters.bathTolerance}B · ±{filters.yearTolerance}a
            </span>
          </span>
          <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#E2E0DA] p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScopeRadio
              value={filters.scope}
              onChange={(scope) => setFilters((f) => ({ ...f, scope }))}
            />
            <ToleranceSlider
              label={`Tolerância de área: ±${Math.round(filters.areaTolerancePct * 100)}%`}
              value={filters.areaTolerancePct}
              min={0.1}
              max={0.4}
              step={0.05}
              onChange={(v) => setFilters((f) => ({ ...f, areaTolerancePct: v }))}
            />
            <ToleranceSlider
              label={
                filters.bedroomTolerance === 0
                  ? `Quartos: exato (${subject.bedrooms}Q)`
                  : `Tolerância de quartos: ±${filters.bedroomTolerance}`
              }
              value={filters.bedroomTolerance}
              min={0}
              max={2}
              step={1}
              onChange={(v) => setFilters((f) => ({ ...f, bedroomTolerance: Math.round(v) }))}
            />
            <ToleranceSlider
              label={`Tolerância de banheiros: ±${filters.bathTolerance}`}
              value={filters.bathTolerance}
              min={0}
              max={2}
              step={1}
              onChange={(v) => setFilters((f) => ({ ...f, bathTolerance: Math.round(v) }))}
            />
            <ToleranceSlider
              label={`Tolerância de ano: ±${filters.yearTolerance}`}
              value={filters.yearTolerance}
              min={5}
              max={30}
              step={5}
              onChange={(v) => setFilters((f) => ({ ...f, yearTolerance: Math.round(v) }))}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#F0EFEB] pt-3">
            <ToggleCheck
              label="Excluir mobiliados"
              checked={filters.excludeFurnished}
              onChange={(v) => setFilters((f) => ({ ...f, excludeFurnished: v }))}
            />
            <ToggleCheck
              label="Excluir temporada / Airbnb"
              checked={filters.excludeShortTerm}
              onChange={(v) => setFilters((f) => ({ ...f, excludeShortTerm: v }))}
            />
            <ToggleCheck
              label="Casar faixa de preço (±15%)"
              checked={filters.priceBandMatch}
              onChange={(v) => setFilters((f) => ({ ...f, priceBandMatch: v }))}
            />
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#1C2B20]"
            >
              <RotateCcw size={11} />
              Restaurar padrão
            </button>
          </div>
        </div>
      </details>

      {/* ── Comp table ───────────────────────────────────────────────────── */}
      <SectionHeading
        label={`Comparáveis usados na análise (${kept.length})`}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setAddDialogOpen(true);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[#6B7280] uppercase hover:text-[#4A7C59]"
          >
            <Plus size={10} />
            Adicionar manual
          </button>
        }
      />

      {searching ? (
        <SearchProgress />
      ) : listings.length === 0 ? (
        <FormCard className="mb-5 border-dashed">
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center border border-[#D6E4DB] bg-[#E5EFE8] text-[#4A7C59]">
              <Search size={20} />
            </div>
            <p className="text-base font-bold text-[#1C2B20]">
              Encontre comparáveis automaticamente
            </p>
            <p className="max-w-md text-sm text-[#6B7280]">
              Vamos buscar anúncios ativos e aluguéis fechados recentemente em portais brasileiros
              para imóveis parecidos com o seu.
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="mt-2 inline-flex items-center gap-1.5 bg-[#4A7C59] px-5 py-2 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
            >
              <Search size={12} />
              Buscar comparáveis
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setAddDialogOpen(true);
              }}
              className="text-xs text-[#6B7480] underline transition-colors hover:text-[#6B7280]"
            >
              ou adicionar manualmente
            </button>
          </div>
        </FormCard>
      ) : kept.length === 0 ? (
        <FormCard className="mb-5 border-dashed py-10 text-center">
          <p className="text-sm text-[#6B7280]">
            Nenhum comparável atende aos filtros atuais. Tente expandir o escopo para a cidade
            inteira ou aumentar as tolerâncias.
          </p>
        </FormCard>
      ) : (
        <FormCard className="mb-5 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E0DA] bg-[#F0EFEB] text-[10px] font-semibold tracking-wider text-[#6B7480] uppercase">
                  <th className="px-4 py-2.5 text-left">Endereço</th>
                  <SortHeader
                    label="Aluguel"
                    align="right"
                    active={sortKey === 'rent'}
                    dir={sortDir}
                    onClick={() => toggleSort('rent')}
                  />
                  <SortHeader
                    label="Área"
                    align="right"
                    active={sortKey === 'area'}
                    dir={sortDir}
                    onClick={() => toggleSort('area')}
                  />
                  <SortHeader
                    label="R$/m²"
                    align="right"
                    active={sortKey === 'pricePerM2'}
                    dir={sortDir}
                    onClick={() => toggleSort('pricePerM2')}
                  />
                  <th className="px-3 py-2.5 text-center">Q/B</th>
                  <SortHeader
                    label="Status"
                    align="left"
                    active={sortKey === 'status'}
                    dir={sortDir}
                    onClick={() => toggleSort('status')}
                  />
                  <SortHeader
                    label="Data"
                    align="left"
                    active={sortKey === 'date'}
                    dir={sortDir}
                    onClick={() => toggleSort('date')}
                  />
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* Subject row at top for visual comparison */}
                <tr className="border-b border-[#E2E0DA] bg-[#FAFAF8] text-[#1C2B20]">
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold tracking-wider text-[#4A7C59] uppercase">
                      Seu imóvel
                    </span>
                    <p className="line-clamp-1 max-w-[240px] text-[11px]">
                      {subject.neighborhood}, {subject.city}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-[#6B7480]">
                    {deal.inputs?.revenue?.monthlyRent ? brl(deal.inputs.revenue.monthlyRent) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                    {num(subject.area)} m²
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-[#6B7480]">
                    {deal.inputs?.revenue?.monthlyRent
                      ? brl(deal.inputs.revenue.monthlyRent / subject.area)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                    {subject.bedrooms}/{subject.bathrooms ?? '–'}
                  </td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-4 py-2.5"></td>
                </tr>

                {sortedKept.map((l) => {
                  const ppm = l.area && l.area > 0 ? l.monthlyRent / l.area : 0;
                  const dateLabel = l.leasedAt ?? l.listedAt;
                  const isManual = l.source === 'manual';
                  const isForced = forceIncludedIds.includes(l.id);
                  return (
                    <tr key={l.id} className="border-b border-[#F0EFEB] last:border-0">
                      <td className="px-4 py-3 text-[#1C2B20]">
                        <div className="flex items-center gap-1.5">
                          <span className="line-clamp-2 max-w-[260px]">
                            {l.street ?? l.neighborhood ?? l.city ?? '—'}
                          </span>
                          {l.url && (
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Abrir anúncio"
                              className="text-[#6B7480] transition-colors hover:text-[#4A7C59]"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                          {isForced && (
                            <span
                              title="Incluído manualmente apesar dos filtros"
                              className="rounded bg-[#EBF3EE] px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide text-[#4A7C59] uppercase"
                            >
                              Forçado
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 max-w-[260px] text-[10px] text-[#6B7480]">
                          {isManual ? 'manual' : l.source}
                          {l.condoFee ? ` · cond. ${brl(l.condoFee)}` : ''}
                          {l.isFurnished ? ' · mobiliado' : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#1C2B20] tabular-nums">
                        {brl(l.monthlyRent)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#6B7280] tabular-nums">
                        {l.area ? `${num(l.area)} m²` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-[#4A7C59] tabular-nums">
                        {ppm > 0 ? brl(ppm) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-[#6B7280] tabular-nums">
                        {l.bedrooms ?? '–'} / {l.bathrooms ?? '–'}
                      </td>
                      <td className="px-3 py-3 font-mono text-[#6B7280]">
                        {l.status === 'leased' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3EE] px-2 py-0.5 text-[10px] font-semibold text-[#4A7C59]">
                            <TrendingUp size={9} />
                            Fechado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EFEB] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[10px] text-[#6B7480]">
                        {dateLabel
                          ? new Date(dateLabel).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          {isManual && (
                            <button
                              type="button"
                              aria-label="Editar"
                              onClick={() => {
                                setEditing({
                                  id: l.id,
                                  address: l.street,
                                  squareMeters: l.area ?? 0,
                                  bedrooms: l.bedrooms,
                                  bathrooms: l.bathrooms,
                                  sourceUrl: l.url,
                                  primaryValue: l.monthlyRent,
                                  date: l.listedAt?.slice(0, 10),
                                });
                                setAddDialogOpen(true);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-[#6B7480] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20]"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Excluir do cálculo"
                            onClick={() => exclude(l.id)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#6B7480] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                          >
                            <XIcon size={11} />
                          </button>
                          {isManual && (
                            <button
                              type="button"
                              aria-label="Remover"
                              onClick={() => handleDelete(l.id)}
                              className="flex h-6 w-6 items-center justify-center rounded text-[#6B7480] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </FormCard>
      )}

      {/* ── Excluded section ─────────────────────────────────────────────── */}
      {userExcluded.length > 0 && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setExcludedOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-2.5 text-left transition-colors hover:bg-[#F0EFEB]"
          >
            <span className="text-xs font-semibold text-[#1C2B20]">
              Excluídos manualmente ({userExcluded.length})
            </span>
            {excludedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {excludedOpen && (
            <FormCard className="mt-1 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {userExcluded.map((l) => {
                      const ppm = l.area && l.area > 0 ? l.monthlyRent / l.area : 0;
                      return (
                        <tr
                          key={l.id}
                          className="border-b border-[#F0EFEB] opacity-60 last:border-0"
                        >
                          <td className="px-4 py-2.5 text-[#1C2B20]">
                            <div className="flex items-center gap-1.5">
                              <span className="line-clamp-1 max-w-[260px]">
                                {l.street ?? l.neighborhood ?? '—'}
                              </span>
                              {l.url && (
                                <a
                                  href={l.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#6B7480]"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[#6B7280]">
                            {brl(l.monthlyRent)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[#6B7280]">
                            {l.area ? `${num(l.area)} m²` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[#6B7280]">
                            {ppm > 0 ? brl(ppm) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => restore(l.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#A8C5B2] bg-[#EBF3EE] px-2.5 py-1 text-[10px] font-semibold text-[#4A7C59] transition-colors hover:bg-[#A8C5B2]"
                            >
                              <RotateCcw size={10} />
                              Restaurar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </FormCard>
          )}
        </div>
      )}

      {/* ── Rejected by filters ───────────────────────────────────────────── */}
      <RejectedSection
        excluded={analysis?.filterResult.excluded ?? []}
        forceIncludedIds={forceIncludedIds}
        onInclude={forceInclude}
        onUninclude={removeForceInclude}
      />

      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      {analysis && score && score.count > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-5 py-3 shadow-md">
          <p className="text-xs text-[#6B7280]">
            <span className="font-semibold text-[#1C2B20]">
              {score.count} comparáve{score.count === 1 ? 'l' : 'is'} ativos
            </span>
            {userExcluded.length > 0 && ` · ${userExcluded.length} excluídos`}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4A7C59] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar análise'}
          </button>
        </div>
      )}

      <AddCompDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        mode="rentals"
        initial={editing}
        onSave={handleSaveManualComp}
      />

      {/* ── Developer panel ──────────────────────────────────────────────── */}
      {(lastResponse || listings.length > 0) && (
        <details
          open={debugOpen}
          onToggle={(e) => setDebugOpen((e.target as HTMLDetailsElement).open)}
          className="mt-8 border border-[#E2E0DA] bg-[#FAFAF8] text-xs"
        >
          <summary className="cursor-pointer px-4 py-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase select-none hover:text-[#1C2B20]">
            Developer · per-source telemetry
          </summary>
          <div className="border-t border-[#E2E0DA] p-4 font-mono text-[11px] leading-relaxed">
            <p className="mb-2 text-[#6B7480]">
              Subject:{' '}
              <span className="text-[#1C2B20]">
                {subject.bucket} · {subject.bedrooms}Q · {subject.area}m² · {subject.neighborhood} /{' '}
                {subject.city}
                {subject.state ? `/${subject.state}` : ''}
              </span>
            </p>
            <p className="mb-3 text-[#6B7480]">
              Pipeline:{' '}
              <span className="text-[#1C2B20]">
                {listings.length} listings → {kept.length} kept · {userExcluded.length}{' '}
                user-excluded · {analysis ? analysis.filterResult.excluded.length : 0}{' '}
                filter-rejected
              </span>
            </p>
            {analysis && analysis.filterResult.excluded.length > 0 && (
              <details className="mb-3">
                <summary className="cursor-pointer text-[#6B7280]">
                  Rejection reasons ({analysis.filterResult.excluded.length})
                </summary>
                <ul className="mt-1 ml-4 space-y-0.5">
                  {Object.entries(
                    analysis.filterResult.excluded.reduce(
                      (acc, e) => {
                        acc[e.reason] = (acc[e.reason] ?? 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    )
                  ).map(([reason, count]) => (
                    <li key={reason} className="text-[#1C2B20]">
                      <span className="text-[#6B7480]">{reason}:</span> {count}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {lastResponse && (
              <>
                <p className="mb-1 text-[#6B7480]">Last API response:</p>
                <ul className="mb-3 space-y-1">
                  <li>
                    cacheHit:{' '}
                    <span className="text-[#1C2B20]">{String(lastResponse.cacheHit)}</span>
                  </li>
                  <li>
                    fetchedAt: <span className="text-[#1C2B20]">{lastResponse.fetchedAt}</span>
                  </li>
                  <li>
                    sources:{' '}
                    <span className="text-[#1C2B20]">{lastResponse.sources.join(', ') || '∅'}</span>
                  </li>
                </ul>
                <p className="mb-1 text-[#6B7480]">Per-source breakdown:</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E0DA] text-left text-[#6B7480]">
                      <th className="py-1 pr-3">source</th>
                      <th className="py-1 pr-3 text-right">count</th>
                      <th className="py-1 pr-3">error</th>
                      <th className="py-1">searchUrl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResponse.perSource.map((p) => (
                      <tr key={p.source} className="border-b border-[#F0EFEB] last:border-0">
                        <td className="py-1 pr-3 text-[#1C2B20]">{p.source}</td>
                        <td className="py-1 pr-3 text-right text-[#1C2B20]">{p.count}</td>
                        <td className="py-1 pr-3 text-[#DC2626]">{p.error ?? '—'}</td>
                        <td className="truncate py-1 text-[#6B7280]" title={p.searchUrl}>
                          {p.searchUrl ? (
                            <a
                              href={p.searchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-[#4A7C59]"
                            >
                              {p.searchUrl.length > 80
                                ? p.searchUrl.slice(0, 80) + '…'
                                : p.searchUrl}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p className="mt-3 text-[#6B7480]">
              Direct debug curl:{' '}
              <code className="rounded bg-[#F0EFEB] px-1 py-0.5 text-[10px]">
                GET /api/rent-compare/debug?city={encodeURIComponent(subject.city)}&neighborhood=
                {encodeURIComponent(subject.neighborhood)}&state={subject.state ?? ''}&bedrooms=
                {subject.bedrooms}&bucket={subject.bucket}
              </code>
            </p>
          </div>
        </details>
      )}
    </>
  );
}

// ── Inline UI helpers ────────────────────────────────────────────────────────

function SortHeader({
  label,
  align,
  active,
  dir,
  onClick,
}: {
  label: string;
  align: 'left' | 'right';
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      className={`cursor-pointer px-3 py-2.5 ${
        align === 'right' ? 'text-right' : 'text-left'
      } select-none`}
      onClick={onClick}
    >
      <span className={`inline-flex items-center gap-1 ${active ? 'text-[#4A7C59]' : ''}`}>
        {label}
        {active && (dir === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />)}
      </span>
    </th>
  );
}

function ScopeRadio({
  value,
  onChange,
}: {
  value: 'bairro' | 'cidade';
  onChange: (v: 'bairro' | 'cidade') => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
        Escopo geográfico
      </p>
      <div className="inline-flex rounded-full border border-[#E2E0DA] bg-[#FAFAF8] p-0.5 text-xs">
        {(['bairro', 'cidade'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              value === opt ? 'bg-[#4A7C59] text-white' : 'text-[#6B7280] hover:text-[#1C2B20]'
            }`}
          >
            {opt === 'bairro' ? 'Mesmo bairro' : 'Cidade inteira'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToleranceSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
        {label}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#4A7C59]"
      />
    </div>
  );
}

const REASON_LABELS: Record<ExclusionReason, string> = {
  'bucket-mismatch': 'Tipo diferente',
  'bedrooms-mismatch': 'Quartos diferentes',
  'bathrooms-out-of-range': 'Banheiros fora da tolerância',
  'area-out-of-range': 'Área fora da tolerância',
  'year-out-of-range': 'Ano fora da tolerância',
  furnished: 'Mobiliado',
  'short-term': 'Temporada / Airbnb',
  'rent-outlier': 'Aluguel atípico',
  'price-band-mismatch': 'Faixa de preço diferente',
  'wrong-bairro': 'Outro bairro',
  'wrong-city': 'Outra cidade',
  'missing-rent': 'Sem aluguel',
  'missing-area': 'Sem área',
};

const HIDDEN_REASONS: ExclusionReason[] = ['missing-rent', 'missing-area'];

function RejectedSection({
  excluded,
  forceIncludedIds,
  onInclude,
  onUninclude,
}: {
  excluded: ExcludedListing[];
  forceIncludedIds: string[];
  onInclude: (id: string) => void;
  onUninclude: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reasonFilter, setReasonFilter] = React.useState<ExclusionReason | 'todos'>('todos');

  const visible = React.useMemo(
    () => excluded.filter((e) => !HIDDEN_REASONS.includes(e.reason)),
    [excluded]
  );
  const reasonCounts = React.useMemo(() => {
    const counts: Partial<Record<ExclusionReason, number>> = {};
    for (const e of visible) {
      counts[e.reason] = (counts[e.reason] ?? 0) + 1;
    }
    return counts;
  }, [visible]);

  const filtered = React.useMemo(
    () => (reasonFilter === 'todos' ? visible : visible.filter((e) => e.reason === reasonFilter)),
    [visible, reasonFilter]
  );

  if (visible.length === 0 && forceIncludedIds.length === 0) return null;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-2.5 text-left transition-colors hover:bg-[#F0EFEB]"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#1C2B20]">
          Rejeitados pelos filtros ({visible.length})
          {forceIncludedIds.length > 0 && (
            <span className="rounded bg-[#EBF3EE] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#4A7C59] uppercase">
              {forceIncludedIds.length} incluído{forceIncludedIds.length === 1 ? '' : 's'}{' '}
              manualmente
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-1 border border-[#E2E0DA] bg-[#FAFAF8]">
          {/* Reason filter chips */}
          {Object.keys(reasonCounts).length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E0DA] px-3 py-2">
              <ReasonChip
                label={`Todos (${visible.length})`}
                active={reasonFilter === 'todos'}
                onClick={() => setReasonFilter('todos')}
              />
              {(Object.entries(reasonCounts) as [ExclusionReason, number][]).map(([r, count]) => (
                <ReasonChip
                  key={r}
                  label={`${REASON_LABELS[r]} (${count})`}
                  active={reasonFilter === r}
                  onClick={() => setReasonFilter(r)}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[#6B7480]">
              Nenhum item para este filtro.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0EFEB]">
              {filtered.map(({ listing: l, reason, detail }) => {
                const ppm = l.area && l.area > 0 ? l.monthlyRent / l.area : 0;
                const forced = forceIncludedIds.includes(l.id);
                return (
                  <li
                    key={l.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
                      forced ? '' : 'opacity-80'
                    }`}
                  >
                    {/* Address + reason */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="line-clamp-1 max-w-[280px] text-xs font-semibold text-[#1C2B20]">
                          {l.street ?? l.neighborhood ?? l.city ?? '—'}
                        </span>
                        {l.url && (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Abrir anúncio"
                            className="text-[#6B7480] transition-colors hover:text-[#4A7C59]"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#92400E] uppercase">
                          {REASON_LABELS[reason]}
                        </span>
                        <span className="font-mono text-[10px] text-[#6B7480]">{detail}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 items-center gap-4 font-mono text-xs text-[#6B7280] tabular-nums">
                      <span>
                        <span className="text-[#1C2B20]">{brl(l.monthlyRent)}</span>
                        {l.area ? <span className="text-[#6B7480]"> / {num(l.area)}m²</span> : ''}
                      </span>
                      {ppm > 0 && <span className="text-[#4A7C59]">{brl(ppm)}/m²</span>}
                      <span className="text-[#6B7480]">
                        {l.bedrooms ?? '–'}Q / {l.bathrooms ?? '–'}B
                      </span>
                    </div>

                    {/* Action */}
                    {forced ? (
                      <button
                        type="button"
                        onClick={() => onUninclude(l.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#A8C5B2] bg-[#EBF3EE] px-2.5 py-1 text-[10px] font-semibold text-[#4A7C59] transition-colors hover:bg-[#A8C5B2]"
                      >
                        <XIcon size={10} />
                        Remover inclusão
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onInclude(l.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D0CEC8] bg-[#FAFAF8] px-2.5 py-1 text-[10px] font-semibold text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
                      >
                        <Plus size={10} />
                        Incluir mesmo assim
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ReasonChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
        active
          ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
          : 'border-[#D0CEC8] bg-[#FAFAF8] text-[#6B7280] hover:border-[#4A7C59] hover:text-[#4A7C59]'
      }`}
    >
      {label}
    </button>
  );
}

function SearchProgress() {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const tick = () => setElapsed((Date.now() - startedAt) / 1000);
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, []);

  // Asymptotic progress: ramps fast, plateaus near 90%.
  const tau = 4.5;
  const target = 90 * (1 - Math.exp(-elapsed / tau));
  const progress = Math.min(99, target + (elapsed > 12 ? 2 : 0));

  // Step timeline (seconds → label).
  const STEPS: { at: number; label: string; portal?: string }[] = [
    { at: 0.0, label: 'Conectando aos portais imobiliários' },
    { at: 1.2, label: 'Buscando anúncios', portal: 'VivaReal' },
    { at: 3.5, label: 'Buscando anúncios', portal: 'QuintoAndar' },
    { at: 6.0, label: 'Filtrando por similaridade ao seu imóvel' },
    { at: 8.5, label: 'Calculando mediana e faixa de mercado' },
  ];

  const activeIdx = STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="mb-5 border border-[#E2E0DA] bg-[#FAFAF8] p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A8C5B2] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#4A7C59]" />
        </span>
        <p className="text-sm font-bold text-[#1C2B20]">Buscando comparáveis de aluguel…</p>
        <span className="ml-auto font-mono text-xs text-[#6B7480] tabular-nums">
          {Math.floor(elapsed)}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden bg-[#F0EFEB]">
        <div
          className="h-full bg-[#4A7C59] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-[#6B7480] tabular-nums">
        <span>{Math.round(progress)}%</span>
        <span>geralmente leva 5–15 segundos</span>
      </div>

      {/* Step list */}
      <ul className="mt-5 space-y-2.5">
        {STEPS.map((s, i) => {
          const status = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
          return (
            <li
              key={i}
              className={`flex items-center gap-2.5 text-xs transition-opacity ${
                status === 'pending' ? 'text-[#6B7480] opacity-60' : 'text-[#1C2B20]'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  status === 'done'
                    ? 'border-[#4A7C59] bg-[#4A7C59] text-white'
                    : status === 'active'
                      ? 'border-[#4A7C59] bg-white text-[#4A7C59]'
                      : 'border-[#D0CEC8] bg-[#F0EFEB] text-[#6B7480]'
                }`}
                aria-hidden
              >
                {status === 'done' ? (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : status === 'active' ? (
                  <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A7C59]" />
                ) : null}
              </span>
              <span className={status === 'done' ? 'line-through decoration-[#A8C5B2]' : ''}>
                {s.label}
                {s.portal && (
                  <span className="ml-1.5 rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#4A7C59] uppercase">
                    {s.portal}
                  </span>
                )}
              </span>
              {status === 'active' && (
                <span className="ml-1 inline-flex gap-0.5">
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-1 w-1 animate-bounce rounded-full bg-[#4A7C59]"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#FAFAF8] p-4">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg leading-tight font-bold tracking-tight text-[#1C2B20]">
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] leading-snug text-[#6B7280]">{sub}</p>}
    </div>
  );
}

function ToggleCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#1C2B20]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#4A7C59]"
      />
      {label}
    </label>
  );
}
