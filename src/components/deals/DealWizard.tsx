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
  { n: 1, label: 'Propriedade' },
  { n: 2, label: 'Financiamento' },
  { n: 3, label: 'Receitas' },
  { n: 4, label: 'Análise' },
];

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function DealWizard() {
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
      />
    );
  }

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                  step > s.n
                    ? 'bg-emerald-500 text-white'
                    : step === s.n
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wider uppercase ${
                  step >= s.n ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-px flex-1 transition-all duration-500 ${
                  step > s.n ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {step === 1 && <PropertyBasics />}
        {step === 2 && <FinancingDetails />}
        {step === 3 && <RevenueExpenses />}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Revisar &amp; Calcular</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Confirme os dados antes de rodar a análise.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50 text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Imóvel</span>
                <span className="font-semibold text-slate-800">{formData.name}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Preço de compra</span>
                <span className="font-semibold text-slate-800">
                  {fmt(formData.purchasePrice ?? 0)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">ITBI</span>
                <span className="font-semibold text-slate-800">
                  {((formData.acquisitionCosts?.itbiPercent ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Financiamento</span>
                <span className="font-semibold text-slate-800">
                  {formData.financing?.enabled
                    ? `${formData.financing.system} · ${formData.financing.interestRateYear}% a.a. · ${formData.financing.termMonths} meses`
                    : 'À vista'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Aluguel mensal</span>
                <span className="font-semibold text-slate-800">
                  {fmt(formData.revenue?.monthlyRent ?? 0)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Vacância</span>
                <span className="font-semibold text-slate-800">
                  {((formData.revenue?.vacancyRate ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {apiError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {apiError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 rounded-xl border border-slate-200 p-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                onClick={calculateDeal}
                disabled={loading}
                className="w-2/3 rounded-xl bg-slate-900 p-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700 disabled:bg-slate-300"
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
