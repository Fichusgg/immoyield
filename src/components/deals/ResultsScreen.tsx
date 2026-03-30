'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { RotateCcw, TrendingUp, TrendingDown, ArrowUpRight, Check } from 'lucide-react';
import { DownloadPDFButton } from '@/components/pdf/DownloadPDFButton';
import { ShareButton } from '@/components/share/ShareButton';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DealInput } from '@/lib/validations/deal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  capRate: number;
  cashOnCash: number;
  totalInvestment: number;
  monthlyNOI: number;
  monthlyCashFlow: number;
  loanAmount: number;
  cashOutlay: number;
}

interface AmortizationPeriod {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  remainingBalance: number;
}

interface Projection {
  year: number;
  estimatedValue: number;
  equity: number;
}

export interface AnalysisResult {
  metrics: Metrics;
  schedule: AmortizationPeriod[];
  projections: Projection[];
}

interface ResultsScreenProps {
  result: AnalysisResult;
  dealName?: string;
  inputs: DealInput;
  onReset: () => void;
  isAuthenticated?: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function logSupabaseError(context: string, error: unknown) {
  const anyError = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    status?: unknown;
  };

  const message =
    typeof anyError?.message === 'string'
      ? anyError.message
      : error instanceof Error
        ? error.message
        : String(anyError?.message ?? error);

  const code = typeof anyError?.code === 'string' ? anyError.code : undefined;
  const details = typeof anyError?.details === 'string' ? anyError.details : undefined;
  const hint = typeof anyError?.hint === 'string' ? anyError.hint : undefined;
  const status = typeof anyError?.status === 'number' ? anyError.status : undefined;

  console.error(`[supabase] ${context}`, { message, code, details, hint, status, raw: error });
}

function toErrorSummary(error: unknown) {
  if (!error) return null;

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      message: typeof obj.message === 'string' ? obj.message : undefined,
      code: typeof obj.code === 'string' ? obj.code : undefined,
      details: typeof obj.details === 'string' ? obj.details : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: String(error) };
}

function looksLikeRlsError(error: unknown) {
  const anyError = error as { message?: unknown; code?: unknown };
  const message = typeof anyError?.message === 'string' ? anyError.message : '';
  const code = typeof anyError?.code === 'string' ? anyError.code : '';
  return (
    code === '42501' ||
    message.toLowerCase().includes('row-level security') ||
    message.toLowerCase().includes('violates row-level security') ||
    message.toLowerCase().includes('permission denied')
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({
  active,
  payload,
  label,
  prefix = '',
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
  prefix?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white shadow-2xl">
      <p className="mb-1 text-slate-400">
        {prefix}
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard = ({
  label,
  value,
  sub,
  highlight,
  positive,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) => (
  <div
    className={`flex flex-col gap-1.5 rounded-2xl p-5 ${
      highlight
        ? 'bg-emerald-500 text-white'
        : negative
          ? 'border border-red-100 bg-red-50'
          : 'border border-slate-100 bg-white'
    }`}
  >
    <span
      className={`text-[10px] font-bold tracking-widest uppercase ${
        highlight ? 'text-emerald-100' : 'text-slate-400'
      }`}
    >
      {label}
    </span>
    <span
      className={`text-2xl font-black tracking-tight tabular-nums ${
        highlight
          ? 'text-white'
          : positive
            ? 'text-emerald-600'
            : negative
              ? 'text-red-500'
              : 'text-slate-900'
      }`}
    >
      {value}
    </span>
    {sub && (
      <span className={`text-xs ${highlight ? 'text-emerald-200' : 'text-slate-400'}`}>{sub}</span>
    )}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-xs font-black tracking-widest text-slate-400 uppercase">{children}</h3>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsScreen({
  result,
  dealName,
  inputs,
  onReset,
  isAuthenticated,
}: ResultsScreenProps) {
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (savedOk || saving) return;
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.debug('[deals.save] auth.getUser', {
        userId: user?.id,
        email: user?.email,
        error: toErrorSummary(userError),
      });

      if (userError) {
        logSupabaseError('auth.getUser', userError);
        throw new Error('Erro ao validar sessão. Faça login novamente.');
      }
      if (!user) {
        throw new Error('Você precisa estar logado para salvar.');
      }

      const payload = {
        user_id: user.id,
        name: inputs.name,
        property_type: 'aluguel',
        inputs,
        results_cache: result,
      };

      console.debug('[deals.save] insert payload', {
        user_id: payload.user_id,
        name: payload.name,
        property_type: payload.property_type,
        inputs: payload.inputs,
        results_cache: {
          metrics: payload.results_cache.metrics,
          schedule_len: payload.results_cache.schedule.length,
          projections_len: payload.results_cache.projections.length,
        },
      });

      const { data, error } = await supabase.from('deals').insert(payload).select('*').single();
      const insertedId =
        data && typeof data === 'object' && 'id' in data
          ? (data as { id?: unknown }).id
          : undefined;

      console.debug('[deals.save] insert response', {
        ok: !error,
        id: typeof insertedId === 'string' ? insertedId : undefined,
        error: toErrorSummary(error),
        data,
      });

      if (error) {
        logSupabaseError('deals.insert', error);
        if (looksLikeRlsError(error)) {
          throw new Error(
            'Salvamento bloqueado por permissões (RLS). Verifique políticas na tabela `deals` para INSERT.'
          );
        }
        throw new Error(`Erro ao salvar: ${error.message}`);
      }

      const savedId = typeof insertedId === 'string' ? insertedId : null;
      setSavedDealId(savedId);
      setSavedOk(true);
    } catch (e) {
      if (e instanceof Error) {
        console.error('[deals.save] failed', { message: e.message, name: e.name, stack: e.stack });
        setSaveError(e.message);
      } else {
        logSupabaseError('deals.save (unknown error)', e);
        setSaveError('Erro ao salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };
  const { metrics, schedule, projections } = result;

  const cashFlowPositive = metrics.monthlyCashFlow >= 0;

  // ── Monthly cashflow bar data (first 24 months from schedule) ───────────────
  const cashflowMonthlyData = schedule.slice(0, 24).map((p) => ({
    mes: `M${p.month}`,
    fluxo: +(metrics.monthlyNOI - p.installment).toFixed(0),
  }));

  // ── 10-year projection ──────────────────────────────────────────────────────
  const projectionData = projections.map((p) => ({
    ano: `Ano ${p.year}`,
    valor: +p.estimatedValue.toFixed(0),
    equity: +p.equity.toFixed(0),
  }));

  // ── Amortization schedule (yearly samples) ─────────────────────────────────
  const amortData = schedule
    .filter((_, i) => (i + 1) % 12 === 0)
    .map((p) => ({
      ano: `Ano ${Math.round(p.month / 12)}`,
      saldo: +p.remainingBalance.toFixed(0),
      juros: +(p.interest * 12).toFixed(0),
      amort: +(p.amortization * 12).toFixed(0),
    }));

  // ── Benchmark comparison ────────────────────────────────────────────────────
  const CDI_RATE = 10.5; // approximate CDI a.a.
  const FII_RATE = 8.0; // typical FII dividend yield
  const benchmarkData = [
    { name: 'Cap Rate', value: +metrics.capRate.toFixed(2), fill: '#0ea5e9' },
    {
      name: 'Cash-on-Cash',
      value: +metrics.cashOnCash.toFixed(2),
      fill: metrics.cashOnCash >= 0 ? '#10b981' : '#ef4444',
    },
    { name: 'CDI (ref.)', value: CDI_RATE, fill: '#94a3b8' },
    { name: 'FII (ref.)', value: FII_RATE, fill: '#94a3b8' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-slate-400 uppercase">
            Análise Concluída
          </p>
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            {dealName ?? 'Resultado do Deal'}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                cashFlowPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {cashFlowPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              Fluxo de caixa {cashFlowPositive ? 'positivo' : 'negativo'}
            </span>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <RotateCcw size={12} />
          Nova análise
        </button>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Fluxo de Caixa"
          value={fmt(metrics.monthlyCashFlow)}
          sub="por mês"
          positive={cashFlowPositive}
          negative={!cashFlowPositive}
        />
        <KPICard
          label="Cap Rate"
          value={fmtPct(metrics.capRate)}
          sub="retorno bruto anual"
          highlight
        />
        <KPICard
          label="Cash-on-Cash"
          value={fmtPct(metrics.cashOnCash)}
          sub="retorno sobre capital próprio"
          positive={metrics.cashOnCash >= 0}
          negative={metrics.cashOnCash < 0}
        />
        <KPICard
          label="NOI Mensal"
          value={fmt(metrics.monthlyNOI)}
          sub="resultado operacional líquido"
        />
      </div>

      {/* ── Capital Breakdown ────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Estrutura de Capital</SectionTitle>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white text-sm">
          {[
            { label: 'Investimento total', value: fmt(metrics.totalInvestment) },
            { label: 'Capital próprio (entrada)', value: fmt(metrics.cashOutlay) },
            ...(metrics.loanAmount > 0
              ? [
                  { label: 'Financiamento', value: fmt(metrics.loanAmount) },
                  {
                    label: 'LTV',
                    value: fmtPct((metrics.loanAmount / metrics.totalInvestment) * 100),
                  },
                  {
                    label: 'Parcela inicial',
                    value: fmt(schedule[0]?.installment ?? 0),
                  },
                ]
              : []),
          ].map((row) => (
            <div key={row.label} className="flex justify-between px-4 py-3">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-bold text-slate-800">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fluxo de Caixa Mensal (24m) ─────────────────────────────────────── */}
      {cashflowMonthlyData.length > 0 && (
        <div>
          <SectionTitle>Fluxo de Caixa Mensal — 24 Meses</SectionTitle>
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={cashflowMonthlyData}
                barSize={8}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={48}
                />
                <Tooltip content={<ChartTooltip prefix="Mês " />} />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
                <Bar dataKey="fluxo" name="Fluxo líquido" radius={[3, 3, 0, 0]}>
                  {cashflowMonthlyData.map((entry, index) => (
                    <Cell key={`cf-${index}`} fill={entry.fluxo >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Benchmarks ───────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Benchmarks — % a.a.</SectionTitle>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={benchmarkData}
              layout="vertical"
              barSize={16}
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                formatter={(v) => {
                  const num = typeof v === 'number' ? v : Number(v ?? 0);
                  return [`${num.toFixed(2)}%`, ''];
                }}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {benchmarkData.map((entry, i) => (
                  <Cell key={`bm-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-right text-[10px] text-slate-400">
            CDI e FII são referências de mercado, não garantidas.
          </p>
        </div>
      </div>

      {/* ── 10-Year Projection ───────────────────────────────────────────────── */}
      {projectionData.length > 0 && (
        <div>
          <SectionTitle>Projeção 10 Anos — Valorização e Equity</SectionTitle>
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, color: '#64748b', paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Valor do imóvel"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#valGrad)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  name="Equity acumulado"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#eqGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[10px] text-slate-400">
              Projeção assume 5% de valorização anual. Valores estimados, sem garantia.
            </p>
          </div>
        </div>
      )}

      {/* ── Amortization Schedule ────────────────────────────────────────────── */}
      {amortData.length > 0 && (
        <div>
          <SectionTitle>Amortização — Saldo Devedor Anual</SectionTitle>
          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={amortData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, color: '#64748b', paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo devedor"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="juros"
                  name="Juros pagos (ano)"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5">
        <div>
          <p className="text-sm font-black text-white">
            {savedOk ? 'Análise salva!' : 'Salvar esta análise'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {savedOk
              ? 'Disponível no seu dashboard.'
              : isAuthenticated
                ? 'Guarde este deal na sua conta.'
                : 'Crie uma conta gratuita para guardar e compartilhar.'}
          </p>
          {saveError && <p className="mt-1 text-xs text-red-400">{saveError}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <DownloadPDFButton
            result={result}
            inputs={inputs}
            dealName={dealName ?? 'Deal'}
            className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-slate-600"
          />
          {savedOk && savedDealId && (
            <ShareButton
              dealId={savedDealId}
              dealName={dealName ?? 'Deal'}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-sky-500"
            />
          )}
          {isAuthenticated ? (
            <button
              onClick={handleSave}
              disabled={saving || savedOk}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-emerald-400 disabled:bg-emerald-700"
            >
              {savedOk ? (
                <>
                  <Check size={12} /> Salvo
                </>
              ) : saving ? (
                'Salvando...'
              ) : (
                'Salvar análise'
              )}
            </button>
          ) : (
            <a
              href="/auth"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-emerald-400"
            >
              Criar conta <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
