'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';

const stepSchema = z.object({
  revenue: z.object({
    monthlyRent: z.number().positive(),
    vacancyRate: z.number().min(0).max(100),
  }),
  expenses: z.object({
    condo: z.number().min(0),
    iptu: z.number().min(0),
    managementPercent: z.number().min(0).max(100),
    maintenancePercent: z.number().min(0).max(100),
  }),
});

type StepData = z.infer<typeof stepSchema>;

export function RevenueExpenses() {
  const { formData, updateFormData, setStep } = useDealStore();
  const { register, handleSubmit } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      revenue: {
        monthlyRent: formData.revenue?.monthlyRent ?? 0,
        vacancyRate: (formData.revenue?.vacancyRate ?? 0) * 100,
      },
      expenses: {
        condo: formData.expenses?.condo ?? 0,
        iptu: formData.expenses?.iptu ?? 0,
        managementPercent: (formData.expenses?.managementPercent ?? 0) * 100,
        maintenancePercent: (formData.expenses?.maintenancePercent ?? 0) * 100,
      },
    },
  });

  const onSubmit = (data: StepData) => {
    updateFormData({
      revenue: {
        monthlyRent: data.revenue.monthlyRent,
        vacancyRate: data.revenue.vacancyRate / 100,
      },
      expenses: {
        condo: data.expenses.condo,
        iptu: data.expenses.iptu,
        managementPercent: data.expenses.managementPercent / 100,
        maintenancePercent: data.expenses.maintenancePercent / 100,
      },
    });
    setStep(4);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs">Monthly Rent (R$)</label>
          <input
            type="number"
            {...register('revenue.monthlyRent', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
        <div>
          <label className="text-xs">Vacancy Rate (%)</label>
          <input
            type="number"
            step="0.1"
            {...register('revenue.vacancyRate', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs">Condo (R$)</label>
          <input
            type="number"
            {...register('expenses.condo', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
        <div>
          <label className="text-xs">IPTU (Monthly)</label>
          <input
            type="number"
            {...register('expenses.iptu', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs">Management Fee (%)</label>
          <input
            type="number"
            step="0.1"
            {...register('expenses.managementPercent', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
        <div>
          <label className="text-xs">Maintenance Reserve (%)</label>
          <input
            type="number"
            step="0.1"
            {...register('expenses.maintenancePercent', { valueAsNumber: true })}
            className="w-full rounded border p-2 text-black"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setStep(2)} className="w-1/3 rounded border p-2">
          Back
        </button>
        <button type="submit" className="w-2/3 rounded bg-blue-600 p-2 font-bold text-white">
          Review Deal
        </button>
      </div>
    </form>
  );
}
