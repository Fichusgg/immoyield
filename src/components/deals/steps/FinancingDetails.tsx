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
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-bold">Acquisition Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs">ITBI (%)</label>
            <input
              type="number"
              step="0.01"
              {...register('acquisitionCosts.itbiPercent', { valueAsNumber: true })}
              className="w-full rounded border p-2 text-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs">Cartorio (R$)</label>
            <input
              type="number"
              {...register('acquisitionCosts.cartorio', { valueAsNumber: true })}
              className="w-full rounded border p-2 text-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs">Reforms (R$)</label>
            <input
              type="number"
              {...register('acquisitionCosts.reforms', { valueAsNumber: true })}
              className="w-full rounded border p-2 text-black"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('financing.enabled')}
            id="f-enabled"
            className="h-4 w-4"
          />
          <label htmlFor="f-enabled" className="cursor-pointer font-bold">
            Use Financing?
          </label>
        </div>

        {isFinancingEnabled && (
          <div className="animate-in fade-in slide-in-from-top-1 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs">Down Payment (R$)</label>
              <input
                type="number"
                {...register('financing.downPayment', { valueAsNumber: true })}
                className="w-full rounded border p-2 text-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs">Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                {...register('financing.interestRateYear', { valueAsNumber: true })}
                className="w-full rounded border p-2 text-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs">Loan Term (months)</label>
              <input
                type="number"
                {...register('financing.termMonths', { valueAsNumber: true })}
                className="w-full rounded border p-2 text-black"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs">Amortization System</label>
              <select
                {...register('financing.system')}
                className="w-full rounded border p-2 text-black"
              >
                <option value="SAC">SAC (Constant Amortization)</option>
                <option value="PRICE">PRICE (Fixed Installments)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-1/3 rounded border p-2 text-black hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          className="w-2/3 rounded bg-blue-600 p-2 font-bold text-white transition-colors hover:bg-blue-700"
        >
          Next: Revenue
        </button>
      </div>
    </form>
  );
}
