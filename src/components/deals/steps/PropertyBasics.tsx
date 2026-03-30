'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';

const stepSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  purchasePrice: z.number().positive('Must be a positive number'),
});

type StepData = z.infer<typeof stepSchema>;

export function PropertyBasics() {
  const { formData, updateFormData, setStep } = useDealStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      name: formData.name || '',
      purchasePrice: formData.purchasePrice || 0,
    },
  });

  const onSubmit = (data: StepData) => {
    updateFormData(data);
    setStep(2);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Property Name</label>
        <input {...register('name')} className="w-full rounded-md border p-2 text-black" />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Purchase Price (R$)</label>
        <input
          type="number"
          {...register('purchasePrice', { valueAsNumber: true })}
          className="w-full rounded-md border p-2 text-black"
        />
        {errors.purchasePrice && (
          <p className="mt-1 text-xs text-red-500">{errors.purchasePrice.message}</p>
        )}
      </div>

      <button type="submit" className="w-full rounded-md bg-blue-600 p-2 font-bold text-white">
        Next: Financing & Costs
      </button>
    </form>
  );
}
