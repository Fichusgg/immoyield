'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DealImportForm from '@/components/DealImportForm';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealFormData {
  title: string;
  type: string;
  listingType: string;
  price: string;
  condoFee: string;
  iptu: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  suites: string;
  parkingSpots: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  agentName: string;
  notes: string;
}

const EMPTY_FORM: DealFormData = {
  title: '',
  type: 'apartment',
  listingType: 'sale',
  price: '',
  condoFee: '',
  iptu: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  suites: '',
  parkingSpots: '',
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  agentName: '',
  notes: '',
};

const REQUIRED: (keyof DealFormData)[] = ['title', 'listingType', 'price', 'city'];

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── ManualDealForm ────────────────────────────────────────────────────────────

function ManualDealForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [form, setForm] = useState<DealFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof DealFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof DealFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof DealFormData, string>> = {};
    for (const f of REQUIRED) {
      if (!form[f]?.trim()) errs[f] = 'Campo obrigatório';
    }
    if (form.price && isNaN(Number(form.price))) errs.price = 'Deve ser um número';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    if (!userId) {
      setSaveError('Você precisa estar logado para salvar.');
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: userId,
        title: form.title,
        type: form.type,
        listing_type: form.listingType,
        price: form.price ? Number(form.price) : null,
        condo_fee: form.condoFee ? Number(form.condoFee) : null,
        iptu: form.iptu ? Number(form.iptu) : null,
        area: form.area ? Number(form.area) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        suites: form.suites ? Number(form.suites) : null,
        parking_spots: form.parkingSpots ? Number(form.parkingSpots) : null,
        street: form.street || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zipCode || null,
        agent_name: form.agentName || null,
        notes: form.notes || null,
        status: 'draft',
      })
      .select('id')
      .single();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    onSuccess(data.id);
  };

  // Input class: error state overrides, otherwise design token defaults
  const fc = (field: keyof DealFormData) =>
    `w-full rounded px-3 py-2 text-sm border transition-colors focus:outline-none focus:ring-2 ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:ring-red-100 focus:border-red-400'
        : 'border-[#E2E0DA] bg-[#F0EFEB] text-[#1C2B20] placeholder:text-[#9CA3AF] focus:ring-[rgba(74,124,89,0.12)] focus:border-[#4A7C59]'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#6B7280]">
          Título <span className="text-orange-500">*</span>
        </label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Ex: Apartamento 3 quartos, Vila Madalena"
          className={fc('title')}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Type + Listing type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">Tipo de imóvel</label>
          <select name="type" value={form.type} onChange={handleChange} className={fc('type')}>
            <option value="apartment">Apartamento</option>
            <option value="house">Casa</option>
            <option value="commercial">Comercial</option>
            <option value="land">Terreno</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6B7280]">
            Tipo de negócio <span className="text-orange-500">*</span>
          </label>
          <select
            name="listingType"
            value={form.listingType}
            onChange={handleChange}
            className={fc('listingType')}
          >
            <option value="sale">Venda</option>
            <option value="rent">Aluguel</option>
          </select>
          {errors.listingType && <p className="mt-1 text-xs text-red-500">{errors.listingType}</p>}
        </div>
      </div>

      {/* Financials */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#9CA3AF] uppercase">
          Financeiro (R$)
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">
              {form.listingType === 'rent' ? 'Aluguel mensal' : 'Preço de venda'}{' '}
              <span className="text-orange-500">*</span>
            </label>
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              type="number"
              placeholder="0"
              className={fc('price')}
            />
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">
              Condomínio / mês
            </label>
            <input
              name="condoFee"
              value={form.condoFee}
              onChange={handleChange}
              type="number"
              placeholder="0"
              className={fc('condoFee')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">IPTU / ano</label>
            <input
              name="iptu"
              value={form.iptu}
              onChange={handleChange}
              type="number"
              placeholder="0"
              className={fc('iptu')}
            />
          </div>
        </div>
      </div>

      {/* Specs */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#9CA3AF] uppercase">
          Especificações
        </p>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: 'area' as const, label: 'Área (m²)' },
            { name: 'bedrooms' as const, label: 'Quartos' },
            { name: 'bathrooms' as const, label: 'Banheiros' },
            { name: 'suites' as const, label: 'Suítes' },
            { name: 'parkingSpots' as const, label: 'Vagas' },
          ].map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">{f.label}</label>
              <input
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                type="number"
                placeholder="0"
                className={fc(f.name)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#9CA3AF] uppercase">
          Localização
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Rua</label>
            <input
              name="street"
              value={form.street}
              onChange={handleChange}
              placeholder="Rua..."
              className={fc('street')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">Bairro</label>
            <input
              name="neighborhood"
              value={form.neighborhood}
              onChange={handleChange}
              placeholder="Bairro"
              className={fc('neighborhood')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6B7280]">
              Cidade <span className="text-orange-500">*</span>
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="São Paulo"
              className={fc('city')}
            />
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">Estado</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="SP"
                maxLength={2}
                className={fc('state')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">CEP</label>
              <input
                name="zipCode"
                value={form.zipCode}
                onChange={handleChange}
                placeholder="00000-000"
                className={fc('zipCode')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agent + Notes */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#6B7280]">
          Corretor / Imobiliária
        </label>
        <input
          name="agentName"
          value={form.agentName}
          onChange={handleChange}
          placeholder="Nome do corretor"
          className={fc('agentName')}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#6B7280]">Notas</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Observações sobre o imóvel..."
          className="w-full resize-none rounded border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:ring-2 focus:ring-[rgba(74,124,89,0.12)] focus:outline-none"
        />
      </div>

      {saveError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          Erro ao salvar: {saveError}
        </p>
      )}

      <div className="flex justify-end border-t border-[#E2E0DA] pt-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded bg-[#4A7C59] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner /> Salvando…
            </>
          ) : (
            'Salvar imóvel'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Mode = 'choose' | 'import' | 'manual';

export default function NewDealPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const router = useRouter();

  const handleSuccess = (dealId: string) => {
    router.push(`/imoveis/${dealId}`);
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 h-12 border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex h-full max-w-[900px] items-center px-6">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="text-sm font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <Link href="/propriedades" className="transition-colors hover:text-[#6B7280]">
              Imóveis
            </Link>
            <span>/</span>
            <span className="text-[#6B7280]">Novo imóvel</span>
            {mode !== 'choose' && (
              <>
                <span>/</span>
                <span className="text-[#1C2B20]">
                  {mode === 'import' ? 'Importar URL' : 'Entrada manual'}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[860px] px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-[#1C2B20]">Adicionar imóvel</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Importe dados de um portal ou preencha as informações manualmente.
          </p>
        </div>

        {/* ── Mode: choose ───────────────────────────────────────────────────── */}
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Option A — Import from URL */}
            <button
              type="button"
              onClick={() => handleModeChange('import')}
              className="group rounded border border-[#E2E0DA] bg-[#FAFAF8] p-6 text-left transition-all hover:border-[#4A7C59] hover:bg-[#EBF3EE] hover:shadow-[0_2px_8px_rgba(74,124,89,0.10)] focus:ring-2 focus:ring-[#4A7C59] focus:ring-offset-1 focus:outline-none"
            >
              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-[#EBF3EE] text-[#4A7C59] transition-colors group-hover:bg-[#4A7C59] group-hover:text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>

              <h2 className="mb-1 text-sm font-semibold text-[#1C2B20]">Importar de URL</h2>
              <p className="text-xs leading-relaxed text-[#6B7280]">
                Cole o link de um anúncio do ZAP Imóveis, VivaReal ou QuintoAndar para preencher os
                dados automaticamente.
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
                Continuar
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </button>

            {/* Option B — Enter manually */}
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className="group rounded border border-[#E2E0DA] bg-[#FAFAF8] p-6 text-left transition-all hover:border-[#4A7C59] hover:bg-[#EBF3EE] hover:shadow-[0_2px_8px_rgba(74,124,89,0.10)] focus:ring-2 focus:ring-[#4A7C59] focus:ring-offset-1 focus:outline-none"
            >
              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-[#F0EFEB] text-[#6B7280] transition-colors group-hover:bg-[#4A7C59] group-hover:text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>

              <h2 className="mb-1 text-sm font-semibold text-[#1C2B20]">Entrada manual</h2>
              <p className="text-xs leading-relaxed text-[#6B7280]">
                Preencha os dados do imóvel diretamente no formulário, sem precisar de um link de
                anúncio.
              </p>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
                Continuar
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </button>
          </div>
        )}

        {/* ── Mode: import / manual ─────────────────────────────────────────── */}
        {mode !== 'choose' && (
          <div>
            {/* Back + mode label */}
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center gap-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Trocar método
              </button>

              <span className="text-[#D0CEC8]">|</span>

              <span className="text-xs font-medium text-[#4A7C59]">
                {mode === 'import' ? 'Importar de URL' : 'Entrada manual'}
              </span>
            </div>

            {/* Form card */}
            <div className="rounded border border-[#E2E0DA] bg-[#FAFAF8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {mode === 'import' && <DealImportForm onSuccess={handleSuccess} />}
              {mode === 'manual' && <ManualDealForm onSuccess={handleSuccess} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
