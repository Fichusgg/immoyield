'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDealStore } from '@/store/useDealStore';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '@/lib/validations/deal';
import { ChevronDown } from 'lucide-react';

const stepSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  propertyType: z.enum(PROPERTY_TYPES),
  property: z.object({
    shortDescription: z.string().optional(),
    tagsAndLabels: z.string().optional(),

    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    squareFootage: z.number().int().min(0).optional(),
    yearBuilt: z.number().int().min(0).max(2100).optional(),
    parking: z.string().optional(),
    lotSizeSquareFeet: z.number().int().min(0).optional(),
    zoning: z.string().optional(),
    mlsNumber: z.string().optional(),

    address: z.object({
      streetAddress: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
    }),
  }),
});

type StepData = z.infer<typeof stepSchema>;

const fieldClass =
  'w-full border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4A7C59] focus:shadow-[0_0_0_2px_rgba(74,124,89,0.12)]';
const selectClass = `${fieldClass} appearance-none pr-9`;
const labelClass =
  'mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase';
const helperClass = 'mt-1 font-mono text-[10px] text-[#9CA3AF]';
const errorClass = 'mt-1 font-mono text-xs text-[#DC2626]';
const cardClass = 'border border-[#E2E0DA] bg-[#F8F7F4]';
const rowClass = 'grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-6';
const sectionTitleClass =
  'font-mono text-[11px] font-semibold tracking-[0.08em] text-[#9CA3AF] uppercase';

interface Props {
  onNext: () => void;
}

export function DadosImovel({ onNext }: Props) {
  const { formData, updateFormData } = useDealStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      name: formData.name ?? '',
      propertyType: formData.propertyType ?? PROPERTY_TYPES[0],
      property: {
        shortDescription: formData.property?.shortDescription ?? '',
        tagsAndLabels: formData.property?.tagsAndLabels ?? '',
        bedrooms: formData.property?.bedrooms ?? undefined,
        bathrooms: formData.property?.bathrooms ?? undefined,
        squareFootage: formData.property?.squareFootage ?? undefined,
        yearBuilt: formData.property?.yearBuilt ?? undefined,
        parking: formData.property?.parking ?? '',
        lotSizeSquareFeet: formData.property?.lotSizeSquareFeet ?? undefined,
        zoning: formData.property?.zoning ?? '',
        mlsNumber: formData.property?.mlsNumber ?? '',
        address: {
          streetAddress: formData.property?.address?.streetAddress ?? '',
          city: formData.property?.address?.city ?? '',
          region: formData.property?.address?.region ?? '',
          postalCode: formData.property?.address?.postalCode ?? '',
        },
      },
    },
  });

  const onSubmit = (data: StepData) => {
    updateFormData({
      name: data.name,
      propertyType: data.propertyType,
      property: data.property,
    });
    onNext();
  };

  const countOptions = ['', ...Array.from({ length: 11 }, (_, i) => String(i))];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className={cardClass}>
        <div className="border-b border-[#E2E0DA] px-5 py-4">
          <h3 className={sectionTitleClass}>Descrição do Imóvel</h3>
        </div>
        <div className="divide-y divide-[#E2E0DA]">
          <div className={rowClass}>
            <label htmlFor="property-name" className={labelClass}>
              Nome do Imóvel
            </label>
            <div>
              <input id="property-name" {...register('name')} className={fieldClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
          </div>

          <div className={rowClass}>
            <label htmlFor="short-description" className={labelClass}>
              Descrição Resumida
            </label>
            <div>
              <textarea
                id="short-description"
                {...register('property.shortDescription')}
                placeholder="Adicione uma descrição..."
                rows={3}
                className={`${fieldClass} resize-y py-2.5`}
              />
              <p className={helperClass}>Breve descrição para exibir nos relatórios.</p>
            </div>
          </div>

          <div className={rowClass}>
            <label htmlFor="tags-and-labels" className={labelClass}>
              Tags e Etiquetas
            </label>
            <div>
              <input
                id="tags-and-labels"
                {...register('property.tagsAndLabels')}
                className={fieldClass}
              />
              <p className={helperClass}>Separe por vírgula para categorizar o imóvel.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="border-b border-[#E2E0DA] px-5 py-4">
          <h3 className={sectionTitleClass}>Detalhes</h3>
        </div>
        <div className="divide-y divide-[#E2E0DA]">
          <div className={rowClass}>
            <label htmlFor="property-type" className={labelClass}>
              Tipo de Imóvel
            </label>
            <div>
              <div className="relative">
                <select id="property-type" {...register('propertyType')} className={selectClass}>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROPERTY_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              </div>
              <p className={helperClass}>
                Selecione o tipo para habilitar ferramentas específicas de análise.
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr] sm:gap-6">
                <label htmlFor="bedrooms" className={labelClass}>
                  Quartos
                </label>
                <div className="relative">
                  <select
                    id="bedrooms"
                    {...register('property.bedrooms', {
                      setValueAs: (v) => (v === '' ? undefined : Number(v)),
                    })}
                    className={selectClass}
                  >
                    {countOptions.map((o) => (
                      <option key={o} value={o}>
                        {o === '' ? 'Selecionar…' : o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr] sm:gap-6">
                <label htmlFor="bathrooms" className={labelClass}>
                  Banheiros
                </label>
                <div className="relative">
                  <select
                    id="bathrooms"
                    {...register('property.bathrooms', {
                      setValueAs: (v) => (v === '' ? undefined : Number(v)),
                    })}
                    className={selectClass}
                  >
                    {countOptions.map((o) => (
                      <option key={o} value={o}>
                        {o === '' ? 'Selecionar…' : o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
              </div>
            </div>
          </div>

          <div className={rowClass}>
            <label htmlFor="square-footage" className={labelClass}>
              Área (m²)
            </label>
            <input
              id="square-footage"
              type="number"
              {...register('property.squareFootage', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              className={fieldClass}
            />
          </div>

          <div className={rowClass}>
            <label htmlFor="year-built" className={labelClass}>
              Ano de Construção
            </label>
            <input
              id="year-built"
              type="number"
              {...register('property.yearBuilt', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
              className={fieldClass}
            />
          </div>

          <div className={rowClass}>
            <label htmlFor="parking" className={labelClass}>
              Estacionamento
            </label>
            <div className="relative">
              <select id="parking" {...register('property.parking')} className={selectClass}>
                <option value="">Selecionar…</option>
                <option value="none">Nenhum</option>
                <option value="street">Via pública</option>
                <option value="garage">Garagem</option>
                <option value="carport">Cobertura</option>
                <option value="assigned">Vaga demarcada</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
            </div>
          </div>

          <div className={rowClass}>
            <label htmlFor="lot-size" className={labelClass}>
              Tamanho do Lote
            </label>
            <div className="relative">
              <input
                id="lot-size"
                type="number"
                {...register('property.lotSizeSquareFeet', {
                  setValueAs: (v) => (v === '' ? undefined : Number(v)),
                })}
                className={`${fieldClass} pr-12`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[#9CA3AF]">
                m²
              </span>
            </div>
          </div>

          <div className={rowClass}>
            <label htmlFor="zoning" className={labelClass}>
              Zoneamento
            </label>
            <input id="zoning" {...register('property.zoning')} className={fieldClass} />
          </div>

          <div className={rowClass}>
            <label htmlFor="mls-number" className={labelClass}>
              Número MLS
            </label>
            <input id="mls-number" {...register('property.mlsNumber')} className={fieldClass} />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="border-b border-[#E2E0DA] px-5 py-4">
          <h3 className={sectionTitleClass}>Endereço</h3>
        </div>
        <div className="divide-y divide-[#E2E0DA]">
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="street-address" className={labelClass}>
                  Direção
                </label>
                <input
                  id="street-address"
                  {...register('property.address.streetAddress')}
                  placeholder="ex. Rua das Flores, 123"
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className={labelClass}>
                  Cidade
                </label>
                <input
                  id="city"
                  {...register('property.address.city')}
                  placeholder="ex. São Paulo"
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="region" className={labelClass}>
                  Estado
                </label>
                <input
                  id="region"
                  {...register('property.address.region')}
                  placeholder="ex. SP"
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="postal-code" className={labelClass}>
                  CEP
                </label>
                <input
                  id="postal-code"
                  {...register('property.address.postalCode')}
                  placeholder="ex. 01310-100"
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          className="bg-[#4A7C59] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] focus-visible:ring-2 focus-visible:ring-[#4A7C59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF8] focus-visible:outline-none"
        >
          Próximo: Compra & Custos →
        </button>
      </div>
    </form>
  );
}
