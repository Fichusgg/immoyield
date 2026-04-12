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
  'w-full border border-[#E2E0DA] bg-white px-3.5 py-2.5 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4A7C59] focus:shadow-[0_0_0_2px_rgba(74,124,89,0.12)]';
const labelClass =
  'mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase';

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
        <h2 className="text-base font-bold text-[#1C2B20]">Compra & Custos de Aquisição</h2>
        <p className="mt-0.5 text-sm text-[#9CA3AF]">
          ITBI, cartório, reformas e estrutura de financiamento.
        </p>
      </div>

      {/* Purchase price */}
      <div>
        <label className={labelClass}>Valor de Compra</label>
        <div className="relative">
          <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-medium text-[#9CA3AF]">
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
          <p className="mt-1 font-mono text-xs text-[#DC2626]">{errors.purchasePrice.message}</p>
        )}
      </div>

      {/* Live summary strip */}
      <div className="grid grid-cols-3 gap-px border border-[#E2E0DA] bg-[#E2E0DA] text-center">
        <div className="bg-[#F0EFEB] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
            ITBI estimado
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#1C2B20]">{fmt(itbiValue)}</p>
        </div>
        <div className="bg-[#F0EFEB] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
            Financiamento
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#1C2B20]">{fmt(loanAmount)}</p>
        </div>
        <div className="bg-[#F0EFEB] p-4">
          <p className="font-mono text-[9px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">
            Capital próprio
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-[#4A7C59]">{fmt(cashNeeded)}</p>
        </div>
      </div>

      {/* Custos de aquisição */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[#1C2B20]">Custos de Aquisição</p>
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
              <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
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

      <div className="border-t border-[#E2E0DA]" />

      {/* Financiamento */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1C2B20]">Financiamento Bancário</p>
          <label className="flex cursor-pointer items-center gap-2.5">
            {/*
              The <label> wraps the hidden checkbox, so ANY click anywhere on this
              label (including the visual toggle div below) naturally activates the
              checkbox via the browser's built-in label behaviour.
              Do NOT add a separate onClick to the inner div — that would fire a
              second state update on the same click and cancel the first one out,
              making the toggle appear broken when clicking the button area.
            */}
            <input type="checkbox" {...register('financing.enabled')} className="sr-only" />
            <div
              className={`relative h-5 w-9 transition-colors ${
                isEnabled ? 'bg-[#3D6B4F]' : 'bg-[#E2E0DA]'
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 bg-[#1C2B20] transition-transform ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="font-mono text-xs text-[#9CA3AF]">
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
                <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
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
          className="border border-[#E2E0DA] px-5 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
        >
          ← Voltar
        </button>
        <button
          type="submit"
          className="bg-[#4A7C59] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          Próximo: Receitas & Despesas →
        </button>
      </div>
    </form>
  );
}
