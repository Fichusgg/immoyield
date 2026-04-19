'use client';

/**
 * DealForm — unified create/edit form for property deals.
 *
 * Fix 1: Dynamic fields based on listingType (sale | long_term_rent |
 *        short_term_rent | seasonal_rent).  Condo/IPTU visibility is controlled
 *        by a toggle in long-term rent mode; hidden for short-term/seasonal.
 *
 * Fix 2: Edit mode — pre-fills all fields from the existing SavedDeal and
 *        calls a Supabase UPDATE instead of INSERT on submission.
 *
 * Fix 3: Image upload — file picker with previews and per-image remove buttons.
 *        Uploads to the 'property-images' Supabase Storage bucket.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SavedDeal } from '@/lib/supabase/deals';
import { CurrencyInput } from '@/components/ui/currency-input';

// ── Form data shape ────────────────────────────────────────────────────────────
// All values are strings so HTML inputs stay controlled without coercion issues.

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
  description: string;
  notes: string;
}

// ── Listing types ─────────────────────────────────────────────────────────────

export const LISTING_TYPE_OPTIONS = [
  { value: 'sale', label: 'Venda' },
  { value: 'long_term_rent', label: 'Aluguel de Longa Duração' },
  { value: 'short_term_rent', label: 'Aluguel por Temporada (Airbnb)' },
  { value: 'seasonal_rent', label: 'Aluguel Sazonal' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyForm(): DealFormData {
  return {
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
    description: '',
    notes: '',
  };
}

/** Map a SavedDeal (DB row) back to form field strings. */
function fromDeal(deal: SavedDeal): DealFormData {
  // Normalise legacy listing_type values stored before the expanded enum.
  let listingType = deal.listing_type ?? 'sale';
  if (listingType === 'rent') listingType = 'long_term_rent';

  return {
    title: deal.title ?? '',
    type: deal.type ?? 'apartment',
    listingType,
    price: deal.price != null ? String(deal.price) : '',
    condoFee: deal.condo_fee != null ? String(deal.condo_fee) : '',
    iptu: deal.iptu != null ? String(deal.iptu) : '',
    area: deal.area != null ? String(deal.area) : '',
    bedrooms: deal.bedrooms != null ? String(deal.bedrooms) : '',
    bathrooms: deal.bathrooms != null ? String(deal.bathrooms) : '',
    suites: deal.suites != null ? String(deal.suites) : '',
    parkingSpots: deal.parking_spots != null ? String(deal.parking_spots) : '',
    street: deal.street ?? '',
    neighborhood: deal.neighborhood ?? '',
    city: deal.city ?? '',
    state: deal.state ?? '',
    zipCode: deal.zip_code ?? '',
    agentName: deal.agent_name ?? '',
    description: deal.description ?? '',
    notes: deal.notes ?? '',
  };
}

// ── Image upload ──────────────────────────────────────────────────────────────
// Uploads images to the 'property-images' Supabase Storage bucket.
// The bucket must have public access enabled (set in the Supabase dashboard).

async function uploadNewImages(files: File[], dealId: string): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = createClient();
  const uploaded: string[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${dealId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('property-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[DealForm] Image upload failed:', error.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(path);

    uploaded.push(publicUrl);
  }

  return uploaded;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const fc = (hasError: boolean) =>
  `w-full border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-400 bg-red-50 text-red-900 placeholder:text-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-[#E2E0DA] bg-[#F0EFEB] text-[#1C2B20] placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:ring-[rgba(74,124,89,0.12)]'
  }`;

const labelClass = 'mb-1 block text-xs font-medium text-[#6B7280]';
const sectionHeadClass =
  'mb-2 text-[10px] font-semibold tracking-widest text-[#9CA3AF] uppercase';

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  /** Provided in edit mode — the deal to be updated. */
  initialDeal?: SavedDeal;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DealForm({ mode, initialDeal }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // ── Core form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState<DealFormData>(
    initialDeal ? fromDeal(initialDeal) : emptyForm(),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DealFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Fix 1: Condo/IPTU toggle state (long-term rent only) ──────────────────
  // Default to true when editing a deal that already has non-zero condo/IPTU.
  const [includeCondoIptu, setIncludeCondoIptu] = useState(
    mode === 'edit'
      ? (initialDeal?.condo_fee != null && initialDeal.condo_fee > 0) ||
          (initialDeal?.iptu != null && initialDeal.iptu > 0)
      : false,
  );

  // ── Fix 3: Image state ────────────────────────────────────────────────────
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    initialDeal?.photos ?? [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // Revoke object URLs when they are removed or component unmounts.
  useEffect(() => {
    return () => {
      newPreviews.forEach(URL.revokeObjectURL);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the current user once on mount (needed for create mode).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // ── Fix 1: Derived visibility flags ───────────────────────────────────────
  const isSale = form.listingType === 'sale';
  const isLongTermRent = form.listingType === 'long_term_rent';
  const isShortTermRent = form.listingType === 'short_term_rent';
  const isSeasonalRent = form.listingType === 'seasonal_rent';

  // Price field label changes with deal type.
  const priceLabel = isSale
    ? 'Preço de venda'
    : isLongTermRent
      ? 'Aluguel mensal'
      : 'Diária média';

  // Condo/IPTU fields: always visible for Sale; toggled for Long-term rent;
  // hidden for Short-term and Seasonal.
  const showCondoIptuToggle = isLongTermRent;
  const showCondoIptu = isSale || (isLongTermRent && includeCondoIptu);

  // ── Form change handler ────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof DealFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // ── Fix 3: Image picker handler ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
    const previews = arr.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...arr]);
    setNewPreviews((prev) => [...prev, ...previews]);
    // Reset input so the same file can be selected again if removed.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<Record<keyof DealFormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Campo obrigatório';
    if (!form.city.trim()) errs.city = 'Campo obrigatório';
    if (!form.price.trim()) errs.price = 'Campo obrigatório';
    else if (isNaN(Number(form.price))) errs.price = 'Deve ser um número';
    if (form.condoFee && isNaN(Number(form.condoFee))) errs.condoFee = 'Deve ser um número';
    if (form.iptu && isNaN(Number(form.iptu))) errs.iptu = 'Deve ser um número';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── DB payload builder ─────────────────────────────────────────────────────
  const buildPayload = () => ({
    title: form.title,
    type: form.type,
    listing_type: form.listingType,
    price: form.price ? Number(form.price) : null,
    // Only persist condo/IPTU when the field is visible and has a value.
    condo_fee: showCondoIptu && form.condoFee ? Number(form.condoFee) : null,
    iptu: showCondoIptu && form.iptu ? Number(form.iptu) : null,
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
    description: form.description || null,
    notes: form.notes || null,
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    const supabase = createClient();

    try {
      if (mode === 'create') {
        if (!userId) {
          setSaveError('Você precisa estar logado para salvar.');
          setSaving(false);
          return;
        }

        // Insert the deal first to get an ID for the storage path.
        const { data, error: insertError } = await supabase
          .from('deals')
          .insert({ ...buildPayload(), user_id: userId, status: 'draft' })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Upload images and attach the resulting URLs.
        const uploaded = await uploadNewImages(newFiles, data.id);
        const allPhotos = [...existingPhotos, ...uploaded];
        if (allPhotos.length > 0) {
          await supabase.from('deals').update({ photos: allPhotos }).eq('id', data.id);
        }

        router.push(`/imoveis/${data.id}`);
      } else {
        // Edit mode — update the existing deal.
        if (!initialDeal) return;

        const uploaded = await uploadNewImages(newFiles, initialDeal.id);
        const allPhotos = [...existingPhotos, ...uploaded];

        const { error: updateError } = await supabase
          .from('deals')
          .update({ ...buildPayload(), photos: allPhotos })
          .eq('id', initialDeal.id);

        if (updateError) throw updateError;

        router.push(`/imoveis/${initialDeal.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      setSaveError(msg);
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href={mode === 'edit' && initialDeal ? `/imoveis/${initialDeal.id}` : '/propriedades'}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A7C59] hover:underline"
        >
          <ArrowLeft size={12} />
          {mode === 'edit' ? 'Voltar ao imóvel' : 'Voltar para imóveis'}
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-[#1C2B20]">
          {mode === 'edit' ? 'Editar imóvel' : 'Adicionar imóvel'}
        </h1>
        {mode === 'edit' && initialDeal && (
          <p className="mt-0.5 text-sm text-[#6B7280]">{initialDeal.title}</p>
        )}
      </div>

      <div className="rounded border border-[#E2E0DA] bg-[#FAFAF8] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        {/* ── Title ──────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <label className={labelClass}>
            Título <span className="text-orange-500">*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Ex: Apartamento 3 quartos, Vila Madalena"
            className={fc(!!errors.title)}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* ── Type + Listing type ─────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tipo de imóvel</label>
            <select name="type" value={form.type} onChange={handleChange} className={fc(false)}>
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="commercial">Comercial</option>
              <option value="land">Terreno</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            {/* Fix 1: Expanded deal type selector */}
            <label className={labelClass}>
              Tipo de negócio <span className="text-orange-500">*</span>
            </label>
            <select
              name="listingType"
              value={form.listingType}
              onChange={handleChange}
              className={fc(!!errors.listingType)}
            >
              {LISTING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Fix 1: Financials — dynamic based on deal type ──────────────── */}
        <div className="mb-6">
          <p className={sectionHeadClass}>Financeiro (R$)</p>

          {/* Short-term / Seasonal helper text */}
          {(isShortTermRent || isSeasonalRent) && (
            <p className="mb-3 text-xs text-[#6B7280]">
              Para locação por temporada, informe a diária média. Condomínio e IPTU não são
              aplicáveis aqui — eles fazem parte do custo do proprietário.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {/* Main price field — label changes with deal type */}
            <div>
              <label className={labelClass}>
                {priceLabel} <span className="text-orange-500">*</span>
              </label>
              <CurrencyInput
                value={Number(form.price) || undefined}
                onValueChange={(v) => {
                  setForm((prev) => ({ ...prev, price: v != null ? String(v) : '' }));
                  if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="0"
                className={fc(!!errors.price)}
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
            </div>

            {/* Fix 1: Condo fee — always visible for Sale; hidden for short-term */}
            {showCondoIptu && (
              <div>
                <label className={labelClass}>
                  Condomínio / mês{!isSale && ' (opcional)'}
                </label>
                <CurrencyInput
                  value={Number(form.condoFee) || undefined}
                  onValueChange={(v) => {
                    setForm((prev) => ({ ...prev, condoFee: v != null ? String(v) : '' }));
                    if (errors.condoFee) setErrors((prev) => ({ ...prev, condoFee: undefined }));
                  }}
                  placeholder="0"
                  className={fc(!!errors.condoFee)}
                />
                {errors.condoFee && (
                  <p className="mt-1 text-xs text-red-500">{errors.condoFee}</p>
                )}
              </div>
            )}

            {/* Fix 1: IPTU — always visible for Sale; hidden for short-term */}
            {showCondoIptu && (
              <div>
                <label className={labelClass}>
                  IPTU / ano{!isSale && ' (opcional)'}
                </label>
                <CurrencyInput
                  value={Number(form.iptu) || undefined}
                  onValueChange={(v) => {
                    setForm((prev) => ({ ...prev, iptu: v != null ? String(v) : '' }));
                    if (errors.iptu) setErrors((prev) => ({ ...prev, iptu: undefined }));
                  }}
                  placeholder="0"
                  className={fc(!!errors.iptu)}
                />
                {errors.iptu && <p className="mt-1 text-xs text-red-500">{errors.iptu}</p>}
              </div>
            )}
          </div>

          {/* Fix 1: Toggle for long-term rent — reduces clutter for common case */}
          {showCondoIptuToggle && (
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={includeCondoIptu}
                  onChange={(e) => setIncludeCondoIptu(e.target.checked)}
                />
                <div
                  className={`relative h-5 w-9 transition-colors ${
                    includeCondoIptu ? 'bg-[#3D6B4F]' : 'bg-[#E2E0DA]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 bg-[#1C2B20] transition-transform ${
                      includeCondoIptu ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-xs text-[#6B7280]">Incluir condomínio e IPTU</span>
              </label>
            </div>
          )}
        </div>

        {/* ── Specs ──────────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <p className={sectionHeadClass}>Especificações</p>
          <div className="grid grid-cols-5 gap-3">
            {[
              { name: 'area' as const, label: 'Área (m²)' },
              { name: 'bedrooms' as const, label: 'Quartos' },
              { name: 'bathrooms' as const, label: 'Banheiros' },
              { name: 'suites' as const, label: 'Suítes' },
              { name: 'parkingSpots' as const, label: 'Vagas' },
            ].map((f) => (
              <div key={f.name}>
                <label className={labelClass}>{f.label}</label>
                <input
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={fc(false)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Location ───────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <p className={sectionHeadClass}>Localização</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Rua</label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                placeholder="Rua..."
                className={fc(false)}
              />
            </div>
            <div>
              <label className={labelClass}>Bairro</label>
              <input
                name="neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
                placeholder="Bairro"
                className={fc(false)}
              />
            </div>
            <div>
              <label className={labelClass}>
                Cidade <span className="text-orange-500">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="São Paulo"
                className={fc(!!errors.city)}
              />
              {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Estado</label>
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="SP"
                  maxLength={2}
                  className={fc(false)}
                />
              </div>
              <div>
                <label className={labelClass}>CEP</label>
                <input
                  name="zipCode"
                  value={form.zipCode}
                  onChange={handleChange}
                  placeholder="00000-000"
                  className={fc(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Agent + Description + Notes ────────────────────────────────────── */}
        <div className="mb-6 space-y-4">
          <div>
            <label className={labelClass}>Corretor / Imobiliária</label>
            <input
              name="agentName"
              value={form.agentName}
              onChange={handleChange}
              placeholder="Nome do corretor"
              className={fc(false)}
            />
          </div>
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Breve descrição do imóvel..."
              className="w-full resize-none border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:ring-2 focus:ring-[rgba(74,124,89,0.12)] focus:outline-none"
            />
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Observações sobre o imóvel..."
              className="w-full resize-none border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:ring-2 focus:ring-[rgba(74,124,89,0.12)] focus:outline-none"
            />
          </div>
        </div>

        {/* ── Fix 3: Image upload section ────────────────────────────────────── */}
        <div>
          <p className={sectionHeadClass}>Imagens do imóvel</p>

          {/* Grid of existing photos (edit mode) + new previews */}
          {(existingPhotos.length > 0 || newPreviews.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {/* Existing photos from the DB */}
              {existingPhotos.map((url, i) => (
                <div key={`existing-${i}`} className="relative h-24 w-24 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full border border-[#E2E0DA] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    aria-label="Remover foto"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* New image previews (object URLs — not yet uploaded) */}
              {newPreviews.map((url, i) => (
                <div key={`new-${i}`} className="relative h-24 w-24 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Nova foto ${i + 1}`}
                    className="h-full w-full border border-[#4A7C59] object-cover opacity-90"
                  />
                  {/* Green border indicates "pending upload" */}
                  <div className="absolute bottom-0 left-0 right-0 bg-[#4A7C59]/80 px-1 py-0.5 text-[9px] font-medium text-white">
                    Nova
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    aria-label="Remover foto"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
            id="image-upload-input"
          />

          {/* Visible upload trigger */}
          <label
            htmlFor="image-upload-input"
            className="inline-flex cursor-pointer items-center gap-2 border border-dashed border-[#A8C5B2] bg-[#EBF3EE] px-4 py-2.5 text-xs font-medium text-[#4A7C59] transition-colors hover:bg-[#d8eade]"
          >
            <ImagePlus size={14} />
            Selecionar imagens
          </label>
          <p className="mt-1.5 text-[10px] text-[#9CA3AF]">
            Formatos aceitos: JPG, PNG, WEBP. As imagens são enviadas ao salvar.
          </p>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {saveError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          Erro ao salvar: {saveError}
        </p>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end border-t border-[#E2E0DA] pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[#4A7C59] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner />
              Salvando…
            </>
          ) : mode === 'edit' ? (
            'Salvar alterações'
          ) : (
            'Salvar imóvel'
          )}
        </button>
      </div>
    </form>
  );
}
