'use client';

import { useState, useEffect } from 'react';
import { useDealStore } from '@/store/useDealStore';
import { PropertyBasics } from './steps/PropertyBasics';
import { FinancingDetails } from './steps/FinancingDetails';
import { RevenueExpenses } from './steps/RevenueExpenses';
import ResultsScreen, { AnalysisResult } from './ResultsScreen';
import { createClient } from '@/lib/supabase/client';
import { DealInput } from '@/lib/validations/deal';

const STEPS = [
  { n: 1, label: 'Imóvel' },
  { n: 2, label: 'Custos' },
  { n: 3, label: 'Receitas' },
  { n: 4, label: 'Revisão' },
];

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

interface DealWizardProps {
  benchmarks?: Benchmarks;
}

export default function DealWizard({ benchmarks }: DealWizardProps) {
  const { step, formData, setStep, reset } = useDealStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
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
      />
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="mb-1 text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
          Onboarding Flow
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">Novo Investimento</h1>
          <span className="text-sm text-[#737373]">
            Passo {step} de {STEPS.length}: {STEPS[step - 1].label}
          </span>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="mb-8 h-1.5 w-full rounded-full bg-[#e5e5e3]">
        <div
          className="h-1.5 rounded-full bg-[#1a5c3a] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Form card ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#e5e5e3] bg-white p-8">
        {step === 1 && <PropertyBasics />}
        {step === 2 && <FinancingDetails />}
        {step === 3 && <RevenueExpenses />}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Revisar &amp; Calcular</h2>
              <p className="mt-1 text-sm text-[#737373]">
                Confirme os dados antes de rodar a análise.
              </p>
            </div>

            <div className="divide-y divide-[#f5f5f3] rounded-xl border border-[#e5e5e3] text-sm">
              {[
                { label: 'Imóvel', value: formData.name },
                { label: 'Preço de compra', value: fmt(formData.purchasePrice ?? 0) },
                {
                  label: 'ITBI',
                  value: `${((formData.acquisitionCosts?.itbiPercent ?? 0) * 100).toFixed(1)}%`,
                },
                {
                  label: 'Financiamento',
                  value: formData.financing?.enabled
                    ? `${formData.financing.system} · ${formData.financing.interestRateYear}% a.a. · ${formData.financing.termMonths} meses`
                    : 'À vista',
                },
                { label: 'Aluguel mensal', value: fmt(formData.revenue?.monthlyRent ?? 0) },
                {
                  label: 'Vacância',
                  value: `${((formData.revenue?.vacancyRate ?? 0) * 100).toFixed(0)}%`,
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3">
                  <span className="text-[#737373]">{row.label}</span>
                  <span className="font-semibold text-[#1a1a1a]">{row.value}</span>
                </div>
              ))}
            </div>

            {apiError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {apiError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 rounded-lg border border-[#e5e5e3] px-4 py-3 text-sm font-medium text-[#737373] transition-colors hover:bg-[#f5f5f3] hover:text-[#1a1a1a]"
              >
                Voltar
              </button>
              <button
                onClick={calculateDeal}
                disabled={loading}
                className="w-2/3 rounded-lg bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:bg-[#a3a3a1]"
              >
                {loading ? 'Calculando...' : 'Rodar Análise →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
