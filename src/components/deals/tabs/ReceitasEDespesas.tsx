'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';
import { CurrencyInput } from '@/components/ui/currency-input';

const stepSchema = z.object({
  revenue: z.object({
    monthlyRent: z.number().min(0),
    vacancyRate: z.number().min(0).max(100),
    ipcaIndexed: z.boolean(),
    annualIpcaRate: z.number().min(0).max(50),
    dailyRate: z.number().min(0),
    occupancyRate: z.number().min(0).max(100),
    afterRepairValue: z.number().min(0),
    holdingMonths: z.number().int().min(1),
  }),
  expenses: z.object({
    condo: z.number().min(0),
    iptu: z.number().min(0),
    managementPercent: z.number().min(0).max(100),
    maintenancePercent: z.number().min(0).max(100),
    sellingCostPercent: z.number().min(0).max(20),
  }),
});

type StepData = z.infer<typeof stepSchema>;

const fieldClass =
  'w-full border border-[#E2E0DA] bg-white px-3.5 py-2.5 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4A7C59] focus:shadow-[0_0_0_2px_rgba(74,124,89,0.12)]';
const labelClass =
  'mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase';

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function ReceitasEDespesas({ onBack, onNext }: Props) {
  const { formData, updateFormData } = useDealStore();
  const propertyType = formData.propertyType ?? 'aluguel';
  const isAirbnb = propertyType === 'airbnb';
  const isReforma = propertyType === 'flip';

  const { register, handleSubmit, control } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      revenue: {
        monthlyRent: formData.revenue?.monthlyRent ?? 0,
        vacancyRate: (formData.revenue?.vacancyRate ?? 0.05) * 100,
        ipcaIndexed: formData.revenue?.ipcaIndexed ?? false,
        annualIpcaRate: (formData.revenue?.annualIpcaRate ?? 0.05) * 100,
        dailyRate: formData.revenue?.dailyRate ?? 0,
        occupancyRate: (formData.revenue?.occupancyRate ?? 0.65) * 100,
        afterRepairValue: formData.revenue?.afterRepairValue ?? 0,
        holdingMonths: formData.revenue?.holdingMonths ?? 6,
      },
      expenses: {
        condo: formData.expenses?.condo ?? 0,
        iptu: formData.expenses?.iptu ?? 0,
        managementPercent: (formData.expenses?.managementPercent ?? 0.1) * 100,
        maintenancePercent: (formData.expenses?.maintenancePercent ?? 0.05) * 100,
        sellingCostPercent: (formData.expenses?.sellingCostPercent ?? 0.06) * 100,
      },
    },
  });

  const ipcaIndexed = useWatch({ control, name: 'revenue.ipcaIndexed' });
  const monthlyRent = useWatch({ control, name: 'revenue.monthlyRent' }) ?? 0;
  const vacancyRate = useWatch({ control, name: 'revenue.vacancyRate' }) ?? 5;
  const condo = useWatch({ control, name: 'expenses.condo' }) ?? 0;
  const iptu = useWatch({ control, name: 'expenses.iptu' }) ?? 0;
  const mgmt = useWatch({ control, name: 'expenses.managementPercent' }) ?? 10;
  const maint = useWatch({ control, name: 'expenses.maintenancePercent' }) ?? 5;
  const dailyRate = useWatch({ control, name: 'revenue.dailyRate' }) ?? 0;
  const occupancy = useWatch({ control, name: 'revenue.occupancyRate' }) ?? 65;

  const effectiveRent = isAirbnb
    ? dailyRate * 30 * (occupancy / 100)
    : monthlyRent * (1 - vacancyRate / 100);
  const expenses = condo + iptu + monthlyRent * (mgmt / 100) + monthlyRent * (maint / 100);
  const noi = effectiveRent - expenses;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  const onSubmit = (data: StepData) => {
    updateFormData({
      revenue: {
        monthlyRent: data.revenue.monthlyRent,
        vacancyRate: data.revenue.vacancyRate / 100,
        ipcaIndexed: data.revenue.ipcaIndexed,
        annualIpcaRate: data.revenue.annualIpcaRate / 100,
        dailyRate: data.revenue.dailyRate,
        occupancyRate: data.revenue.occupancyRate / 100,
        afterRepairValue: data.revenue.afterRepairValue,
        holdingMonths: data.revenue.holdingMonths,
      },
      expenses: {
        condo: data.expenses.condo,
        iptu: data.expenses.iptu,
        managementPercent: data.expenses.managementPercent / 100,
        maintenancePercent: data.expenses.maintenancePercent / 100,
        sellingCostPercent: data.expenses.sellingCostPercent / 100,
      },
    });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <h2 className="text-base font-bold text-[#1C2B20]">Receitas & Despesas</h2>
        <p className="mt-0.5 text-sm text-[#9CA3AF]">
          {isAirbnb
            ? 'Diária e taxa de ocupação para locação por temporada.'
            : isReforma
              ? 'Valor pós-reforma (ARV) e estimativa de custos de venda.'
              : 'Aluguel, vacância e despesas operacionais mensais.'}
        </p>
      </div>

      {/* Reforma e Venda */}
      {isReforma && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Valor Pós-Reforma — ARV (R$)</label>
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-[#9CA3AF]">
                R$
              </span>
              <Controller
                control={control}
                name="revenue.afterRepairValue"
                render={({ field }) => (
                  <CurrencyInput
                    placeholder="0"
                    className={`${fieldClass} pl-10`}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prazo de Reforma (meses)</label>
              <input
                type="number"
                {...register('revenue.holdingMonths', { valueAsNumber: true })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Custo de Venda (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  {...register('expenses.sellingCostPercent', { valueAsNumber: true })}
                  className={`${fieldClass} pr-8`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                  %
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">
                Corretor + ITBI vendedor ≈ 6%
              </p>
            </div>
          </div>
          <div className="border border-[#E2E0DA] bg-[#F0EFEB] px-4 py-3 font-mono text-xs text-[#9CA3AF]">
            Ganho de capital calculado automaticamente com alíquota de 15% (até R$ 5M).
          </div>
        </div>
      )}

      {/* Airbnb */}
      {isAirbnb && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Diária Média (R$)</label>
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-[#9CA3AF]">
                R$
              </span>
              <Controller
                control={control}
                name="revenue.dailyRate"
                render={({ field }) => (
                  <CurrencyInput
                    className={`${fieldClass} pl-10`}
                    placeholder="0"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Taxa de Ocupação (%)</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                {...register('revenue.occupancyRate', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                %
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Aluguel / Comercial */}
      {!isReforma && !isAirbnb && (
        <div>
          <p className="mb-3 text-sm font-semibold text-[#1C2B20]">Receita de Aluguel</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Aluguel Mensal (R$)</label>
              <div className="relative">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-[#9CA3AF]">
                  R$
                </span>
                <Controller
                  control={control}
                  name="revenue.monthlyRent"
                  render={({ field }) => (
                    <CurrencyInput
                      className={`${fieldClass} pl-10`}
                      placeholder="0"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Vacância (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  {...register('revenue.vacancyRate', { valueAsNumber: true })}
                  className={`${fieldClass} pr-8`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* IPCA indexation */}
          <div className="mt-4 border border-[#E2E0DA] bg-[#F8F7F4] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1C2B20]">Reajuste pelo IPCA</p>
                <p className="font-mono text-[10px] text-[#9CA3AF]">
                  Projeta crescimento do aluguel corrigido pela inflação
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" {...register('revenue.ipcaIndexed')} className="sr-only" />
                <div
                  className={`relative h-5 w-9 transition-colors ${
                    ipcaIndexed ? 'bg-[#3D6B4F]' : 'bg-[#E2E0DA]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 bg-[#1C2B20] transition-transform ${
                      ipcaIndexed ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </label>
            </div>
            {ipcaIndexed && (
              <div className="mt-3">
                <label className={labelClass}>IPCA anual estimado (%)</label>
                <div className="relative w-40">
                  <input
                    type="number"
                    step="0.1"
                    {...register('revenue.annualIpcaRate', { valueAsNumber: true })}
                    className={`${fieldClass} pr-8`}
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Despesas operacionais (não reforma) */}
      {!isReforma && (
        <>
          <div className="border-t border-[#E2E0DA]" />
          <div>
            <p className="mb-3 text-sm font-semibold text-[#1C2B20]">Despesas Operacionais</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Condomínio (R$/mês)</label>
                <Controller
                  control={control}
                  name="expenses.condo"
                  render={({ field }) => (
                    <CurrencyInput
                      className={fieldClass}
                      placeholder="0"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <label className={labelClass}>IPTU (R$/mês)</label>
                <Controller
                  control={control}
                  name="expenses.iptu"
                  render={({ field }) => (
                    <CurrencyInput
                      className={fieldClass}
                      placeholder="0"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <label className={labelClass}>Administração (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    {...register('expenses.managementPercent', { valueAsNumber: true })}
                    className={`${fieldClass} pr-8`}
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Manutenção (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    {...register('expenses.maintenancePercent', { valueAsNumber: true })}
                    className={`${fieldClass} pr-8`}
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live NOI waterfall */}
          {!isReforma && (monthlyRent > 0 || dailyRate > 0) && (
            <div className="border border-[#E2E0DA] bg-[#F8F7F4] p-4 text-sm">
              <p className="mb-3 font-mono text-[10px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
                Resultado Operacional — prévia
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Aluguel bruto</span>
                  <span className="font-mono font-semibold text-[#1C2B20]">
                    {fmt(isAirbnb ? dailyRate * 30 : monthlyRent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">
                    {isAirbnb ? `Ocupação (${occupancy}%)` : `Vacância (${vacancyRate}%)`}
                  </span>
                  <span className="font-mono text-[#DC2626]">
                    −{' '}
                    {fmt(
                      isAirbnb
                        ? dailyRate * 30 * (1 - occupancy / 100)
                        : monthlyRent * (vacancyRate / 100)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E2E0DA] pt-2">
                  <span className="text-[#6B7280]">Receita efetiva</span>
                  <span className="font-mono font-semibold text-[#1C2B20]">
                    {fmt(effectiveRent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Despesas operacionais</span>
                  <span className="font-mono text-[#DC2626]">− {fmt(expenses)}</span>
                </div>
                <div className="flex justify-between border-t border-[#D0CEC8] pt-2">
                  <span className="font-bold text-[#1C2B20]">NOI Mensal</span>
                  <span
                    className={`font-mono font-bold ${noi >= 0 ? 'text-[#4A7C59]' : 'text-[#DC2626]'}`}
                  >
                    {fmt(noi)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-[#E2E0DA] px-5 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
        >
          ← Voltar
        </button>
        <button
          type="submit"
          className="bg-[#4A7C59] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          Próximo: Projeções →
        </button>
      </div>
    </form>
  );
}
