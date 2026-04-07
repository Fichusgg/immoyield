'use client';

import { useDealStore } from '@/store/useDealStore';
import { DadosImovel } from './tabs/DadosImovel';
import { CompraECustos } from './tabs/CompraECustos';
import { ReceitasEDespesas } from './tabs/ReceitasEDespesas';
import { ProjecoesLongoPrazo } from './tabs/ProjecoesLongoPrazo';
import { ProjecoesTab } from './tabs/ProjecoesTab';
import ResultsScreen, { AnalysisResult } from './ResultsScreen';
import { createClient } from '@/lib/supabase/client';
import { DealInput } from '@/lib/validations/deal';
import { useState, useEffect } from 'react';
import { PROPERTY_TYPE_LABELS } from '@/lib/validations/deal';

const TABS = [
  { id: 0, label: 'Dados', sub: 'Descrição e endereço' },
  { id: 1, label: 'Compra', sub: 'Valor e financiamento' },
  { id: 2, label: 'Receitas', sub: 'Aluguel e despesas' },
  { id: 3, label: 'Projeções', sub: 'Valorização e horizonte' },
  { id: 4, label: 'Revisar', sub: 'Confirmar e calcular' },
];

interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

interface DealWizardProps {
  benchmarks?: Benchmarks;
  /** Called after user saves a deal from the results screen — used for inline mode */
  onSaved?: () => void;
}

export default function DealWizard({ benchmarks, onSaved }: DealWizardProps) {
  const { activeTab, setActiveTab, formData, reset } = useDealStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthenticated(!!data.user));
  }, []);

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

  const propertyType = formData.propertyType ?? 'residential';
  const propertyLabel = PROPERTY_TYPE_LABELS[propertyType];

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5]">
            {formData.name ? formData.name : 'Nova Análise'}
          </h1>
          {formData.name && (
            <p className="mt-0.5 font-mono text-sm text-[#52525b]">{propertyLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {result === null && formData.name && activeTab === 4 && (
            <button
              onClick={calculateDeal}
              disabled={loading}
              className="bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#16a34a] disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Calcular →'}
            </button>
          )}
          <button
            onClick={handleReset}
            className="border border-[#27272a] px-4 py-2.5 text-sm text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa]"
          >
            Recomeçar
          </button>
        </div>
      </div>

      {/* ── Tab strip ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-5 border border-[#27272a] bg-[#111111]">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const completed = activeTab > tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col gap-0.5 border-r border-[#27272a] px-3 py-4 text-left transition-colors last:border-r-0 ${
                active
                  ? 'border-b-2 border-b-[#22c55e] bg-[#052e16]'
                  : completed
                    ? 'bg-[#1a1a1a] hover:bg-[#222222]'
                    : 'hover:bg-[#1a1a1a]'
              }`}
            >
              <span
                className={`text-[11px] font-bold ${
                  active ? 'text-[#22c55e]' : completed ? 'text-[#22c55e]' : 'text-[#a1a1aa]'
                }`}
              >
                {completed && !active ? '✓ ' : ''}
                {tab.label}
              </span>
              <span
                className={`text-[9px] leading-tight ${
                  active ? 'text-[#16a34a]' : 'text-[#52525b]'
                }`}
              >
                {tab.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="border border-[#27272a] bg-[#111111] p-8">
        {activeTab === 0 && <DadosImovel onNext={() => setActiveTab(1)} />}
        {activeTab === 1 && (
          <CompraECustos onBack={() => setActiveTab(0)} onNext={() => setActiveTab(2)} />
        )}
        {activeTab === 2 && (
          <ReceitasEDespesas onBack={() => setActiveTab(1)} onNext={() => setActiveTab(3)} />
        )}
        {activeTab === 3 && (
          <ProjecoesLongoPrazo onBack={() => setActiveTab(2)} onNext={() => setActiveTab(4)} />
        )}
        {activeTab === 4 && (
          <ProjecoesTab
            onBack={() => setActiveTab(3)}
            onCalculate={calculateDeal}
            loading={loading}
            apiError={apiError}
          />
        )}
      </div>
    </div>
  );
}
