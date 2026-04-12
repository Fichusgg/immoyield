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
import { RotateCcw, TrendingUp, TrendingDown, ArrowUpRight, Check, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DownloadPDFButton } from '@/components/pdf/DownloadPDFButton';
import { ShareButton } from '@/components/share/ShareButton';
import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DealInput } from '@/lib/validations/deal';
import { computeImmoScore, getScoreLabel } from '@/lib/scoring';
import { generateInsights, generateRisks } from '@/lib/insights';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  capRate: number;
  cashOnCash: number;
  totalInvestment: number;
  monthlyNOI: number;
  monthlyCashFlow: number;
  loanAmount: number;
  cashOutlay: number;
  grossMonthlyRent?: number;
  vacancyLoss?: number;
  effectiveRent?: number;
  operatingExpenses?: number;
  firstInstallment?: number;
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

interface FlipMetrics {
  salePrice: number;
  sellingCosts: number;
  capitalGainTax: number;
  netProfit: number;
  roi: number;
  holdingMonths: number;
}

export interface AnalysisResult {
  metrics: Metrics;
  schedule: AmortizationPeriod[];
  projections: Projection[];
  flipMetrics?: FlipMetrics | null;
}

interface Benchmarks {
  cdi: number;
  fii: number;
  updatedAt: string | null;
}

interface ResultsScreenProps {
  result: AnalysisResult;
  dealName?: string;
  inputs: DealInput;
  onReset: () => void;
  hideHeader?: boolean;
  hideSaveButton?: boolean;
  isAuthenticated?: boolean;
  benchmarks?: Benchmarks;
  onSaved?: () => void;
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
    <div className="border border-[#E2E0DA] bg-[#F8F7F4] px-3 py-2 text-xs text-[#1C2B20]">
      <p className="mb-1 font-mono text-[#9CA3AF]">
        {prefix}
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: p.color }}>
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
    className={`flex flex-col gap-1.5 p-5 ${
      highlight
        ? 'border border-[#A8C5B2] bg-[#EBF3EE]'
        : negative
          ? 'border border-[#FECACA] bg-[#FEF2F2]'
          : 'border border-[#E2E0DA] bg-[#FAFAF8]'
    }`}
  >
    <span
      className={`text-[10px] font-semibold tracking-[0.06em] uppercase ${
        highlight ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'
      }`}
    >
      {label}
    </span>
    <span
      className={`font-mono text-2xl font-black tracking-tight tabular-nums ${
        highlight
          ? 'text-[#4A7C59]'
          : positive
            ? 'text-[#4A7C59]'
            : negative
              ? 'text-[#DC2626]'
              : 'text-[#1C2B20]'
      }`}
    >
      {value}
    </span>
    {sub && (
      <span className={`text-xs ${highlight ? 'text-[#3D6B4F]' : 'text-[#9CA3AF]'}`}>{sub}</span>
    )}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-xs font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
    {children}
  </h3>
);

// ─── CDI Comparison Banner ────────────────────────────────────────────────────

const CDIBanner = ({
  yourReturn,
  label,
  benchmarks,
}: {
  yourReturn: number;
  label: string;
  benchmarks?: Benchmarks;
}) => {
  const cdiRate = benchmarks?.cdi ?? 13.65;
  const delta = yourReturn - cdiRate;
  const beating = delta >= 0;

  return (
    <div
      className={`p-5 ${
        beating ? 'border border-[#A8C5B2] bg-[#EBF3EE]' : 'border border-[#FED7AA] bg-[#FFFBEB]'
      }`}
    >
      <p
        className={`mb-3 text-[10px] font-semibold tracking-[0.07em] uppercase ${
          beating ? 'text-[#4A7C59]' : 'text-[#B45309]'
        }`}
      >
        Seu retorno vs CDI
      </p>

      <div className="flex items-center justify-between gap-4">
        {/* Left: your return + CDI reference */}
        <div className="flex-1 space-y-2">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase">
              {label}
            </p>
            <p className="font-mono text-3xl font-black tracking-tight text-[#1C2B20] tabular-nums">
              {fmtPct(yourReturn)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-[#9CA3AF]">vs CDI:</span>
            <span className="font-mono text-sm font-bold text-[#6B7280]">{fmtPct(cdiRate)}</span>
            {benchmarks?.updatedAt && (
              <span className="font-mono text-[9px] text-[#9CA3AF]">
                (atualizado {new Date(benchmarks.updatedAt).toLocaleDateString('pt-BR')})
              </span>
            )}
          </div>
        </div>

        {/* Right: delta badge */}
        <div
          className={`flex min-w-[90px] flex-col items-center justify-center px-5 py-4 ${
            beating ? 'bg-[#4A7C59]' : 'bg-[#B45309]'
          }`}
        >
          {beating ? (
            <TrendingUp size={14} className="mb-1 text-white opacity-90" />
          ) : (
            <TrendingDown size={14} className="mb-1 text-white opacity-90" />
          )}
          <p className="font-mono text-xl leading-none font-black text-white tabular-nums">
            {beating ? '+' : ''}
            {fmtPct(delta)}
          </p>
          <p className="mt-1 text-center text-[9px] leading-tight font-semibold text-white opacity-80">
            {beating ? 'acima do CDI' : 'abaixo do CDI'}
          </p>
        </div>
      </div>

      {/* Context note */}
      <p className={`mt-3 font-mono text-[10px] ${beating ? 'text-[#3D6B4F]' : 'text-[#B45309]'}`}>
        {beating
          ? `Seu imóvel supera o CDI em ${fmtPct(delta)}. Excelente retorno ajustado ao risco.`
          : `O CDI supera seu retorno em ${fmtPct(Math.abs(delta))}. Considere renegociar o financiamento ou reduzir custos.`}
      </p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsScreen({
  result,
  dealName,
  inputs,
  onReset,
  isAuthenticated,
  benchmarks,
  hideHeader = false,
  hideSaveButton = false,
  onSaved,
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
        property_type: inputs.propertyType,
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
      onSaved?.();
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

  // ── Rates ───────────────────────────────────────────────────────────────────
  const CDI_RATE = benchmarks?.cdi ?? 13.65;
  const FII_RATE = benchmarks?.fii ?? 8.0;

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
  const benchmarkData = [
    { name: 'Cap Rate', value: +metrics.capRate.toFixed(2), fill: '#4A7C59' },
    {
      name: 'Cash-on-Cash',
      value: +metrics.cashOnCash.toFixed(2),
      fill: metrics.cashOnCash >= 0 ? '#3D6B4F' : '#DC2626',
    },
    { name: 'CDI (ref.)', value: CDI_RATE, fill: '#D0CEC8' },
    { name: 'FII (ref.)', value: FII_RATE, fill: '#D0CEC8' },
  ];

  // ── ImmoScore ───────────────────────────────────────────────────────────────
  const scoreBreakdown = useMemo(() => computeImmoScore({
    capRate:           metrics.capRate,
    monthlyCashFlow:   metrics.monthlyCashFlow,
    cashOutlay:        metrics.cashOutlay,
    grossMonthlyRent:  metrics.grossMonthlyRent ?? 0,
    operatingExpenses: metrics.operatingExpenses ?? 0,
  }), [metrics]);

  const scoreLabel = getScoreLabel(scoreBreakdown.total);

  // ── Insights & Risks ────────────────────────────────────────────────────────
  const insightsList = useMemo(() => generateInsights({
    monthlyCashFlow:   metrics.monthlyCashFlow,
    capRate:           metrics.capRate,
    cashOnCash:        metrics.cashOnCash,
    cashOutlay:        metrics.cashOutlay,
    grossMonthlyRent:  metrics.grossMonthlyRent ?? 0,
    condoMonthly:      metrics.operatingExpenses
                         ? (metrics.operatingExpenses - (metrics.grossMonthlyRent ?? 0) * 0.15) * 0.5
                         : 0,
    iptuMonthly:       0,
    operatingExpenses: metrics.operatingExpenses ?? 0,
    loanAmount:        metrics.loanAmount,
    purchasePrice:     metrics.totalInvestment,
    vacancyRate:       metrics.grossMonthlyRent && metrics.effectiveRent
                         ? 1 - (metrics.effectiveRent / metrics.grossMonthlyRent)
                         : 0.05,
  }), [metrics]);

  const risksList = useMemo(() => generateRisks({
    monthlyCashFlow:   metrics.monthlyCashFlow,
    capRate:           metrics.capRate,
    cashOnCash:        metrics.cashOnCash,
    cashOutlay:        metrics.cashOutlay,
    grossMonthlyRent:  metrics.grossMonthlyRent ?? 0,
    condoMonthly:      metrics.operatingExpenses
                         ? (metrics.operatingExpenses - (metrics.grossMonthlyRent ?? 0) * 0.15) * 0.5
                         : 0,
    iptuMonthly:       0,
    operatingExpenses: metrics.operatingExpenses ?? 0,
    loanAmount:        metrics.loanAmount,
    purchasePrice:     metrics.totalInvestment,
    vacancyRate:       metrics.grossMonthlyRent && metrics.effectiveRent
                         ? 1 - (metrics.effectiveRent / metrics.grossMonthlyRent)
                         : 0.05,
  }), [metrics]);

  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {!hideHeader && (
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
              Análise Concluída
            </p>
            <h2 className="text-xl font-bold tracking-tight text-[#1C2B20]">
              {dealName ?? 'Resultado do Deal'}
            </h2>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-xs font-bold ${
                  cashFlowPositive
                    ? 'border-[#A8C5B2] bg-[#EBF3EE] text-[#4A7C59]'
                    : 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                }`}
              >
                {cashFlowPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                Fluxo de caixa {cashFlowPositive ? 'positivo' : 'negativo'}
              </span>

              {/* ── ImmoScore badge ── */}
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-xs font-bold ${scoreLabel.bg} ${scoreLabel.color} ${scoreLabel.border}`}
                title="ImmoScore: pontuação 0–100 baseada em yield, fluxo de caixa, payback e eficiência de custos"
              >
                <span className="text-[10px] font-black">{scoreBreakdown.total}</span>
                <span className="opacity-70">/100</span>
                <span className="ml-0.5">{scoreLabel.label}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 border border-[#E2E0DA] px-3 py-2 text-xs text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280]"
          >
            <RotateCcw size={12} />
            Nova análise
          </button>
        </div>
      )}

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

      {/* ── ImmoScore full breakdown ─────────────────────────────────────────── */}
      <div className={`border p-5 ${scoreLabel.bg} ${scoreLabel.border}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
              ImmoScore — Avaliação do Deal
            </p>
            <p className={`mt-0.5 text-3xl font-black tabular-nums ${scoreLabel.color}`}>
              {scoreBreakdown.total}
              <span className="ml-1 text-base font-semibold opacity-60">/100 — {scoreLabel.label}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: 'Yield',       pts: scoreBreakdown.yield,        max: 35 },
            { label: 'Fluxo',       pts: scoreBreakdown.cashflow,     max: 25 },
            { label: 'Payback',     pts: scoreBreakdown.payback,      max: 20 },
            { label: 'Eficiência',  pts: scoreBreakdown.expenseRatio, max: 15 },
            { label: 'Dados',       pts: scoreBreakdown.completeness, max: 5  },
          ].map((c) => (
            <div key={c.label} className="rounded border border-white/60 bg-white/50 px-1 py-2">
              <p className={`text-lg font-black tabular-nums ${scoreLabel.color}`}>{c.pts}</p>
              <p className="text-[9px] font-semibold text-[#6B7280] uppercase">{c.label}</p>
              <p className="text-[9px] text-[#9CA3AF]">/{c.max}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insights & Risks ──────────────────────────────────────────────────── */}
      {(insightsList.length > 0 || risksList.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Positives */}
          {insightsList.length > 0 && (
            <div className="border border-[#A8C5B2] bg-[#EBF3EE] p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-[0.07em] text-[#3D6B4F] uppercase">
                Por que é interessante
              </p>
              <ul className="space-y-2">
                {insightsList.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#1C2B20]">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#4A7C59]" />
                    <span>{ins.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {risksList.length > 0 && (
            <div className="border border-[#FED7AA] bg-[#FFFBEB] p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-[0.07em] text-[#92400E] uppercase">
                Riscos a considerar
              </p>
              <ul className="space-y-2">
                {risksList.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#1C2B20]">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                    <span>{risk.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── CDI Comparison Banner ─────────────────────────────────────────────*/}
      <CDIBanner
        yourReturn={metrics.cashOnCash}
        label="Cash-on-Cash a.a."
        benchmarks={benchmarks}
      />

      {/* ── Cash Flow Waterfall ───────────────────────────────────────────────── */}
      {metrics.grossMonthlyRent != null && metrics.grossMonthlyRent > 0 && (
        <div>
          <SectionTitle>Fluxo de Caixa — Ano 1 (Mensal)</SectionTitle>
          <div className="divide-y divide-[#E2E0DA] border border-[#E2E0DA] text-sm">
            {[
              { label: 'Aluguel bruto', value: fmt(metrics.grossMonthlyRent), sign: '' },
              { label: 'Perda por vacância', value: fmt(-(metrics.vacancyLoss ?? 0)), sign: 'neg' },
              {
                label: 'Receita efetiva',
                value: fmt(metrics.effectiveRent ?? metrics.monthlyNOI),
                sign: 'sub',
                bold: true,
              },
              {
                label: 'Despesas operacionais',
                value: fmt(-(metrics.operatingExpenses ?? 0)),
                sign: 'neg',
              },
              {
                label: 'NOI (Resultado Op. Líquido)',
                value: fmt(metrics.monthlyNOI),
                sign: 'sub',
                bold: true,
              },
              ...(metrics.loanAmount > 0
                ? [
                    {
                      label: 'Parcela de financiamento',
                      value: fmt(-(metrics.firstInstallment ?? 0)),
                      sign: 'neg',
                    },
                  ]
                : []),
              {
                label: 'Fluxo de Caixa Líquido',
                value: fmt(metrics.monthlyCashFlow),
                sign: metrics.monthlyCashFlow >= 0 ? 'pos' : 'neg',
                bold: true,
                final: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between px-4 py-3 ${row.final ? 'bg-[#F8F7F4]' : 'bg-[#FAFAF8]'}`}
              >
                <span className={row.bold ? 'font-semibold text-[#6B7280]' : 'text-[#9CA3AF]'}>
                  {row.label}
                </span>
                <span
                  className={`font-mono font-bold ${
                    row.sign === 'pos'
                      ? 'text-[#4A7C59]'
                      : row.sign === 'neg'
                        ? 'text-[#DC2626]'
                        : 'text-[#1C2B20]'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Flip / Reforma metrics ───────────────────────────────────────────── */}
      {result.flipMetrics && (
        <div>
          <SectionTitle>Reforma e Venda — Resultado</SectionTitle>
          <div className="divide-y divide-[#E2E0DA] border border-[#E2E0DA] text-sm">
            {[
              { label: 'Preço de venda (ARV)', value: fmt(result.flipMetrics.salePrice) },
              { label: 'Custos de venda', value: fmt(-result.flipMetrics.sellingCosts), neg: true },
              { label: 'Prazo da operação', value: `${result.flipMetrics.holdingMonths} meses` },
              {
                label: 'Ganho de capital bruto',
                value: fmt(result.flipMetrics.netProfit + result.flipMetrics.capitalGainTax),
                bold: true,
              },
              {
                label: 'Imposto (Ganho de Capital 15%)',
                value: fmt(-result.flipMetrics.capitalGainTax),
                neg: true,
              },
              {
                label: 'Lucro líquido',
                value: fmt(result.flipMetrics.netProfit),
                green: true,
                bold: true,
                final: true,
              },
              {
                label: 'ROI da operação',
                value: fmtPct(result.flipMetrics.roi),
                green: result.flipMetrics.roi >= 0,
                bold: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between px-4 py-3 ${row.final ? 'bg-[#F8F7F4]' : 'bg-[#FAFAF8]'}`}
              >
                <span className={row.bold ? 'font-semibold text-[#6B7280]' : 'text-[#9CA3AF]'}>
                  {row.label}
                </span>
                <span
                  className={`font-mono font-bold ${row.green ? 'text-[#4A7C59]' : row.neg ? 'text-[#DC2626]' : 'text-[#1C2B20]'}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Capital Breakdown ────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Estrutura de Capital</SectionTitle>
        <div className="divide-y divide-[#E2E0DA] border border-[#E2E0DA] text-sm">
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
            <div key={row.label} className="flex justify-between bg-[#FAFAF8] px-4 py-3">
              <span className="text-[#9CA3AF]">{row.label}</span>
              <span className="font-mono font-bold text-[#1C2B20]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fluxo de Caixa Mensal (24m) ─────────────────────────────────────── */}
      {cashflowMonthlyData.length > 0 && (
        <div>
          <SectionTitle>Fluxo de Caixa Mensal — 24 Meses</SectionTitle>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={cashflowMonthlyData}
                barSize={8}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={48}
                />
                <Tooltip content={<ChartTooltip prefix="Mês " />} />
                <ReferenceLine y={0} stroke="#D0CEC8" strokeWidth={1.5} />
                <Bar dataKey="fluxo" name="Fluxo líquido">
                  {cashflowMonthlyData.map((entry, index) => (
                    <Cell key={`cf-${index}`} fill={entry.fluxo >= 0 ? '#4A7C59' : '#DC2626'} />
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
        <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={benchmarkData}
              layout="vertical"
              barSize={16}
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6B7280' }}
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
                  background: '#F8F7F4',
                  border: '1px solid #E2E0DA',
                  borderRadius: 0,
                  color: '#1C2B20',
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value">
                {benchmarkData.map((entry, i) => (
                  <Cell key={`bm-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-right font-mono text-[10px] text-[#9CA3AF]">
            CDI atualizado semanalmente via Banco Central. FII é referência de mercado.
          </p>
        </div>
      </div>

      {/* ── 10-Year Projection ───────────────────────────────────────────────── */}
      {projectionData.length > 0 && (
        <div>
          <SectionTitle>Projeção 10 Anos — Valorização e Equity</SectionTitle>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="square"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, color: '#9CA3AF', paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Valor do imóvel"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#valGrad)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  name="Equity acumulado"
                  stroke="#4A7C59"
                  strokeWidth={2}
                  fill="url(#eqGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">
              Projeção assume 5% de valorização anual. Valores estimados, sem garantia.
            </p>
          </div>
        </div>
      )}

      {/* ── Amortization Schedule ────────────────────────────────────────────── */}
      {amortData.length > 0 && (
        <div>
          <SectionTitle>Amortização — Saldo Devedor Anual</SectionTitle>
          <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-5">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={amortData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E0DA" vertical={false} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtK}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="square"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, color: '#9CA3AF', paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo devedor"
                  stroke="#DC2626"
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
      {!hideSaveButton && (
        <div className="flex items-center justify-between gap-4 border border-[#E2E0DA] bg-[#FAFAF8] p-5">
          <div>
            <p className="text-sm font-black text-[#1C2B20]">
              {savedOk ? 'Análise salva!' : 'Salvar esta análise'}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">
              {savedOk
                ? 'Disponível no seu dashboard.'
                : isAuthenticated
                  ? 'Guarde este deal na sua conta.'
                  : 'Crie uma conta gratuita para guardar e compartilhar.'}
            </p>
            {saveError && <p className="mt-1 font-mono text-xs text-[#DC2626]">{saveError}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <DownloadPDFButton
              result={result}
              inputs={inputs}
              dealName={dealName ?? 'Deal'}
              className="flex items-center gap-1.5 border border-[#D0CEC8] bg-[#F0EFEB] px-4 py-2.5 text-xs font-black whitespace-nowrap text-[#6B7280] transition-colors hover:border-[#9CA3AF] hover:text-[#1C2B20]"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-[#D0CEC8] bg-[#F0EFEB] px-4 py-2.5 text-xs font-black whitespace-nowrap text-[#6B7280] transition-colors hover:border-[#9CA3AF] hover:text-[#1C2B20]"
              title="Imprimir análise"
            >
              <Printer size={12} />
              Imprimir
            </button>
            {savedOk && savedDealId && (
              <ShareButton
                dealId={savedDealId}
                dealName={dealName ?? 'Deal'}
                className="flex items-center gap-1.5 border border-[#1d4ed8] bg-[#1e3a8a] px-4 py-2.5 text-xs font-black whitespace-nowrap text-[#93c5fd] transition-colors hover:bg-[#1d4ed8] hover:text-white"
              />
            )}
            {isAuthenticated ? (
              <button
                onClick={handleSave}
                disabled={saving || savedOk}
                className="flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-[#3D6B4F] disabled:bg-[#A8C5B2] disabled:text-[#4A7C59]"
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
                className="flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-[#3D6B4F]"
              >
                Criar conta <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
