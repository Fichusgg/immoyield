'use client';

/**
 * UrlImportScreen
 *
 * Step that appears when the user chooses "Importar de URL" in PropertiesPage.
 * The user pastes a listing URL → we scrape it → seed the Zustand store →
 * caller mounts the DealWizard with pre-populated defaultValues.
 *
 * Props:
 *   onReady(prefilledCount)  — store is seeded, wizard can be shown
 *   onSkip                   — user wants to open the empty wizard directly
 *   onBack                   — go back to the entry-method choice
 */

import { useState, useRef, useEffect } from 'react';
import { useParseListing } from '@/hooks/useParseListing';
import { mapToWizardForm } from '@/lib/scrapers/mapToWizardForm';
import { useDealStore } from '@/store/useDealStore';
import { Link2, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const LOADING_STEPS = [
  { label: 'Acessando o anúncio…', delay: 0 },
  { label: 'Lendo estrutura da página…', delay: 2500 },
  { label: 'Extraindo dados do imóvel…', delay: 5000 },
  { label: 'Preenchendo o formulário…', delay: 8000 },
];

interface Props {
  propertyType: string;
  onReady: (prefilledCount: number) => void;
  onSkip: () => void;
  onBack: () => void;
}

const FEATURED_SITES = ['ZAP Imóveis', 'VivaReal', 'QuintoAndar', 'ImovelWeb', 'OLX', 'Loft'];

const inputClass =
  'w-full border border-[#E2E0DA] bg-[#F0EFEB] px-3 py-2.5 text-sm text-[#1C2B20] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#4A7C59] focus:shadow-[0_0_0_2px_rgba(74,124,89,0.12)]';

export default function UrlImportScreen({ propertyType, onReady, onSkip, onBack }: Props) {
  const [url, setUrl] = useState('');
  const { fetch: parseListing, loading, error } = useParseListing();
  const { reset, updateFormData, setPrefilledFields } = useDealStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      stepTimersRef.current.forEach(clearTimeout);
      stepTimersRef.current = LOADING_STEPS.slice(1).map((s, i) =>
        setTimeout(() => setLoadingStep(i + 1), s.delay),
      );
    } else {
      stepTimersRef.current.forEach(clearTimeout);
      stepTimersRef.current = [];
    }
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    const scraped = await parseListing(trimmed);

    // Even if scraping returned null we still open the wizard (with whatever
    // partial data we have). The caller handles the null case via onReady(0).
    reset();
    updateFormData({ propertyType: propertyType as any });

    if (scraped) {
      const { formData, prefilledFields } = mapToWizardForm(scraped);
      // Merge scraped data into store — property type from the category wins
      // unless the scraper detected a different type
      updateFormData({ ...formData, propertyType: propertyType as any });
      setPrefilledFields(prefilledFields);
      onReady(prefilledFields.length);
    } else {
      // Scraping failed — open the empty wizard so the user can fill manually
      setPrefilledFields([]);
      onReady(0);
    }
  };

  const handleSkip = () => {
    reset();
    updateFormData({ propertyType: propertyType as any });
    setPrefilledFields([]);
    onSkip();
  };

  return (
    <div className="max-w-xl">
      {/* Back link */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center border border-[#E2E0DA] bg-[#EBF3EE]">
          <Link2 size={18} className="text-[#4A7C59]" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-[#1C2B20]">
          Importar de URL
        </h2>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Cole o link de qualquer portal imobiliário brasileiro. Os campos do formulário serão preenchidos automaticamente.
        </p>
      </div>

      {/* URL form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="listing-url"
            className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase"
          >
            Link do anúncio
          </label>
          <input
            ref={inputRef}
            id="listing-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.zapimoveis.com.br/imovel/..."
            autoFocus
            className={inputClass}
            disabled={loading}
          />
        </div>

        {/* Supported sites */}
        <p className="font-mono text-[10px] text-[#9CA3AF]">
          Funciona com {FEATURED_SITES.join(', ')} e outros portais brasileiros.
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 border border-[#FECACA] bg-[#FEF2F2] p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#DC2626]" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#DC2626]">Não foi possível importar</p>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 bg-[#4A7C59] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {LOADING_STEPS[loadingStep]?.label ?? 'Importando…'}
              </>
            ) : (
              <>
                <Link2 size={14} />
                Importar e abrir formulário
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="px-4 py-2.5 text-sm text-[#6B7280] transition-colors hover:text-[#1C2B20] disabled:opacity-50"
          >
            Preencher manualmente →
          </button>
        </div>

        {/* Step progress dots during loading */}
        {loading && (
          <div className="flex items-center gap-2 pt-1">
            {LOADING_STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`h-1.5 flex-1 transition-all duration-500 ${
                  i <= loadingStep ? 'bg-[#4A7C59]' : 'bg-[#E2E0DA]'
                }`}
              />
            ))}
          </div>
        )}

        {/* On error, also offer to open the wizard anyway */}
        {error && (
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 text-xs text-[#4A7C59] underline underline-offset-2 hover:text-[#3D6B4F]"
          >
            Abrir formulário mesmo assim →
          </button>
        )}
      </form>

      {/* Divider + what gets imported */}
      <div className="mt-8 border-t border-[#E2E0DA] pt-6">
        <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#9CA3AF] uppercase">
          O que é importado
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-xs text-[#6B7280]">
          {[
            'Nome do imóvel',
            'Preço de venda',
            'Quartos e banheiros',
            'Área (m²)',
            'Endereço completo',
            'CEP',
            'Condomínio mensal',
            'IPTU mensal',
            'Descrição do anúncio',
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle2 size={10} className="shrink-0 text-[#4A7C59]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
