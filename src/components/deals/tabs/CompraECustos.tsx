'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';
import { CurrencyInput } from '@/components/ui/currency-input';

const stepSchema = z.object({
  purchasePrice: z.number().positive('Informe um valor positivo'),
  acquisitionCosts: z.object({
    itbiPercent: z.number().min(0).max(10),
    cartorio: z.number().min(0),
    reforms: z.number().min(0),
  }),
  financing: z.object({
    enabled: z.boolean(),
    downPayment: z.number().min(0),
    interestRateYear: z.number().min(0),
    termMonths: z.number().int().positive(),
    system: z.enum(['SAC', 'PRICE']),
  }),
});

type StepData = z.infer<typeof stepSchema>;

const fieldClass =
  'w-full border border-[#27272a] bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-[#f4f4f5] placeholder:text-[#52525b] outline-none transition-colors focus:border-[#22c55e] focus:shadow-[0_0_0_2px_rgba(34,197,94,0.15)]';
const labelClass =
  'mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.08em] text-[#52525b] uppercase';

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function CompraECustos({ onBack, onNext }: Props) {
  const { formData, updateFormData } = useDealStore();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      purchasePrice: formData.purchasePrice ?? undefined,
      acquisitionCosts: {
        itbiPercent: (formData.acquisitionCosts?.itbiPercent ?? 0.03) * 100,
        cartorio: formData.acquisitionCosts?.cartorio ?? 0,
        reforms: formData.acquisitionCosts?.reforms ?? 0,
      },
      financing: {
        enabled: formData.financing?.enabled ?? true,
        downPayment: formData.financing?.downPayment ?? 0,
        interestRateYear: formData.financing?.interestRateYear ?? 10.5,
        termMonths: formData.financing?.termMonths ?? 360,
        system: formData.financing?.system ?? 'SAC',
      },
    },
  });

  const isEnabled = useWatch({ control, name: 'financing.enabled' });
  const purchasePrice = useWatch({ control, name: 'purchasePrice' }) ?? 0;
  const itbi = useWatch({ control, name: 'acquisitionCosts.itbiPercent' }) ?? 3;
  const cartorio = useWatch({ control, name: 'acquisitionCosts.cartorio' }) ?? 0;
  const reforms = useWatch({ control, name: 'acquisitionCosts.reforms' }) ?? 0;
  const downPayment = useWatch({ control, name: 'financing.downPayment' }) ?? 0;

  const itbiValue = purchasePrice * (itbi / 100);
  const totalAcquisition = purchasePrice + itbiValue + cartorio + reforms;
  const loanAmount = isEnabled ? Math.max(0, purchasePrice - downPayment) : 0;
  const cashNeeded = totalAcquisition - loanAmount;

  const onSubmit = (data: StepData) => {
    updateFormData({
      purchasePrice: data.purchasePrice,
      acquisitionCosts: {
        itbiPercent: data.acquisitionCosts.itbiPercent / 100,
        cartorio: data.acquisitionCosts.cartorio,
        reforms: data.acquisitionCosts.reforms,
      },
      financing: data.financing,
    });
    onNext();
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <h2 className="text-base font-bold text-[#f4f4f5]">Compra & Custos de Aquisição</h2>
        <p className="mt-0.5 text-sm text-[#52525b]">
          ITBI, cartório, reformas e estrutura de financiamento.
        </p>
      </div>

      {/* Purchase price */}
      <div>
        <label className={labelClass}>Valor de Compra</label>
        <div className="relative">
          <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-[#52525b]">
            R$
          </span>
          <Controller
            control={control}
            name="purchasePrice"
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
        {errors.purchasePrice && (
          <p className="mt-1 font-mono text-xs text-[#f87171]">{errors.purchasePrice.message}</p>
        )}
      </div>

      {/* Live summary strip */}
      <div className="grid grid-cols-3 gap-px border border-[#27272a] bg-[#27272a] text-center">
        <div className="bg-[#1a1a1a] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
            ITBI estimado
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#f4f4f5]">{fmt(itbiValue)}</p>
        </div>
        <div className="bg-[#1a1a1a] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
            Financiamento
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#f4f4f5]">{fmt(loanAmount)}</p>
        </div>
        <div className="bg-[#1a1a1a] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#52525b] uppercase">
            Capital próprio
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#22c55e]">{fmt(cashNeeded)}</p>
        </div>
      </div>

      {/* Custos de aquisição */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[#f4f4f5]">Custos de Aquisição</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ITBI (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                {...register('acquisitionCosts.itbiPercent', { valueAsNumber: true })}
                className={`${fieldClass} pr-8`}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#52525b]">
                %
              </span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Cartório (R$)</label>
            <Controller
              control={control}
              name="acquisitionCosts.cartorio"
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
            <label className={labelClass}>Reformas (R$)</label>
            <Controller
              control={control}
              name="acquisitionCosts.reforms"
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
        </div>
      </div>

      <div className="border-t border-[#27272a]" />

      {/* Financiamento */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#f4f4f5]">Financiamento Bancário</p>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" {...register('financing.enabled')} className="sr-only" />
            <div
              onClick={() => setValue('financing.enabled', !isEnabled)}
              className={`relative h-5 w-9 cursor-pointer transition-colors ${
                isEnabled ? 'bg-[#16a34a]' : 'bg-[#27272a]'
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 bg-[#f4f4f5] transition-transform ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-mono text-xs text-[#52525b]">
              {isEnabled ? 'Com financiamento' : 'À vista'}
            </span>
          </label>
        </div>

        {isEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Entrada (R$)</label>
              <Controller
                control={control}
                name="financing.downPayment"
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
              <label className={labelClass}>Taxa de juros (% a.a.)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  {...register('financing.interestRateYear', { valueAsNumber: true })}
                  className={`${fieldClass} pr-8`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#52525b]">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Prazo (meses)</label>
              <input
                type="number"
                {...register('financing.termMonths', { valueAsNumber: true })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sistema de Amortização</label>
              <select {...register('financing.system')} className={fieldClass}>
                <option value="SAC">SAC — Amortização Constante</option>
                <option value="PRICE">PRICE — Parcela Fixa</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="border border-[#27272a] px-5 py-2.5 text-sm font-medium text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa]"
        >
          ← Voltar
        </button>
        <button
          type="submit"
          className="bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#16a34a]"
        >
          Próximo: Receitas & Despesas →
        </button>
      </div>
    </form>
  );
}
