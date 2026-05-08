'use client';

import { useDealStore } from '@/store/useDealStore';
import { DadosImovel } from './tabs/DadosImovel';
import { CompraECustos } from './tabs/CompraECustos';
import { ReceitasEDespesas } from './tabs/ReceitasEDespesas';
import { ProjecoesTab } from './tabs/ProjecoesTab';
import ResultsScreen, { AnalysisResult } from './ResultsScreen';
import { createClient } from '@/lib/supabase/client';
import { DealInput } from '@/lib/validations/deal';
import { useState, useEffect } from 'react';
import { PROPERTY_TYPE_LABELS } from '@/lib/validations/deal';

// Tab IDs are stable across strategies — only the middle tab's label/sub
// changes per strategy. Projeções (long-term valorization) lives on the
// per-deal Planilha and isn't part of the wizard.
const TAB_IDS = { dados: 0, compra: 1, receita: 2, revisar: 4 } as const;

interface TabDef {
  id: number;
  label: string;
  sub: string;
}

function buildTabs(propertyType: string): TabDef[] {
  const isAirbnb = propertyType === 'airbnb';
  const isFlip = propertyType === 'flip';
  const middle: TabDef = isFlip
    ? { id: TAB_IDS.receita, label: 'Reforma & Venda', sub: 'ARV, prazo e custo de venda' }
    : isAirbnb
      ? { id: TAB_IDS.receita, label: 'Aluguel', sub: 'Diária e ocupação' }
      : { id: TAB_IDS.receita, label: 'Aluguel', sub: 'Mensal e despesas' };

  return [
    { id: TAB_IDS.dados, label: 'Dados', sub: 'Descrição e endereço' },
    { id: TAB_IDS.compra, label: 'Compra', sub: 'Valor e financiamento' },
    middle,
    { id: TAB_IDS.revisar, label: 'Revisar', sub: 'Confirmar e calcular' },
  ];
}

interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

interface DealWizardProps {
  benchmarks?: Benchmarks;
  /** Called after user saves a deal from the results screen — used for inline mode */
  onSaved?: (dealId: string | null) => void;
}

/** Maps a prefilled-field key to its input's DOM id (for CSS tinting). */
const PREFILLED_FIELD_TO_ID: Record<string, string> = {
  name: 'property-name',
  propertyType: 'property-type',
  'property.shortDescription': 'short-description',
  'property.tagsAndLabels': 'tags-and-labels',
  'property.bedrooms': 'bedrooms',
  'property.bathrooms': 'bathrooms',
  'property.squareFootage': 'square-footage',
  'property.lotSizeSquareFeet': 'lot-size',
  'property.parking': 'parking',
  'property.mlsNumber': 'mls-number',
  'property.address.streetAddress': 'street-address',
  'property.address.city': 'city',
  'property.address.region': 'region',
  'property.address.postalCode': 'postal-code',
  'expenses.condo': 'condo-monthly',
  'expenses.iptu': 'iptu-monthly',
};

function buildPrefillCss(prefilledFields: string[]): string {
  const selectors = prefilledFields
    .map((f) => PREFILLED_FIELD_TO_ID[f])
    .filter(Boolean)
    .map((id) => `#${id}`)
    .join(', ');
  if (!selectors) return '';
  return `${selectors} { background-color: #EBF3EE !important; border-color: #A8C5B2 !important; }`;
}

export default function DealWizard({ benchmarks, onSaved }: DealWizardProps) {
  const { activeTab, setActiveTab, formData, reset, prefilledFields } = useDealStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthenticated(!!data.user));
  }, []);

  const propertyType = formData.propertyType ?? 'residential';

  // Projeções (id 3) is no longer a tab. If a persisted draft state has the
  // user parked there, bounce them forward to Revisar.
  useEffect(() => {
    if (activeTab === 3) setActiveTab(4);
  }, [activeTab, setActiveTab]);

  const calculateDeal = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch('/api/deals/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await response.json();
      if (response.ok && json.success) {
        setResult(json.data);
      } else {
        setApiError(json.error || 'Erro ao calcular.');
      }
    } catch {
      setApiError('Erro de rede. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setResult(null);
    setApiError(null);
  };

  if (result) {
    return (
      <ResultsScreen
        result={result}
        dealName={formData.name}
        inputs={formData as DealInput}
        onReset={handleReset}
        isAuthenticated={isAuthenticated}
        benchmarks={benchmarks}
        onSaved={onSaved}
      />
    );
  }

  const propertyLabel = PROPERTY_TYPE_LABELS[propertyType];
  const TABS = buildTabs(propertyType);
  const prefillCss = buildPrefillCss(prefilledFields);

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Pre-fill CSS injection ───────────────────────────────────────────── */}
      {prefillCss && <style>{prefillCss}</style>}

      {/* ── Pre-fill banner ──────────────────────────────────────────────────── */}
      {prefilledFields.length > 0 && (
        <div className="mb-5 flex items-center gap-2.5 border border-[#A8C5B2] bg-[#EBF3EE] px-4 py-2.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4A7C59"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <p className="text-xs text-[#3D6B4F]">
            <span className="font-semibold">
              {prefilledFields.length} campo{prefilledFields.length !== 1 ? 's' : ''} pré-preenchido{prefilledFields.length !== 1 ? 's' : ''}
            </span>{' '}
            a partir da URL importada — campos com fundo verde foram preenchidos automaticamente.
            Revise e ajuste conforme necessário.
          </p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C2B20]">
            {formData.name ? formData.name : 'Nova Análise'}
          </h1>
          {formData.name && (
            <p className="mt-0.5 font-mono text-sm text-[#6B7480]">{propertyLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {result === null && formData.name && activeTab === 4 && (
            <button
              onClick={calculateDeal}
              disabled={loading}
              className="bg-[#4A7C59] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Calcular →'}
            </button>
          )}
          <button
            onClick={handleReset}
            className="border border-[#E2E0DA] px-4 py-2.5 text-sm text-[#6B7480] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
          >
            Recomeçar
          </button>
        </div>
      </div>

      {/* ── Tab strip ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 border border-[#E2E0DA] bg-[#FAFAF8]">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const completed = activeTab > tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col gap-0.5 border-r border-[#E2E0DA] px-3 py-4 text-left transition-colors last:border-r-0 ${
                active
                  ? 'border-b-2 border-b-[#4A7C59] bg-[#EBF3EE]'
                  : completed
                    ? 'bg-[#F0EFEB] hover:bg-[#E8E7E3]'
                    : 'hover:bg-[#F0EFEB]'
              }`}
            >
              <span
                className={`text-[11px] font-bold ${
                  active ? 'text-[#4A7C59]' : completed ? 'text-[#4A7C59]' : 'text-[#6B7280]'
                }`}
              >
                {completed && !active ? '✓ ' : ''}
                {tab.label}
              </span>
              <span
                className={`text-[9px] leading-tight ${
                  active ? 'text-[#3D6B4F]' : 'text-[#6B7480]'
                }`}
              >
                {tab.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-8">
        {activeTab === 0 && <DadosImovel onNext={() => setActiveTab(1)} />}
        {activeTab === 1 && (
          <CompraECustos onBack={() => setActiveTab(0)} onNext={() => setActiveTab(2)} />
        )}
        {activeTab === 2 && (
          <ReceitasEDespesas
            onBack={() => setActiveTab(1)}
            onNext={() => setActiveTab(4)}
          />
        )}
        {activeTab === 4 && (
          <ProjecoesTab
            onBack={() => setActiveTab(2)}
            onCalculate={calculateDeal}
            loading={loading}
            apiError={apiError}
          />
        )}
      </div>
    </div>
  );
}
