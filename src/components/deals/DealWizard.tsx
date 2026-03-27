'use client';

import { useState } from 'react';
import { useDealStore } from '@/store/useDealStore';
import { PropertyBasics } from './steps/PropertyBasics';
import { FinancingDetails } from './steps/FinancingDetails';
import { RevenueExpenses } from './steps/RevenueExpenses';
import { TrendingUp, TrendingDown, DollarSign, Percent, Building2, RotateCcw } from 'lucide-react';

interface CalculationResult {
  metrics: {
    capRate: number;
    cashOnCash: number;
    totalInvestment: number;
    monthlyNOI: number;
    monthlyCashFlow: number;
    loanAmount: number;
    cashOutlay: number;
  };
}

const STEPS = [
  { n: 1, label: 'Propriedade' },
  { n: 2, label: 'Financiamento' },
  { n: 3, label: 'Receitas' },
  { n: 4, label: 'Análise' },
];

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function MetricCard({
  label,
  value,
  sub,
  positive,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 flex flex-col gap-1 ${
        accent
          ? 'bg-emerald-600 text-white'
          : 'bg-white border border-slate-100 text-slate-800'
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-widest ${
        accent ? 'text-emerald-100' : 'text-slate-400'
      }`}>{label}</span>
      <span className={`text-2xl font-black tracking-tight ${
        !accent && positive !== undefined
          ? positive ? 'text-emerald-600' : 'text-red-500'
          : ''
      }`}>{value}</span>
      {sub && <span className={`text-xs ${ accent ? 'text-emerald-200' : 'text-slate-400' }`}>{sub}</span>}
    </div>
  );
}

export default function DealWizard() {
  const { step, formData, setStep, reset } = useDealStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
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
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  step >= s.n ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 mb-4 transition-all duration-500 ${
                  step > s.n ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {step === 1 && <PropertyBasics />}
        {step === 2 && <FinancingDetails />}
        {step === 3 && <RevenueExpenses />}

        {step === 4 && !result && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Revisar &amp; Calcular</h2>
              <p className="text-sm text-slate-500 mt-0.5">Confirme os dados antes de rodar a análise.</p>
            </div>

            {/* Summary table */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Imóvel</span>
                <span className="font-semibold text-slate-800">{formData.name}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Preço de compra</span>
                <span className="font-semibold text-slate-800">{fmt(formData.purchasePrice ?? 0)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">ITBI</span>
                <span className="font-semibold text-slate-800">{((formData.acquisitionCosts?.itbiPercent ?? 0) * 100).toFixed(1)}%</span>
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
                <span className="font-semibold text-slate-800">{fmt(formData.revenue?.monthlyRent ?? 0)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-500">Vacância</span>
                <span className="font-semibold text-slate-800">{((formData.revenue?.vacancyRate ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {apiError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {apiError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 border border-slate-200 text-slate-700 p-2.5 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={calculateDeal}
                disabled={loading}
                className="w-2/3 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white p-2.5 rounded-xl font-black text-sm transition-colors"
              >
                {loading ? 'Calculando...' : 'Rodar Análise →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Resultados</h3>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <RotateCcw size={12} /> Nova análise
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Fluxo de Caixa"
              value={fmt(result.metrics.monthlyCashFlow)}
              sub="por mês"
              positive={result.metrics.monthlyCashFlow >= 0}
            />
            <MetricCard
              label="Cap Rate"
              value={`${result.metrics.capRate.toFixed(2)}%`}
              sub="retorno bruto anual"
              accent
            />
            <MetricCard
              label="Cash-on-Cash"
              value={`${result.metrics.cashOnCash.toFixed(2)}%`}
              sub="retorno sobre capital"
              positive={result.metrics.cashOnCash >= 0}
            />
            <MetricCard
              label="NOI Mensal"
              value={fmt(result.metrics.monthlyNOI)}
              sub="resultado operacional"
            />
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between px-4 py-3 items-center">
              <span className="flex items-center gap-2 text-slate-500"><Building2 size={14}/> Investimento total</span>
              <span className="font-bold text-slate-800">{fmt(result.metrics.totalInvestment)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 items-center">
              <span className="flex items-center gap-2 text-slate-500"><DollarSign size={14}/> Capital próprio</span>
              <span className="font-bold text-slate-800">{fmt(result.metrics.cashOutlay)}</span>
            </div>
            {result.metrics.loanAmount > 0 && (
              <div className="flex justify-between px-4 py-3 items-center">
                <span className="flex items-center gap-2 text-slate-500"><Percent size={14}/> Financiado</span>
                <span className="font-bold text-slate-800">{fmt(result.metrics.loanAmount)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 items-center">
              <span className="flex items-center gap-2 text-slate-500">
                {result.metrics.monthlyCashFlow >= 0 ? <TrendingUp size={14} className="text-emerald-500"/> : <TrendingDown size={14} className="text-red-500"/>}
                Sinal
              </span>
              <span className={`font-black text-xs uppercase tracking-wider px-2 py-1 rounded-full ${
                result.metrics.monthlyCashFlow >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}>
                {result.metrics.monthlyCashFlow >= 0 ? 'Positivo' : 'Negativo'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}