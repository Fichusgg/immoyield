'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, BarChart2, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal } from '@/lib/supabase/deals';
import type { DealInput } from '@/lib/validations/deal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { FormRow } from '@/components/property/FormRow';
import { NumberInput } from '@/components/property/NumberInput';
import { Toggle } from '@/components/property/Toggle';
import { brl } from '@/components/property/format';
import { patchDeal } from '@/components/property/save-deal';

interface Props {
  deal: SavedDeal;
}

/**
 * Default DealInput skeleton — used to seed the worksheet when the deal
 * was imported (no inputs) and the user hasn't run the wizard yet.
 */
function defaults(deal: SavedDeal): DealInput {
  return {
    name: deal.title,
    propertyType: 'residential',
    purchasePrice: deal.price ?? 0,
    acquisitionCosts: {
      itbiPercent: 0.03,
      cartorio: 0,
      reforms: 0,
      escritura: 0,
      registro: 0,
      avaliacao: 0,
    },
    financing: {
      enabled: true,
      downPayment: (deal.price ?? 0) * 0.2,
      interestRateYear: 11,
      termMonths: 360,
      system: 'SAC',
      modality: 'SFH',
    },
    revenue: {
      monthlyRent: 0,
      vacancyRate: 0.05,
      ipcaIndexed: false,
      annualIpcaRate: 0.05,
      dailyRate: 0,
      occupancyRate: 0.65,
      afterRepairValue: 0,
      holdingMonths: 6,
    },
    expenses: {
      condo: deal.condo_fee ?? 0,
      iptu: deal.iptu ?? 0,
      managementPercent: 0.1,
      maintenancePercent: 0.03,
      sellingCostPercent: 0.06,
    },
    projections: {
      appreciationRate: 0.05,
      incomeGrowthRate: 0.05,
      expenseGrowthRate: 0.05,
      holdPeriodYears: 10,
      sellingCostPercent: 0.08,
      depreciationPeriodYears: 25,
    },
  };
}

export default function PlanilhaContent({ deal }: Props) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const seed = deal.inputs ?? defaults(deal);
  const [inp, setInp] = React.useState<DealInput>(seed);

  // ── Field setters — keep the React update tight ──────────────────────
  const setRoot = <K extends keyof DealInput>(key: K, value: DealInput[K]) =>
    setInp((p) => ({ ...p, [key]: value }));

  const setNested = <
    G extends keyof DealInput,
    K extends keyof NonNullable<DealInput[G]>,
  >(
    group: G,
    key: K,
    value: NonNullable<DealInput[G]>[K]
  ) =>
    setInp((p) => ({
      ...p,
      [group]: { ...(p[group] as object), [key]: value },
    }));

  // Itemized totals (read-only in the worksheet — edit via sub-pages)
  const purchaseCostsTotal =
    inp.purchasePrice * (inp.acquisitionCosts.itbiPercent ?? 0) +
    (inp.acquisitionCosts.cartorio ?? 0) +
    (inp.acquisitionCosts.escritura ?? 0) +
    (inp.acquisitionCosts.registro ?? 0) +
    (inp.acquisitionCosts.avaliacao ?? 0);

  const operatingExpensesMonthly =
    (inp.expenses.condo ?? 0) +
    (inp.expenses.iptu ?? 0) / 12 +
    (inp.revenue.monthlyRent ?? 0) *
      ((inp.expenses.managementPercent ?? 0) + (inp.expenses.maintenancePercent ?? 0));

  const sqft = deal.area ?? null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchDeal(deal.id, {
        price: inp.purchasePrice,
        condo_fee: inp.expenses.condo,
        iptu: inp.expenses.iptu,
        property_type: inp.propertyType,
        inputs: inp,
      });
      toast.success('Planilha salva. Recalculando análise…');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Limpar todos os campos da planilha?')) return;
    setResetting(true);
    setInp(defaults(deal));
    setResetting(false);
  };

  return (
    <>
      <PageHeader
        title="Planilha de Compra"
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title, href: `/imoveis/${deal.id}/analise` },
          { label: 'Planilha de Compra' },
        ]}
        helper="Use esta planilha para personalizar a compra, financiamento, custos, aluguel e despesas deste imóvel."
        actions={
          <>
            <Link
              href={`/imoveis/${deal.id}/projecoes`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <TrendingUp size={12} />
              Projeções
            </Link>
            <Link
              href={`/imoveis/${deal.id}/analise`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <BarChart2 size={12} />
              Análise
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        {/* ── Top: prices ─────────────────────────────────────────────── */}
        <FormCard>
          <FormRow label="Preço de Compra" help="O preço acordado para aquisição do imóvel.">
            <NumberInput
              prefix="R$"
              value={inp.purchasePrice}
              onChange={(v) => setRoot('purchasePrice', typeof v === 'number' ? v : 0)}
            />
          </FormRow>
          <FormRow
            label="Valor Pós-Reforma (ARV)"
            help="Valor estimado do imóvel após reformas. Se não houver reforma, é o valor de mercado atual."
          >
            <NumberInput
              prefix="R$"
              value={inp.revenue.afterRepairValue ?? 0}
              onChange={(v) =>
                setNested('revenue', 'afterRepairValue', typeof v === 'number' ? v : 0)
              }
            />
          </FormRow>
        </FormCard>

        {/* ── Financiamento ───────────────────────────────────────────── */}
        <div>
          <SectionHeading label="Financiamento" />
          <FormCard>
            <div className="px-5 py-4">
              <Toggle
                on={inp.financing.enabled}
                onChange={(on) => setNested('financing', 'enabled', on)}
                label="Usar Financiamento"
                description="Ative para incluir entrada, parcelas e juros no cálculo."
              />
            </div>

            {inp.financing.enabled && (
              <>
                <FormRow label="Sistema de Amortização">
                  <Select
                    value={inp.financing.system}
                    onValueChange={(v) => {
                      if (v === 'SAC' || v === 'PRICE')
                        setNested('financing', 'system', v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAC">SAC (parcelas decrescentes)</SelectItem>
                      <SelectItem value="PRICE">Price (parcelas fixas)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Modalidade">
                  <Select
                    value={inp.financing.modality ?? 'SFH'}
                    onValueChange={(v) => {
                      if (
                        v === 'SFH' ||
                        v === 'SFI' ||
                        v === 'MCMV' ||
                        v === 'consorcio' ||
                        v === 'outro'
                      )
                        setNested('financing', 'modality', v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SFH">SFH (até R$1,5M, teto 12% a.a.)</SelectItem>
                      <SelectItem value="SFI">SFI (sem teto)</SelectItem>
                      <SelectItem value="MCMV">MCMV (subsidiado)</SelectItem>
                      <SelectItem value="consorcio">Consórcio</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Entrada">
                  <NumberInput
                    prefix="R$"
                    value={inp.financing.downPayment}
                    onChange={(v) =>
                      setNested('financing', 'downPayment', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow label="Taxa de Juros">
                  <NumberInput
                    decimals={2}
                    suffix="% a.a."
                    value={inp.financing.interestRateYear}
                    onChange={(v) =>
                      setNested('financing', 'interestRateYear', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow label="Prazo">
                  <NumberInput
                    suffix="meses"
                    value={inp.financing.termMonths}
                    onChange={(v) =>
                      setNested('financing', 'termMonths', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow label="FGTS Utilizado">
                  <NumberInput
                    prefix="R$"
                    value={inp.financing.fgtsAmount ?? 0}
                    onChange={(v) =>
                      setNested('financing', 'fgtsAmount', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow
                  label="Seguro Habitacional"
                  help="DFI + MIP em % a.a. sobre saldo devedor (típico 0,30% a 0,60%)."
                >
                  <NumberInput
                    decimals={2}
                    suffix="% a.a."
                    value={(inp.financing.insurancePercentYear ?? 0.005) * 100}
                    onChange={(v) =>
                      setNested(
                        'financing',
                        'insurancePercentYear',
                        typeof v === 'number' ? v / 100 : 0
                      )
                    }
                  />
                </FormRow>
              </>
            )}
          </FormCard>
        </div>

        {/* ── Custos de Aquisição ─────────────────────────────────────── */}
        <div>
          <SectionHeading label="Custos de Aquisição" />
          <FormCard>
            <FormRow
              label="ITBI"
              help="Imposto sobre a transmissão. Tipicamente 2% a 3% do valor do imóvel."
            >
              <NumberInput
                decimals={2}
                suffix="%"
                value={(inp.acquisitionCosts.itbiPercent ?? 0) * 100}
                onChange={(v) =>
                  setNested(
                    'acquisitionCosts',
                    'itbiPercent',
                    typeof v === 'number' ? v / 100 : 0
                  )
                }
              />
            </FormRow>
            <FormRow label="Escritura">
              <NumberInput
                prefix="R$"
                value={inp.acquisitionCosts.escritura ?? 0}
                onChange={(v) =>
                  setNested('acquisitionCosts', 'escritura', typeof v === 'number' ? v : 0)
                }
              />
            </FormRow>
            <FormRow label="Registro">
              <NumberInput
                prefix="R$"
                value={inp.acquisitionCosts.registro ?? 0}
                onChange={(v) =>
                  setNested('acquisitionCosts', 'registro', typeof v === 'number' ? v : 0)
                }
              />
            </FormRow>
            <FormRow label="Avaliação">
              <NumberInput
                prefix="R$"
                value={inp.acquisitionCosts.avaliacao ?? 0}
                onChange={(v) =>
                  setNested('acquisitionCosts', 'avaliacao', typeof v === 'number' ? v : 0)
                }
              />
            </FormRow>
            <FormRow label="Outros Cartório">
              <NumberInput
                prefix="R$"
                value={inp.acquisitionCosts.cartorio ?? 0}
                onChange={(v) =>
                  setNested('acquisitionCosts', 'cartorio', typeof v === 'number' ? v : 0)
                }
              />
            </FormRow>
            <div className="flex items-center justify-between bg-[#F0EFEB]/60 px-5 py-3.5">
              <span className="text-sm font-semibold text-[#1C2B20]">Total</span>
              <span className="font-mono text-sm font-bold text-[#4A7C59]">
                {brl(purchaseCostsTotal)}
              </span>
            </div>
          </FormCard>
        </div>

        {/* ── Custos de Reforma ───────────────────────────────────────── */}
        <div>
          <SectionHeading label="Custos de Reforma" />
          <FormCard>
            <FormRow label="Reformas / Benfeitorias">
              <NumberInput
                prefix="R$"
                value={inp.acquisitionCosts.reforms ?? 0}
                onChange={(v) =>
                  setNested('acquisitionCosts', 'reforms', typeof v === 'number' ? v : 0)
                }
              />
            </FormRow>
            {sqft != null && sqft > 0 && (inp.acquisitionCosts.reforms ?? 0) > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 text-xs text-[#9CA3AF]">
                <span>Custo por m²</span>
                <span className="font-mono">
                  {brl((inp.acquisitionCosts.reforms ?? 0) / sqft)} / m²
                </span>
              </div>
            )}
          </FormCard>
        </div>

        {/* ── Receita ─────────────────────────────────────────────────── */}
        <div>
          <SectionHeading label="Receita" />
          <FormCard>
            <FormRow label="Estratégia">
              <Select
                value={inp.propertyType}
                onValueChange={(v) => {
                  if (
                    v === 'residential' ||
                    v === 'airbnb' ||
                    v === 'flip' ||
                    v === 'multifamily' ||
                    v === 'commercial'
                  )
                    setRoot('propertyType', v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Aluguel Residencial</SelectItem>
                  <SelectItem value="airbnb">Airbnb / Temporada</SelectItem>
                  <SelectItem value="flip">Reforma e Venda</SelectItem>
                  <SelectItem value="multifamily">Multifamiliar</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            {inp.propertyType === 'airbnb' ? (
              <>
                <FormRow label="Diária Média">
                  <NumberInput
                    prefix="R$"
                    value={inp.revenue.dailyRate ?? 0}
                    onChange={(v) =>
                      setNested('revenue', 'dailyRate', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow label="Taxa de Ocupação">
                  <NumberInput
                    decimals={1}
                    suffix="%"
                    value={(inp.revenue.occupancyRate ?? 0) * 100}
                    onChange={(v) =>
                      setNested(
                        'revenue',
                        'occupancyRate',
                        typeof v === 'number' ? v / 100 : 0
                      )
                    }
                  />
                </FormRow>
              </>
            ) : (
              <>
                <FormRow label="Aluguel Mensal Bruto">
                  <NumberInput
                    prefix="R$"
                    value={inp.revenue.monthlyRent}
                    onChange={(v) =>
                      setNested('revenue', 'monthlyRent', typeof v === 'number' ? v : 0)
                    }
                  />
                </FormRow>
                <FormRow
                  label="Taxa de Vacância"
                  help="Percentual do tempo em que o imóvel fica desocupado."
                >
                  <NumberInput
                    decimals={1}
                    suffix="%"
                    value={(inp.revenue.vacancyRate ?? 0) * 100}
                    onChange={(v) =>
                      setNested(
                        'revenue',
                        'vacancyRate',
                        typeof v === 'number' ? v / 100 : 0
                      )
                    }
                  />
                </FormRow>
              </>
            )}
          </FormCard>
        </div>

        {/* ── Despesas Operacionais (resumo + edit link) ──────────────── */}
        <div>
          <SectionHeading label="Despesas Operacionais" />
          <div className="flex items-center justify-between border border-[#E2E0DA] bg-[#FAFAF8] px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[#1C2B20]">
                Total Mensal · {brl(operatingExpensesMonthly)}
              </p>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                Inclui condomínio, IPTU rateado, gestão e manutenção.
              </p>
            </div>
            <Link
              href={`/imoveis/${deal.id}/planilha/despesas`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <Pencil size={12} />
              Editar Despesas
            </Link>
          </div>
        </div>

        {/* ── Projeções de Longo Prazo ────────────────────────────────── */}
        <div>
          <SectionHeading label="Projeções de Longo Prazo" />
          <FormCard>
            <FormRow label="Valorização Anual">
              <NumberInput
                decimals={2}
                suffix="% a.a."
                value={(inp.projections?.appreciationRate ?? 0.05) * 100}
                onChange={(v) =>
                  setRoot('projections', {
                    ...(inp.projections ?? defaults(deal).projections!),
                    appreciationRate: typeof v === 'number' ? v / 100 : 0,
                  })
                }
              />
            </FormRow>
            <FormRow label="Crescimento de Receita">
              <NumberInput
                decimals={2}
                suffix="% a.a."
                value={(inp.projections?.incomeGrowthRate ?? 0.05) * 100}
                onChange={(v) =>
                  setRoot('projections', {
                    ...(inp.projections ?? defaults(deal).projections!),
                    incomeGrowthRate: typeof v === 'number' ? v / 100 : 0,
                  })
                }
              />
            </FormRow>
            <FormRow label="Crescimento de Despesas">
              <NumberInput
                decimals={2}
                suffix="% a.a."
                value={(inp.projections?.expenseGrowthRate ?? 0.05) * 100}
                onChange={(v) =>
                  setRoot('projections', {
                    ...(inp.projections ?? defaults(deal).projections!),
                    expenseGrowthRate: typeof v === 'number' ? v / 100 : 0,
                  })
                }
              />
            </FormRow>
            <FormRow label="Custos de Venda">
              <NumberInput
                decimals={2}
                suffix="% do preço"
                value={(inp.projections?.sellingCostPercent ?? 0.08) * 100}
                onChange={(v) =>
                  setRoot('projections', {
                    ...(inp.projections ?? defaults(deal).projections!),
                    sellingCostPercent: typeof v === 'number' ? v / 100 : 0,
                  })
                }
              />
            </FormRow>
            <FormRow label="Período de Análise">
              <NumberInput
                suffix="anos"
                value={inp.projections?.holdPeriodYears ?? 10}
                onChange={(v) =>
                  setRoot('projections', {
                    ...(inp.projections ?? defaults(deal).projections!),
                    holdPeriodYears: typeof v === 'number' ? v : 10,
                  })
                }
              />
            </FormRow>
          </FormCard>
        </div>

        {/* ── Save / Reset bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DC2626]/30 bg-transparent px-4 py-2 text-xs font-medium text-[#DC2626] transition-colors hover:bg-[#FEE2E2] disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Limpar Planilha
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#4A7C59] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar Planilha'}
          </button>
        </div>

        <p className="pt-2 text-center text-[11px] text-[#9CA3AF]">
          A análise será recalculada na próxima visita à página{' '}
          <Link href={`/imoveis/${deal.id}/analise`} className="underline">
            Análise
          </Link>
          .
        </p>
      </div>
    </>
  );
}
