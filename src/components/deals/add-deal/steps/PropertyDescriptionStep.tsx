'use client';

import { useFormContext } from 'react-hook-form';

import type { DealInputs } from '@/components/deals/add-deal/Wizard';

export function PropertyDescriptionStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DealInputs>();

  return (
    <div className="space-y-10">
      <section>
        <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
          DESCRIÇÃO DO IMÓVEL
        </p>

        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-[220px_1fr] items-start gap-8">
            <div>
              <label className="text-sm font-semibold text-[#F0EFEB]">Nome do Imóvel</label>
              <p className="mt-1 text-xs text-[#737373]">Aparecerá no painel e nos relatórios.</p>
            </div>
            <div>
              <input
                className="h-12 w-full rounded-xl border border-[#e5e5e3] bg-white px-4 text-sm transition-shadow outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="ex. Apto. Vila Mariana"
                {...register('property.name')}
                aria-invalid={!!errors.property?.name}
              />
              {errors.property?.name?.message && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {errors.property.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[220px_1fr] items-start gap-8">
            <div>
              <label className="text-sm font-semibold text-[#F0EFEB]">Descrição Resumida</label>
              <p className="mt-1 text-xs text-[#737373]">
                Adicione um resumo rápido (bairro, estado, estratégia).
              </p>
            </div>
            <div>
              <textarea
                rows={5}
                className="w-full resize-none rounded-xl border border-[#e5e5e3] bg-white px-4 py-3 text-sm leading-6 transition-shadow outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Notas opcionais para lembrar o que torna este negócio único…"
                {...register('property.description')}
                aria-invalid={!!errors.property?.description}
              />
              <p className="mt-2 text-xs text-[#a3a3a1]">
                Seja breve — você pode adicionar detalhes depois.
              </p>
              {errors.property?.description?.message && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {errors.property.description.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[220px_1fr] items-start gap-8">
            <div>
              <label className="text-sm font-semibold text-[#F0EFEB]">Tags e Etiquetas</label>
              <p className="mt-1 text-xs text-[#737373]">
                Tags separadas por vírgula para organizar e filtrar.
              </p>
            </div>
            <div>
              <input
                className="h-12 w-full rounded-xl border border-[#e5e5e3] bg-white px-4 text-sm transition-shadow outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="ex. duplex, off-market, valor agregado"
                {...register('property.tags')}
                aria-invalid={!!errors.property?.tags}
              />
              {errors.property?.tags?.message && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {errors.property.tags.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e5e5e3] bg-[#f5f5f3] p-6">
        <p className="text-[11px] font-bold tracking-widest text-[#737373] uppercase">Dica</p>
        <p className="mt-2 text-sm text-[#F0EFEB]">
          Use uma convenção de nomenclatura consistente (endereço + número de unidades) para manter
          seu portfólio organizado.
        </p>
      </section>
    </div>
  );
}
