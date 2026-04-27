'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  ArrowDownToLine,
  Pencil as PencilIcon,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal, SalesComp, RentalComp } from '@/lib/supabase/deals';
import { PageHeader } from '../PageHeader';
import { SectionHeading } from '../SectionHeading';
import { FormCard } from '../FormCard';
import { KpiCard } from '../KpiCard';
import { brl, num } from '../format';
import { patchDeal } from '../save-deal';
import { AddCompDialog } from './AddCompDialog';
import {
  toCommon,
  fromCommon,
  pricePerSqm,
  computeStats,
  suggestedFromComps,
  type CompMode,
  type CompCommon,
} from './helpers';

interface Props {
  deal: SavedDeal;
  mode: CompMode;
}

export function ComparablesContent({ deal, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CompCommon | null>(null);

  const isSales = mode === 'sales';
  const title = isSales ? 'Comparáveis de Venda' : 'Comparáveis de Aluguel';
  const valueLabel = isSales ? 'Preço' : 'Aluguel';

  const initialList = React.useMemo<CompCommon[]>(() => {
    const raw = isSales ? (deal.comps?.sales ?? []) : (deal.comps?.rentals ?? []);
    return raw.map((c: SalesComp | RentalComp) => toCommon(c, mode));
  }, [deal.comps, isSales, mode]);

  const [comps, setComps] = React.useState<CompCommon[]>(initialList);
  // Track unsaved local edits — fork of initialList
  const dirty =
    JSON.stringify(comps.map((c) => c.id).sort()) !==
      JSON.stringify(initialList.map((c) => c.id).sort()) ||
    JSON.stringify(comps) !== JSON.stringify(initialList);

  const stats = computeStats(comps);
  const subjectSqm = deal.area ?? deal.inputs?.property?.squareFootage ?? null;
  const suggested = suggestedFromComps(comps, subjectSqm);

  const handleSave = async () => {
    setSaving(true);
    try {
      const sales = isSales
        ? comps.map((c) => fromCommon(c, 'sales') as SalesComp)
        : (deal.comps?.sales ?? []);
      const rentals = isSales
        ? (deal.comps?.rentals ?? [])
        : comps.map((c) => fromCommon(c, 'rentals') as RentalComp);

      await patchDeal(deal.id, {
        comps: { sales, rentals },
      });
      toast.success('Comparáveis salvos');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!suggested || !deal.inputs) {
      toast.error('Preencha a Planilha de Compra antes de aplicar a sugestão');
      return;
    }
    setSaving(true);
    try {
      const nextInputs = { ...deal.inputs };
      if (isSales) {
        nextInputs.revenue = {
          ...nextInputs.revenue,
          afterRepairValue: Math.round(suggested),
        };
      } else {
        nextInputs.revenue = {
          ...nextInputs.revenue,
          monthlyRent: Math.round(suggested),
        };
      }
      await patchDeal(deal.id, { inputs: nextInputs });
      toast.success(
        isSales
          ? `ARV atualizado para ${brl(suggested)}`
          : `Aluguel atualizado para ${brl(suggested)}/mês`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aplicar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remover este comparável?')) return;
    setComps((p) => p.filter((c) => c.id !== id));
  };

  const handleSaveDialog = (comp: CompCommon) => {
    setComps((p) => {
      const idx = p.findIndex((c) => c.id === comp.id);
      if (idx === -1) return [...p, comp];
      const next = [...p];
      next[idx] = comp;
      return next;
    });
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title={title}
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: title },
        ]}
        helper={
          isSales
            ? 'Adicione vendas recentes de imóveis similares na vizinhança para validar o ARV (Valor Pós-Reforma).'
            : 'Adicione aluguéis de imóveis similares na vizinhança para precificar o aluguel mensal.'
        }
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
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
            >
              <Plus size={12} />
              Adicionar Comparável
            </button>
          </>
        }
      />

      {/* ── Stats KPIs ────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Comparáveis" value={String(stats.count)} />
        <KpiCard
          label="Mediana / m²"
          value={stats.medianPpsm > 0 ? brl(stats.medianPpsm) : '—'}
        />
        <KpiCard
          label="Média / m²"
          value={stats.avgPpsm > 0 ? brl(stats.avgPpsm) : '—'}
        />
        <KpiCard
          label="Faixa / m²"
          value={
            stats.minPpsm > 0
              ? `${brl(stats.minPpsm)} – ${brl(stats.maxPpsm)}`
              : '—'
          }
        />
      </div>

      {/* ── Suggestion panel ─────────────────────────────────────────── */}
      {stats.count > 0 && subjectSqm != null && subjectSqm > 0 && (
        <div className="mb-6 flex flex-col gap-4 border border-[#A8C5B2] bg-[#EBF3EE] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4A7C59] text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C2B20]">
                {isSales ? 'ARV Sugerido' : 'Aluguel Sugerido'}: {brl(suggested)}
                {!isSales && <span className="text-[#6B7280]"> /mês</span>}
              </p>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Baseado na mediana de {brl(stats.medianPpsm)} / m² × {num(subjectSqm)} m² do imóvel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplySuggestion}
            disabled={saving || !deal.inputs}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#4A7C59] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            <ArrowDownToLine size={12} />
            {isSales ? 'Aplicar como ARV' : 'Aplicar como Aluguel'}
          </button>
        </div>
      )}

      {/* ── Comp list ────────────────────────────────────────────────── */}
      <SectionHeading
        label={`Lista de Comparáveis (${comps.length})`}
        rightSlot={
          <span className="rounded bg-[#F0EFEB] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#9CA3AF] uppercase">
            Importação Automática · Em Breve
          </span>
        }
      />
      {comps.length === 0 ? (
        <div className="border border-dashed border-[#A8C5B2] bg-[#FAFAF8] py-12 text-center">
          <p className="text-sm text-[#6B7280]">
            Nenhum comparável adicionado ainda.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#4A7C59] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            <Plus size={12} />
            Adicionar primeiro comparável
          </button>
        </div>
      ) : (
        <FormCard className="mb-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E0DA] bg-[#F0EFEB] text-[10px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
                  <th className="px-5 py-2.5 text-left">Endereço</th>
                  <th className="px-3 py-2.5 text-right">{valueLabel}</th>
                  <th className="px-3 py-2.5 text-right">Área</th>
                  <th className="px-3 py-2.5 text-right">R$ / m²</th>
                  <th className="px-3 py-2.5 text-center">Q / B</th>
                  <th className="px-3 py-2.5 text-left">Data</th>
                  <th className="px-5 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => {
                  const ppsm = pricePerSqm(c);
                  return (
                    <tr key={c.id} className="border-b border-[#F0EFEB] last:border-0">
                      <td className="px-5 py-3 text-[#1C2B20]">
                        <div className="flex items-center gap-1.5">
                          <span className="line-clamp-2 max-w-[260px]">
                            {c.address || <span className="italic text-[#9CA3AF]">Sem endereço</span>}
                          </span>
                          {c.sourceUrl && (
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Abrir anúncio"
                              className="text-[#9CA3AF] transition-colors hover:text-[#4A7C59]"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        {c.notes && (
                          <p className="mt-0.5 line-clamp-1 max-w-[260px] text-[10px] text-[#9CA3AF] italic">
                            {c.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#1C2B20]">
                        {brl(c.primaryValue)}
                        {!isSales && <span className="text-[10px] text-[#9CA3AF]"> /mês</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#6B7280]">
                        {num(c.squareMeters)} m²
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-[#4A7C59]">
                        {ppsm > 0 ? brl(ppsm) : '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-mono tabular-nums text-[#6B7280]">
                        {c.bedrooms ?? '–'} / {c.bathrooms ?? '–'}
                      </td>
                      <td className="px-3 py-3 font-mono text-[#9CA3AF]">
                        {c.date
                          ? new Date(c.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Editar"
                            onClick={() => {
                              setEditing(c);
                              setDialogOpen(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20]"
                          >
                            <PencilIcon size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label="Remover"
                            onClick={() => handleDelete(c.id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#9CA3AF] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                          >
                            <Trash2 size={12} />
                          </button>
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

      {/* ── Save bar ─────────────────────────────────────────────────── */}
      {dirty && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-5 py-3 shadow-md">
          <p className="text-xs text-[#6B7280]">
            <span className="font-semibold text-[#1C2B20]">Alterações não salvas.</span>
            {' '}Recarregue a página para descartar.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4A7C59] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar Comparáveis'}
          </button>
        </div>
      )}

      <p className="pt-2 text-center font-mono text-[10px] text-[#9CA3AF]">
        Dica: a mediana é mais robusta a outliers do que a média. Quanto mais comparáveis,
        mais confiável a sugestão.
      </p>

      <AddCompDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        initial={editing}
        onSave={handleSaveDialog}
      />
    </>
  );
}
