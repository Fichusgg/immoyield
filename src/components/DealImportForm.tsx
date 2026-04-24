'use client';

/**
 * DealImportForm
 *
 * Flow:
 *  1. User pastes a ZAP / VivaReal / QuintoAndar listing URL
 *  2. Clicks "Buscar dados" → calls POST /api/parse-listing
 *  3. All available fields autofill with a highlight animation
 *  4. Missing required fields are marked with an orange border
 *  5. User reviews, fills gaps, then clicks "Salvar imóvel"
 *  6. Deal is inserted to Supabase deals table
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParseListing } from '@/hooks/useParseListing';
import type { ScrapedProperty } from '@/lib/scrapers/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  description: string;
  notes: string;
  sourceUrl: string;
}

// Read-only scraped analytics shown in a separate panel
interface ScrapedMeta {
  pricePerSqm?: number;
  marketValue?: number;
  marketPricePerSqm?: number;
}

interface DealImportFormProps {
  onSuccess?: (dealId: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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
  description: '',
  notes: '',
  sourceUrl: '',
};

const REQUIRED_FIELDS: (keyof DealFormData)[] = ['title', 'listingType', 'price', 'city'];

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapScrapedToForm(scraped: ScrapedProperty): Partial<DealFormData> {
  return {
    title: scraped.title ?? '',
    type: scraped.type ?? 'apartment',
    listingType: scraped.listingType ?? 'sale',
    price: scraped.price != null ? String(scraped.price) : '',
    condoFee: scraped.condoFee != null ? String(scraped.condoFee) : '',
    iptu: scraped.iptu != null ? String(scraped.iptu) : '',
    area: scraped.area != null ? String(scraped.area) : '',
    bedrooms: scraped.bedrooms != null ? String(scraped.bedrooms) : '',
    bathrooms: scraped.bathrooms != null ? String(scraped.bathrooms) : '',
    suites: scraped.suites != null ? String(scraped.suites) : '',
    parkingSpots: scraped.parkingSpots != null ? String(scraped.parkingSpots) : '',
    street: scraped.address?.street ?? '',
    neighborhood: scraped.address?.neighborhood ?? '',
    city: scraped.address?.city ?? '',
    state: scraped.address?.state ?? '',
    zipCode: scraped.zipCode ?? scraped.address?.zipCode ?? '',
    agentName: scraped.agentName ?? '',
    description: scraped.description ?? '',
    sourceUrl: scraped.sourceUrl ?? '',
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DealImportForm({ onSuccess }: DealImportFormProps) {
  const [url, setUrl] = useState('');
  const [form, setForm] = useState<DealFormData>(EMPTY_FORM);
  const [scrapedMeta, setScrapedMeta] = useState<ScrapedMeta | null>(null);
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DealFormData, string>>>({});
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fetch: fetchListing, loading, error: fetchError } = useParseListing();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // ── Autofill ──────────────────────────────────────────────────────────────

  const autofill = useCallback((scraped: ScrapedProperty) => {
    const mapped = mapScrapedToForm(scraped);

    const filled = new Set<string>();
    for (const [key, value] of Object.entries(mapped)) {
      if (value !== '' && value != null) filled.add(key);
    }
    setFilledFields(filled);
    setForm(prev => ({ ...prev, ...mapped }));
    setPhotos(scraped.photos ?? []);
    setSelectedPhotoIdx(0);
    setShowForm(true);
    setScrapedMeta({
      pricePerSqm: scraped.pricePerSqm,
      marketValue: scraped.marketValue,
      marketPricePerSqm: scraped.marketPricePerSqm,
    });

    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    highlightTimeout.current = setTimeout(() => setFilledFields(new Set()), 2000);
  }, []);

  const handleFetch = async () => {
    if (!url.trim()) return;
    const result = await fetchListing(url.trim());
    if (result) autofill(result);
  };

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof DealFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof DealFormData, string>> = {};
    for (const field of REQUIRED_FIELDS) {
      if (!form[field]?.trim()) errors[field] = 'Obrigatório';
    }
    if (form.price && isNaN(Number(form.price))) errors.price = 'Deve ser um número';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaveLoading(true);
    setSaveError(null);

    if (!userId) {
      setSaveError('Você precisa estar logado para salvar.');
      setSaveLoading(false);
      return;
    }

    const price = form.price ? Number(form.price) : null;
    const area = form.area ? Number(form.area) : null;

    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: userId,
        title: form.title,
        type: form.type,
        listing_type: form.listingType,
        price,
        condo_fee: form.condoFee ? Number(form.condoFee) : null,
        iptu: form.iptu ? Number(form.iptu) : null,
        area,
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
        source_url: form.sourceUrl || null,
        photos: photos.length > 0 ? photos : null,
        // analytics from scraper
        price_per_sqm: scrapedMeta?.pricePerSqm ?? (price && area ? Math.round(price / area) : null),
        market_value: scrapedMeta?.marketValue ?? null,
        status: 'draft',
      })
      .select('id')
      .single();

    setSaveLoading(false);
    if (error) { setSaveError(error.message); return; }
    onSuccess?.(data.id);
  };

  // ── Field styling ─────────────────────────────────────────────────────────

  const isMissing = (field: keyof DealFormData) => showForm && !form[field]?.trim();
  const isHighlighted = (field: keyof DealFormData) => filledFields.has(field);

  const fc = (field: keyof DealFormData) => {
    const base = 'transition-all duration-300 rounded border px-3 py-2 text-sm w-full focus:outline-none focus:ring-2';
    if (formErrors[field]) return `${base} border-red-400 bg-red-50 focus:ring-red-100`;
    if (isHighlighted(field)) return `${base} border-[#4A7C59] bg-[#EBF3EE] ring-2 ring-[rgba(74,124,89,0.20)]`;
    if (isMissing(field) && REQUIRED_FIELDS.includes(field)) return `${base} border-orange-300 bg-orange-50`;
    return `${base} border-[#E2E0DA] bg-[#F0EFEB] text-[#1C2B20] placeholder:text-[#9CA3AF] focus:ring-[rgba(74,124,89,0.12)] focus:border-[#4A7C59]`;
  };

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">{text}</p>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── URL bar ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-[#6B7280] mb-2">
          Cole o link de qualquer anúncio imobiliário brasileiro (ZAP, VivaReal, QuintoAndar, ImovelWeb, OLX, Loft…).
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://www.zapimoveis.com.br/imovel/..."
            className="flex-1 rounded border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[rgba(74,124,89,0.12)]"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 rounded bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3D6B4F] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Buscando…
              </>
            ) : 'Buscar dados'}
          </button>
        </div>

        {fetchError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            ⚠ {fetchError}
          </p>
        )}
        {showForm && !fetchError && (
          <p className="mt-2 text-xs text-[#4A7C59] font-medium">
            Dados importados — campos verdes foram preenchidos automaticamente. Campos laranja precisam de atenção.
          </p>
        )}
      </div>

      {/* ── Photos ────────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <div className="rounded border border-[#E2E0DA] bg-[#FAFAF8] p-4">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">
            Fotos ({photos.length})
          </p>
          <div className="flex gap-2 flex-wrap">
            {photos.slice(0, 8).map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedPhotoIdx(i)}
                className={`rounded overflow-hidden border-2 transition-all ${
                  selectedPhotoIdx === i ? 'border-[#4A7C59]' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} className="h-14 w-20 object-cover" />
              </button>
            ))}
          </div>
          {photos[selectedPhotoIdx] && (
            <div className="mt-3 rounded overflow-hidden border border-[#E2E0DA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[selectedPhotoIdx]} alt="Selecionada" className="w-full h-52 object-cover" />
            </div>
          )}
        </div>
      )}

      {/* ── Análise de preço (read-only, shown when scraped) ──────────────── */}
      {scrapedMeta && (scrapedMeta.pricePerSqm || scrapedMeta.marketValue || scrapedMeta.marketPricePerSqm) && (
        <div className="rounded border border-[#A8C5B2] bg-[#EBF3EE] px-4 py-3">
          <p className="text-[10px] font-semibold text-[#4A7C59] uppercase tracking-widest mb-2">
            Análise de preço
          </p>
          <div className="grid grid-cols-3 gap-3">
            {scrapedMeta.pricePerSqm != null && (
              <div>
                <p className="text-[10px] text-[#6B7280] mb-0.5">Preço / m²</p>
                <p className="text-sm font-semibold text-[#1C2B20]">{brl(scrapedMeta.pricePerSqm)}</p>
              </div>
            )}
            {scrapedMeta.marketValue != null && (
              <div>
                <p className="text-[10px] text-[#6B7280] mb-0.5">Valor de mercado</p>
                <p className="text-sm font-semibold text-[#1C2B20]">{brl(scrapedMeta.marketValue)}</p>
              </div>
            )}
            {scrapedMeta.marketPricePerSqm != null && (
              <div>
                <p className="text-[10px] text-[#6B7280] mb-0.5">Mercado / m²</p>
                <p className="text-sm font-semibold text-[#1C2B20]">{brl(scrapedMeta.marketPricePerSqm)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Deal form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-5">

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1C2B20]">Dados do imóvel</p>
          {showForm && (
            <span className="text-xs text-[#9CA3AF]">
              {REQUIRED_FIELDS.filter(f => !form[f]?.trim()).length > 0
                ? `${REQUIRED_FIELDS.filter(f => !form[f]?.trim()).length} campos obrigatórios pendentes`
                : 'Todos os campos obrigatórios preenchidos ✓'}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">
            Título <span className="text-orange-500">*</span>
          </label>
          <input
            name="title" value={form.title} onChange={handleChange}
            placeholder="Ex: Apartamento 3 quartos, Vila Madalena"
            className={fc('title')}
          />
          {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
        </div>

        {/* Type + Listing type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Tipo de imóvel</label>
            <select name="type" value={form.type} onChange={handleChange} className={fc('type')}>
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="commercial">Comercial</option>
              <option value="land">Terreno</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">
              Tipo de negócio <span className="text-orange-500">*</span>
            </label>
            <select name="listingType" value={form.listingType} onChange={handleChange} className={fc('listingType')}>
              <option value="sale">Venda</option>
              <option value="rent">Aluguel</option>
            </select>
            {formErrors.listingType && <p className="text-xs text-red-500 mt-1">{formErrors.listingType}</p>}
          </div>
        </div>

        {/* Valores */}
        <div>
          {sectionLabel('Valores')}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                {form.listingType === 'rent' ? 'Aluguel mensal' : 'Venda'}{' '}
                <span className="text-orange-500">*</span>
              </label>
              <input name="price" value={form.price} onChange={handleChange} type="number" placeholder="0" className={fc('price')} />
              {formErrors.price && <p className="text-xs text-red-500 mt-1">{formErrors.price}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Condomínio / mês</label>
              <input name="condoFee" value={form.condoFee} onChange={handleChange} type="number" placeholder="0" className={fc('condoFee')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">IPTU / ano</label>
              <input name="iptu" value={form.iptu} onChange={handleChange} type="number" placeholder="0" className={fc('iptu')} />
            </div>
          </div>
        </div>

        {/* Metragem e detalhes */}
        <div>
          {sectionLabel('Metragem e detalhes')}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Área (m²)</label>
              <input name="area" value={form.area} onChange={handleChange} type="number" placeholder="0" className={fc('area')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Quartos</label>
              <input name="bedrooms" value={form.bedrooms} onChange={handleChange} type="number" placeholder="0" className={fc('bedrooms')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Banheiros</label>
              <input name="bathrooms" value={form.bathrooms} onChange={handleChange} type="number" placeholder="0" className={fc('bathrooms')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Suítes</label>
              <input name="suites" value={form.suites} onChange={handleChange} type="number" placeholder="0" className={fc('suites')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Vagas</label>
              <input name="parkingSpots" value={form.parkingSpots} onChange={handleChange} type="number" placeholder="0" className={fc('parkingSpots')} />
            </div>
          </div>
        </div>

        {/* Localização */}
        <div>
          {sectionLabel('Localização')}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Rua</label>
              <input name="street" value={form.street} onChange={handleChange} placeholder="Rua..." className={fc('street')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Bairro</label>
              <input name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Bairro" className={fc('neighborhood')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">
                Cidade <span className="text-orange-500">*</span>
              </label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="São Paulo" className={fc('city')} />
              {formErrors.city && <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Estado</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="SP" maxLength={2} className={fc('state')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">CEP</label>
                <input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="00000-000" className={fc('zipCode')} />
              </div>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div>
          {sectionLabel('Descrição')}
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Descrição do imóvel importada do anúncio…"
            className={`${fc('description')} resize-none`}
          />
        </div>

        {/* Corretor + URL fonte */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Corretor / Imobiliária</label>
            <input name="agentName" value={form.agentName} onChange={handleChange} placeholder="Nome do corretor" className={fc('agentName')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">URL do anúncio</label>
            <input
              name="sourceUrl" value={form.sourceUrl} readOnly
              className="w-full rounded border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-xs text-[#9CA3AF] cursor-default truncate"
            />
          </div>
        </div>

        {/* Notas pessoais */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1">Notas pessoais</label>
          <textarea
            name="notes" value={form.notes} onChange={handleChange}
            rows={3} placeholder="Observações sobre o imóvel…"
            className="w-full rounded border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[rgba(74,124,89,0.12)] resize-none transition-colors"
          />
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Erro ao salvar: {saveError}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[#E2E0DA]">
          <button
            type="button"
            onClick={() => { setForm(EMPTY_FORM); setShowForm(false); setPhotos([]); setUrl(''); setScrapedMeta(null); }}
            className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Limpar formulário
          </button>
          <button
            type="submit" disabled={saveLoading}
            className="flex items-center gap-2 rounded bg-[#4A7C59] px-5 py-2 text-sm font-medium text-white hover:bg-[#3D6B4F] disabled:opacity-50 transition-colors"
          >
            {saveLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Salvando…
              </>
            ) : 'Salvar imóvel'}
          </button>
        </div>
      </form>
    </div>
  );
}
