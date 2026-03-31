'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';

const stepSchema = z.object({
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
  'w-full rounded-lg border border-[#e5e5e3] bg-[#f5f5f3] px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#a3a3a1] outline-none transition-colors focus:border-[#1a1a1a] focus:bg-white';

const labelClass =
  'mb-1.5 block text-[10px] font-semibold tracking-widest text-[#737373] uppercase';

export function FinancingDetails() {
  const { formData, updateFormData, setStep } = useDealStore();
  const { register, handleSubmit, control } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      acquisitionCosts: {
        itbiPercent: (formData.acquisitionCosts?.itbiPercent ?? 0) * 100,
        cartorio: formData.acquisitionCosts?.cartorio ?? 0,
        reforms: formData.acquisitionCosts?.reforms ?? 0,
      },
      financing: {
        enabled: formData.financing?.enabled ?? true,
        downPayment: formData.financing?.downPayment ?? 0,
        interestRateYear: formData.financing?.interestRateYear ?? 0,
        termMonths: formData.financing?.termMonths ?? 360,
        system: formData.financing?.system ?? 'SAC',
      },
    },
  });

  const isFinancingEnabled = useWatch({ control, name: 'financing.enabled' });

  const onSubmit = (data: StepData) => {
    updateFormData({
      acquisitionCosts: {
        ...data.acquisitionCosts,
        itbiPercent: data.acquisitionCosts.itbiPercent / 100,
      },
      financing: data.financing,
    });
    setStep(3);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Acquisition costs */}
      <div>
        <p className="mb-4 text-sm font-semibold text-[#1a1a1a]">Custos de Aquisição</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>ITBI (%)</label>
            <input
              type="number"
              step="0.01"
              {...register('acquisitionCosts.itbiPercent', { valueAsNumber: true })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cartório (R$)</label>
            <input
              type="number"
              {...register('acquisitionCosts.cartorio', { valueAsNumber: true })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Reformas (R$)</label>
            <input
              type="number"
              {...register('acquisitionCosts.reforms', { valueAsNumber: true })}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#e5e5e3]" />

      {/* Financing toggle */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1a1a1a]">Financiamento</p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register('financing.enabled')}
              id="f-enabled"
              className="sr-only"
            />
            <div
              className={`relative h-5 w-9 rounded-full transition-colors ${
                isFinancingEnabled ? 'bg-[#1a5c3a]' : 'bg-[#e5e5e3]'
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isFinancingEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs text-[#737373]">
              {isFinancingEnabled ? 'Ativado' : 'À vista'}
            </span>
          </label>
        </div>

        {isFinancingEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Entrada (R$)</label>
              <input
                type="number"
                {...register('financing.downPayment', { valueAsNumber: true })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Taxa de juros (% a.a.)</label>
              <input
                type="number"
                step="0.1"
                {...register('financing.interestRateYear', { valueAsNumber: true })}
                className={fieldClass}
              />
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
              <label className={labelClass}>Sistema de amortização</label>
              <select {...register('financing.system')} className={fieldClass}>
                <option value="SAC">SAC (Amortização Constante)</option>
                <option value="PRICE">PRICE (Parcela Fixa)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-lg border border-[#e5e5e3] px-5 py-2.5 text-sm font-medium text-[#737373] transition-colors hover:bg-[#f5f5f3] hover:text-[#1a1a1a]"
        >
          Voltar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
        >
          Próximo →
        </button>
      </div>
    </form>
  );
}
