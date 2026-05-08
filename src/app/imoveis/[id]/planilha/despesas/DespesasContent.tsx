'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal } from '@/lib/supabase/deals';
import type { DealInput } from '@/lib/validations/deal';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { NumberInput } from '@/components/property/NumberInput';
import { UnitSelect, RENT_PERCENT_OPTIONS } from '@/components/property/UnitSelect';
import { Toggle } from '@/components/property/Toggle';
import { brl } from '@/components/property/format';
import { patchDeal } from '@/components/property/save-deal';
import { EXPENSE_PRESETS } from '@/lib/calculations/types';

interface Props {
  deal: SavedDeal;
}

/**
 * Local-only editor for the four canonical operating expense fields backed
 * by the schema (condo, IPTU, % gestão, % manutenção). The UI presents them
 * as a list to mirror DealCheck — full custom-row support is queued for a
 * follow-up that extends the DealInput.expenses schema.
 */
type ExpenseRow = {
  id: string;
  label: string;
  amount: number;
  unit: 'year' | 'month' | 'pctRent';
  /** True if this row maps to a DealInput field (cannot be deleted). */
  bound?: keyof DealInput['expenses'];
};

export default function DespesasContent({ deal }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [itemize, setItemize] = React.useState(true);

  const [rows, setRows] = React.useState<ExpenseRow[]>(() => {
    const e = deal.inputs?.expenses;
    return [
      {
        id: 'iptu',
        label: 'IPTU',
        amount: e?.iptu ?? 0,
        unit: 'year' as const,
        bound: 'iptu' as const,
      },
      {
        id: 'condo',
        label: 'Condomínio',
        amount: e?.condo ?? 0,
        unit: 'month' as const,
        bound: 'condo' as const,
      },
      {
        id: 'mgmt',
        label: 'Administração',
        amount: (e?.managementPercent ?? EXPENSE_PRESETS.managementPercent) * 100,
        unit: 'pctRent' as const,
        bound: 'managementPercent' as const,
      },
      {
        id: 'maint',
        label: 'Manutenção',
        amount: (e?.maintenancePercent ?? EXPENSE_PRESETS.maintenancePercent) * 100,
        unit: 'pctRent' as const,
        bound: 'maintenancePercent' as const,
      },
    ];
  });

  const monthlyRent = deal.inputs?.revenue?.monthlyRent ?? 0;

  const monthlyOf = (r: ExpenseRow): number => {
    if (r.unit === 'month') return r.amount;
    if (r.unit === 'year') return r.amount / 12;
    if (r.unit === 'pctRent') return monthlyRent * (r.amount / 100);
    return 0;
  };

  const totalMonthly = rows.reduce((s, r) => s + monthlyOf(r), 0);
  const totalAnnual = totalMonthly * 12;

  const updateRow = (id: string, patch: Partial<ExpenseRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = { ...deal.inputs! };
      if (!next.expenses) next.expenses = {
        condo: 0,
        iptu: 0,
        managementPercent: EXPENSE_PRESETS.managementPercent,
        maintenancePercent: EXPENSE_PRESETS.maintenancePercent,
        sellingCostPercent: EXPENSE_PRESETS.sellingCostPercent,
      };
      for (const r of rows) {
        if (!r.bound) continue;
        if (r.bound === 'iptu') next.expenses.iptu = r.amount;
        if (r.bound === 'condo') next.expenses.condo = r.amount;
        if (r.bound === 'managementPercent') next.expenses.managementPercent = r.amount / 100;
        if (r.bound === 'maintenancePercent') next.expenses.maintenancePercent = r.amount / 100;
      }
      await patchDeal(deal.id, {
        condo_fee: next.expenses.condo,
        iptu: next.expenses.iptu,
        inputs: next,
      });
      toast.success('Despesas salvas');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Despesas Operacionais"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Planilha de Compra', href: `/imoveis/${deal.id}/planilha` },
          { label: 'Despesas Operacionais' },
        ]}
        helper="Gerencie as despesas mensais e anuais do imóvel."
      />

      <div className="space-y-6">
        <FormCard>
          <div className="px-5 py-4">
            <Toggle
              on={itemize}
              onChange={setItemize}
              label="Detalhar Despesas"
              description="Liste cada despesa individualmente para ter controle completo."
            />
          </div>
        </FormCard>

        {itemize && (
          <div>
            <SectionHeading
              label="Despesas Detalhadas"
              rightSlot={
                <span className="rounded bg-[#F0EFEB] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#6B7480] uppercase">
                  Linhas Customizadas · Em Breve
                </span>
              }
            />
            <FormCard>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,2fr)_36px] items-center gap-3 px-5 py-3"
                >
                  <span className="text-[#D0CEC8]">
                    <GripVertical size={14} />
                  </span>
                  <div>
                    <Input
                      value={r.label}
                      onChange={(e) => updateRow(r.id, { label: e.target.value })}
                      disabled={!!r.bound}
                    />
                    {r.unit === 'pctRent' && (
                      <p className="mt-1 text-[10px] text-[#6B7480] italic">
                        Aplicado sobre o aluguel mensal
                      </p>
                    )}
                  </div>
                  <div className="flex items-stretch">
                    <NumberInput
                      decimals={r.unit === 'pctRent' ? 1 : 0}
                      prefix={r.unit === 'pctRent' ? undefined : 'R$'}
                      suffix={r.unit === 'pctRent' ? '%' : undefined}
                      value={r.amount}
                      onChange={(v) =>
                        updateRow(r.id, { amount: typeof v === 'number' ? v : 0 })
                      }
                      className="rounded-r-none"
                    />
                    <UnitSelect
                      value={r.unit}
                      onValueChange={(v) =>
                        updateRow(r.id, {
                          unit: v as ExpenseRow['unit'],
                        })
                      }
                      options={RENT_PERCENT_OPTIONS}
                      ariaLabel="Frequência"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover ${r.label}`}
                    disabled={!!r.bound}
                    className="flex h-8 w-8 items-center justify-center rounded text-[#D0CEC8] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between bg-[#EBF3EE] px-5 py-3.5">
                <span className="text-sm font-bold text-[#4A7C59]">Total</span>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-[#4A7C59]">
                    {brl(totalMonthly)} / mês
                  </p>
                  <p className="font-mono text-[10px] text-[#6B7480]">
                    ({brl(totalAnnual)} / ano)
                  </p>
                </div>
              </div>
            </FormCard>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href={`/imoveis/${deal.id}/planilha`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-2 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
          >
            <ArrowLeft size={12} />
            Voltar para Planilha
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4A7C59] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
}
