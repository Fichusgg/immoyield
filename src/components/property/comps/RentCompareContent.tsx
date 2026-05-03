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
  ArrowDownToLine,
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
import type { RentalListing } from '@/lib/rent-compare/types';
import type { RentalAnalysisFilters } from '@/lib/supabase/deals';
import { PageHeader } from '../PageHeader';
import { SectionHeading } from '../SectionHeading';
import { FormCard } from '../FormCard';
import { KpiCard } from '../KpiCard';
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
    return stored
      .map((c) => rentalCompToListing(c))
      .filter((l): l is RentalListing => l != null);
  }, [deal.comps?.rentals]);

  const [listings, setListings] = React.useState<RentalListing[]>(initialListings);

  const [filters, setFilters] = React.useState<RentalAnalysisFilters>(
    deal.comps?.rentalAnalysis?.filters ?? DEFAULT_FILTERS,
  );
  const [excludedIds, setExcludedIds] = React.useState<string[]>(
    deal.comps?.rentalAnalysis?.excludedIds ?? [],
  );
  const [sources, setSources] = React.useState<string[]>(
    deal.comps?.rentalAnalysis?.sources ?? [],
  );
  const [lastFetchedAt, setLastFetchedAt] = React.useState<string | null>(
    deal.comps?.rentalAnalysis?.runAt ?? null,
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
    });
  }, [subject, listings, filters, excludedIds]);

  const userExcluded = React.useMemo(
    () => listings.filter((l) => excludedIds.includes(l.id)),
    [listings, excludedIds],
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
            ((a.area ? a.monthlyRent / a.area : 0) -
              (b.area ? b.monthlyRent / b.area : 0)) *
            dir
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
      setListings((prev) => {
        const manual = prev.filter((l) => l.source === 'manual');
        return [...manual, ...data.listings];
      });
      setSources(data.sources);
      setLastFetchedAt(data.fetchedAt);
      // Reset exclusions when sources change — old excluded ids may not exist now.
      setExcludedIds((prev) => prev.filter((id) => data.listings.some((l) => l.id === id)));

      if (data.listings.length === 0) {
        toast.info('Nenhum comparável encontrado nas fontes disponíveis.');
      } else {
        toast.success(
          `${data.listings.length} anúncios encontrados em ${data.sources.length} fonte${data.sources.length === 1 ? '' : 's'}.`,
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
  };
  const restore = (id: string) => {
    setExcludedIds((prev) => prev.filter((x) => x !== id));
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
      await patchDeal(deal.id, { inputs: nextInputs });
      toast.success(`Aluguel atualizado para ${brl(analysis.score.suggestedRent)}/mês`);
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
      quartos:
        deal.bedrooms ?? deal.inputs?.property?.bedrooms ?? '—',
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
            Para buscar comparáveis estes campos do imóvel precisam estar
            preenchidos:
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
                  <span className="inline-block w-3 text-center">
                    {isMissing ? '✗' : '✓'}
                  </span>
                  <span className="w-20 capitalize">{k}:</span>
                  <span className="text-[#1C2B20]">
                    {String(have[k])}
                  </span>
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
      <FormCard className="mb-5 p-4">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
          Imóvel em análise
        </p>
        <p className="mt-1 text-sm font-semibold text-[#1C2B20]">
          {subject.bucket === 'house' ? 'Casa' : 'Apartamento'} · {subject.bedrooms}Q
          {subject.bathrooms != null ? `/${subject.bathrooms}B` : ''} · {num(subject.area)} m²
          {' · '}
          {subject.neighborhood}, {subject.city}
          {subject.state ? `/${subject.state}` : ''}
        </p>
        {lastFetchedAt && (
          <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">
            Última busca:{' '}
            {new Date(lastFetchedAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {sources.length > 0 && ` · ${sources.join(', ')}`}
          </p>
        )}
      </FormCard>

      {/* ── Recommendation panel ─────────────────────────────────────────── */}
      {score && score.count > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Aluguel sugerido"
              value={brl(score.suggestedRent)}
              sub={`mediana ponderada · ${score.count} comp${score.count === 1 ? '' : 's'}`}
              tone="positive"
            />
            <KpiCard
              label="Faixa de mercado"
              value={`${brl(score.iqrLow)} – ${brl(score.iqrHigh)}`}
              sub="P25 – P75"
            />
            <KpiCard
              label="Mediana R$/m²"
              value={brl(score.pricePerM2Median)}
              sub={`× ${num(subject.area)} m² do imóvel`}
            />
            <KpiCard
              label="Confiança"
              value={score.confidence.toUpperCase()}
              sub={score.confidenceReason}
              tone={
                score.confidence === 'alta'
                  ? 'positive'
                  : score.confidence === 'baixa'
                  ? 'negative'
                  : 'neutral'
              }
            />
          </div>

          <div
            className={`mb-5 flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between ${confidenceTone}`}
          >
            <div className="flex items-start gap-2.5">
              <Sparkles size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">{analysis?.summary}</p>
            </div>
            <button
              type="button"
              onClick={handleApplyAsRent}
              disabled={saving || !deal.inputs}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#4A7C59] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
            >
              <ArrowDownToLine size={12} />
              Aplicar como aluguel
            </button>
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
      <FormCard className="mb-5 p-4">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
          Filtros
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ScopeRadio
            value={filters.scope}
            onChange={(scope) => setFilters((f) => ({ ...f, scope }))}
          />
          <ToleranceSlider
            label={`Tolerância de área: ±${Math.round(filters.areaTolerancePct * 100)}%`}
            value={filters.areaTolerancePct}
            min={0.10}
            max={0.40}
            step={0.05}
            onChange={(v) => setFilters((f) => ({ ...f, areaTolerancePct: v }))}
          />
          <ToleranceSlider
            label={`Tolerância de banheiros: ±${filters.bathTolerance}`}
            value={filters.bathTolerance}
            min={0}
            max={2}
            step={1}
            onChange={(v) =>
              setFilters((f) => ({ ...f, bathTolerance: Math.round(v) }))
            }
          />
          <ToleranceSlider
            label={`Tolerância de ano: ±${filters.yearTolerance}`}
            value={filters.yearTolerance}
            min={5}
            max={30}
            step={5}
            onChange={(v) =>
              setFilters((f) => ({ ...f, yearTolerance: Math.round(v) }))
            }
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
      </FormCard>

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

      {listings.length === 0 ? (
        <FormCard className="mb-5 border-dashed py-10 text-center">
          <p className="text-sm text-[#6B7280]">
            Clique em <strong className="text-[#1C2B20]">Buscar Comparáveis</strong> para
            puxar anúncios e aluguéis fechados recentes.
          </p>
        </FormCard>
      ) : kept.length === 0 ? (
        <FormCard className="mb-5 border-dashed py-10 text-center">
          <p className="text-sm text-[#6B7280]">
            Nenhum comparável atende aos filtros atuais. Tente expandir o escopo
            para a cidade inteira ou aumentar as tolerâncias.
          </p>
        </FormCard>
      ) : (
        <FormCard className="mb-5 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E0DA] bg-[#F0EFEB] text-[10px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
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
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-[#9CA3AF]">
                    {deal.inputs?.revenue?.monthlyRent
                      ? brl(deal.inputs.revenue.monthlyRent)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                    {num(subject.area)} m²
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px] text-[#9CA3AF]">
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
                              className="text-[#9CA3AF] transition-colors hover:text-[#4A7C59]"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 max-w-[260px] text-[10px] text-[#9CA3AF]">
                          {isManual ? 'manual' : l.source}
                          {l.condoFee
                            ? ` · cond. ${brl(l.condoFee)}`
                            : ''}
                          {l.isFurnished ? ' · mobiliado' : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#1C2B20]">
                        {brl(l.monthlyRent)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#6B7280]">
                        {l.area ? `${num(l.area)} m²` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-[#4A7C59]">
                        {ppm > 0 ? brl(ppm) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-mono tabular-nums text-[#6B7280]">
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
                      <td className="px-3 py-3 font-mono text-[10px] text-[#9CA3AF]">
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
                              className="flex h-6 w-6 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20]"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Excluir do cálculo"
                            onClick={() => exclude(l.id)}
                            className="flex h-6 w-6 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                          >
                            <XIcon size={11} />
                          </button>
                          {isManual && (
                            <button
                              type="button"
                              aria-label="Remover"
                              onClick={() => handleDelete(l.id)}
                              className="flex h-6 w-6 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
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
                        <tr key={l.id} className="border-b border-[#F0EFEB] last:border-0 opacity-60">
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
                                  className="text-[#9CA3AF]"
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
          <summary className="cursor-pointer select-none px-4 py-2.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase hover:text-[#1C2B20]">
            Developer · per-source telemetry
          </summary>
          <div className="border-t border-[#E2E0DA] p-4 font-mono text-[11px] leading-relaxed">
            <p className="mb-2 text-[#9CA3AF]">
              Subject:{' '}
              <span className="text-[#1C2B20]">
                {subject.bucket} · {subject.bedrooms}Q · {subject.area}m² · {subject.neighborhood} / {subject.city}
                {subject.state ? `/${subject.state}` : ''}
              </span>
            </p>
            <p className="mb-3 text-[#9CA3AF]">
              Pipeline:{' '}
              <span className="text-[#1C2B20]">
                {listings.length} listings → {kept.length} kept · {userExcluded.length} user-excluded ·{' '}
                {analysis ? analysis.filterResult.excluded.length : 0} filter-rejected
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
                      {} as Record<string, number>,
                    ),
                  ).map(([reason, count]) => (
                    <li key={reason} className="text-[#1C2B20]">
                      <span className="text-[#9CA3AF]">{reason}:</span> {count}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {lastResponse && (
              <>
                <p className="mb-1 text-[#9CA3AF]">Last API response:</p>
                <ul className="mb-3 space-y-1">
                  <li>
                    cacheHit: <span className="text-[#1C2B20]">{String(lastResponse.cacheHit)}</span>
                  </li>
                  <li>
                    fetchedAt: <span className="text-[#1C2B20]">{lastResponse.fetchedAt}</span>
                  </li>
                  <li>
                    sources: <span className="text-[#1C2B20]">{lastResponse.sources.join(', ') || '∅'}</span>
                  </li>
                </ul>
                <p className="mb-1 text-[#9CA3AF]">Per-source breakdown:</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E0DA] text-left text-[#9CA3AF]">
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
                        <td className="py-1 truncate text-[#6B7280]" title={p.searchUrl}>
                          {p.searchUrl ? (
                            <a href={p.searchUrl} target="_blank" rel="noreferrer" className="hover:text-[#4A7C59]">
                              {p.searchUrl.length > 80 ? p.searchUrl.slice(0, 80) + '…' : p.searchUrl}
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
            <p className="mt-3 text-[#9CA3AF]">
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
      <span
        className={`inline-flex items-center gap-1 ${
          active ? 'text-[#4A7C59]' : ''
        }`}
      >
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
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
        Escopo geográfico
      </p>
      <div className="inline-flex rounded-full border border-[#E2E0DA] bg-[#FAFAF8] p-0.5 text-xs">
        {(['bairro', 'cidade'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              value === opt
                ? 'bg-[#4A7C59] text-white'
                : 'text-[#6B7280] hover:text-[#1C2B20]'
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
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
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
