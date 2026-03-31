'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';

const stepSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  purchasePrice: z.number().positive('Informe um valor positivo'),
  propertyType: z.string().optional(),
  appreciationRate: z.number().optional(),
});

type StepData = z.infer<typeof stepSchema>;

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residencial' },
  { value: 'airbnb', label: 'Airbnb / Temporada' },
  { value: 'flip', label: 'Reforma e Venda' },
  { value: 'multifamily', label: 'Multifamiliar' },
  { value: 'commercial', label: 'Comercial' },
];

const fieldClass =
  'w-full rounded-lg border border-[#e5e5e3] bg-[#f5f5f3] px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#a3a3a1] outline-none transition-colors focus:border-[#1a1a1a] focus:bg-white';

const labelClass =
  'mb-1.5 block text-[10px] font-semibold tracking-widest text-[#737373] uppercase';

const errorClass = 'mt-1 text-xs text-red-500';

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
      purchasePrice: formData.purchasePrice || undefined,
      propertyType: 'residential',
      appreciationRate: 5.0,
    },
  });

  const onSubmit = (data: StepData) => {
    updateFormData({ name: data.name, purchasePrice: data.purchasePrice });
    setStep(2);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nome do negócio */}
      <div>
        <label className={labelClass}>Nome do Negócio</label>
        <input {...register('name')} placeholder="Ex: Apto. Vila Mariana" className={fieldClass} />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      {/* Tipo + Valor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tipo de Imóvel</label>
          <select {...register('propertyType')} className={fieldClass}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Valor de Compra</label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#a3a3a1]">
              R$
            </span>
            <input
              type="number"
              {...register('purchasePrice', { valueAsNumber: true })}
              placeholder="0,00"
              className={`${fieldClass} pl-9`}
            />
          </div>
          {errors.purchasePrice && <p className={errorClass}>{errors.purchasePrice.message}</p>}
        </div>
      </div>

      {/* Valorização */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Valorização Anual Est.</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              {...register('appreciationRate', { valueAsNumber: true })}
              defaultValue={5.0}
              className={`${fieldClass} pr-9`}
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[#a3a3a1]">
              %
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <span className="text-sm text-[#a3a3a1]">Voltar</span>
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
