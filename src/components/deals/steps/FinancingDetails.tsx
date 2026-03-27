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
      }
    }
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
            <label className="text-xs block mb-1">ITBI (%)</label>
            <input type="number" step="0.01" {...register('acquisitionCosts.itbiPercent', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
          </div>
          <div>
            <label className="text-xs block mb-1">Cartorio (R$)</label>
            <input type="number" {...register('acquisitionCosts.cartorio', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
          </div>
          <div>
            <label className="text-xs block mb-1">Reforms (R$)</label>
            <input type="number" {...register('acquisitionCosts.reforms', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register('financing.enabled')} id="f-enabled" className="w-4 h-4" />
          <label htmlFor="f-enabled" className="font-bold cursor-pointer">Use Financing?</label>
        </div>

        {isFinancingEnabled && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
            <div>
              <label className="text-xs block mb-1">Down Payment (R$)</label>
              <input type="number" {...register('financing.downPayment', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
            </div>
            <div>
              <label className="text-xs block mb-1">Interest Rate (% p.a.)</label>
              <input type="number" step="0.1" {...register('financing.interestRateYear', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
            </div>
            <div>
              <label className="text-xs block mb-1">Loan Term (months)</label>
              <input type="number" {...register('financing.termMonths', { valueAsNumber: true })} className="w-full p-2 border rounded text-black" />
            </div>
            <div className="col-span-2">
              <label className="text-xs block mb-1">Amortization System</label>
              <select {...register('financing.system')} className="w-full p-2 border rounded text-black">
                <option value="SAC">SAC (Constant Amortization)</option>
                <option value="PRICE">PRICE (Fixed Installments)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <button type="button" onClick={() => setStep(1)} className="w-1/3 border p-2 rounded hover:bg-gray-50 text-black">Back</button>
        <button type="submit" className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-bold transition-colors">Next: Revenue</button>
      </div>
    </form>
  );
}
