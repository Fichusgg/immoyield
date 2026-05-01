'use client';

/**
 * Simulador — what-if playground for the property owner.
 *
 * Lets the investor edit five core knobs (purchase price, rent, vacancy,
 * down-payment %, financing rate) and see the resulting cashflow / yield /
 * ImmoScore against the saved baseline. Goes beyond a sandbox by *answering*
 * the investor's two real questions:
 *
 *   1. "Is this a good deal?" → at-a-glance verdict badge (Bom · Equilíbrio · Ruim).
 *   2. "What rent would make it good?" → reverse-solved targets:
 *        • Aluguel para fluxo zero        (break-even on monthly cashflow)
 *        • Aluguel para superar CDI       (cash-on-cash ≥ CDI benchmark)
 *        • Aluguel para Cap Rate 8% / 10% (yield-target rents)
 *
 * The full rental engine (`analyzeRentalDeal`) backs every calculation, so
 * tax brackets, financing schedule, and IPCA-indexed projections all stay
 * in sync with the rest of the app.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedDeal } from '@/lib/supabase/deals';
import type { DealInput } from '@/lib/validations/deal';
import { analyzeRentalDeal } from '@/lib/calculations/rental';
import { calculateProjections } from '@/lib/calculations/projections';
import { computeImmoScore, getScoreLabel } from '@/lib/scoring';
import { PageHeader } from '@/components/property/PageHeader';
import { SectionHeading } from '@/components/property/SectionHeading';
import { FormCard } from '@/components/property/FormCard';
import { FormRow } from '@/components/property/FormRow';
import { NumberInput } from '@/components/property/NumberInput';
import { patchDeal } from '@/components/property/save-deal';
import { brl, pct } from '@/components/property/format';

interface Props {
  deal: SavedDeal;
}

const CDI_BENCHMARK = 13.65; // % a.a. — matches ResultsScreen default

// ── Scenario shape ──────────────────────────────────────────────────────────

interface Scenario {
  purchasePrice: number;
  monthlyRent: number;
  vacancyPct: number;       // 0..100
  downPaymentPct: number;   // 0..100
  interestPct: number;      // % a.a.
}

function makeBaselineScenario(inp: DealInput): Scenario {
  return {
    purchasePrice: inp.purchasePrice,
    monthlyRent: inp.revenue.monthlyRent,
    vacancyPct: (inp.revenue.vacancyRate ?? 0.05) * 100,
    downPaymentPct:
      inp.purchasePrice > 0
        ? (inp.financing.downPayment / inp.purchasePrice) * 100
        : 20,
    interestPct: inp.financing.interestRateYear,
  };
}

function applyScenario(base: DealInput, s: Scenario): DealInput {
  return {
    ...base,
    purchasePrice: s.purchasePrice,
    revenue: {
      ...base.revenue,
      monthlyRent: s.monthlyRent,
      vacancyRate: s.vacancyPct / 100,
    },
    financing: {
      ...base.financing,
      enabled: true,
      downPayment: s.purchasePrice * (s.downPaymentPct / 100),
      interestRateYear: s.interestPct,
    },
  };
}

// ── Goal-seek (binary search the smallest rent that satisfies a predicate) ──

type Metrics = ReturnType<typeof analyzeRentalDeal>['metrics'];

function findRentTarget(
  base: DealInput,
  scenario: Scenario,
  predicate: (m: Metrics) => boolean,
): number | null {
  let lo = 100;
  let hi = 200_000;
  // Probe the upper bound — if even hi fails, no answer exists.
  if (!predicate(analyzeRentalDeal(applyScenario(base, { ...scenario, monthlyRent: hi })).metrics)) {
    return null;
  }
  if (predicate(analyzeRentalDeal(applyScenario(base, { ...scenario, monthlyRent: lo })).metrics)) {
    return Math.round(lo);
  }
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const m = analyzeRentalDeal(applyScenario(base, { ...scenario, monthlyRent: mid })).metrics;
    if (predicate(m)) hi = mid;
    else lo = mid;
  }
  return Math.round(hi);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function SimuladorContent({ deal }: Props) {
  if (!deal.inputs) {
    return (
      <>
        <PageHeader
          title="Simulador"
          helper="Teste cenários alternativos e descubra qual aluguel torna o deal interessante."
        />
        <FormCard className="p-8 text-center">
          <p className="text-sm font-semibold text-[#1C2B20]">Análise não calculada</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Use a Planilha de Compra para preencher os dados, depois volte ao simulador.
          </p>
          <Link
            href={`/imoveis/${deal.id}/planilha`}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#4A7C59] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Abrir Planilha de Compra →
          </Link>
        </FormCard>
      </>
    );
  }
  return <SimuladorBody deal={deal} baseInputs={deal.inputs} />;
}

interface BodyProps {
  deal: SavedDeal;
  baseInputs: DealInput;
}

function SimuladorBody({ deal, baseInputs }: BodyProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const baseline = React.useMemo(() => makeBaselineScenario(baseInputs), [baseInputs]);
  const [scenario, setScenario] = React.useState<Scenario>(baseline);

  const set = <K extends keyof Scenario>(key: K, value: number) =>
    setScenario((p) => ({ ...p, [key]: value }));

  const dirty =
    scenario.purchasePrice !== baseline.purchasePrice ||
    scenario.monthlyRent !== baseline.monthlyRent ||
    scenario.vacancyPct !== baseline.vacancyPct ||
    scenario.downPaymentPct !== baseline.downPaymentPct ||
    scenario.interestPct !== baseline.interestPct;

  const handleSave = async () => {
    setSaving(true);
    try {
      const inp = applyScenario(baseInputs, scenario);
      const analysis = analyzeRentalDeal(inp);
      const projections = calculateProjections(
        inp,
        inp.projections?.holdPeriodYears ?? 10,
        inp.projections?.appreciationRate ?? 0.05,
      );
      await patchDeal(deal.id, {
        price: inp.purchasePrice,
        inputs: inp,
        results_cache: { ...analysis, projections },
      });
      toast.success('Salvo com novos valores.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // ── Live calculation ─────────────────────────────────────────────────────
  const scenarioResult = React.useMemo(
    () => analyzeRentalDeal(applyScenario(baseInputs, scenario)),
    [baseInputs, scenario],
  );
  const baselineResult = React.useMemo(
    () => analyzeRentalDeal(applyScenario(baseInputs, baseline)),
    [baseInputs, baseline],
  );

  const m = scenarioResult.metrics;
  const mB = baselineResult.metrics;

  const score = React.useMemo(
    () =>
      computeImmoScore({
        capRate: m.capRate,
        monthlyCashFlow: m.monthlyCashFlow,
        cashOutlay: m.cashOutlay,
        grossMonthlyRent: m.grossMonthlyRent ?? 0,
        operatingExpenses: m.operatingExpenses ?? 0,
      }),
    [m],
  );
  const scoreB = React.useMemo(
    () =>
      computeImmoScore({
        capRate: mB.capRate,
        monthlyCashFlow: mB.monthlyCashFlow,
        cashOutlay: mB.cashOutlay,
        grossMonthlyRent: mB.grossMonthlyRent ?? 0,
        operatingExpenses: mB.operatingExpenses ?? 0,
      }),
    [mB],
  );

  const cashFlow = m.monthlyCashFlow;
  const coc = m.cashOnCashNetPct ?? m.cashOnCash;
  const verdict = computeVerdict(cashFlow, coc, m.capRate);

  // ── Reverse goal-seek targets ────────────────────────────────────────────
  const targets = React.useMemo(() => {
    return {
      breakEven: findRentTarget(baseInputs, scenario, (mm) => mm.monthlyCashFlow >= 0),
      beatCdi: findRentTarget(
        baseInputs,
        scenario,
        (mm) => (mm.cashOnCashNetPct ?? mm.cashOnCash) >= CDI_BENCHMARK,
      ),
      cap8: findRentTarget(baseInputs, scenario, (mm) => mm.capRate >= 8),
      cap10: findRentTarget(baseInputs, scenario, (mm) => mm.capRate >= 10),
    };
  }, [baseInputs, scenario]);

  return (
    <>
      <PageHeader
        title="Simulador"
        helper="Mexa nos parâmetros e descubra em segundos se o deal melhora — e qual aluguel você precisa cobrar para bater o CDI."
        actions={
          dirty ? (
            <button
              type="button"
              onClick={() => setScenario(baseline)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              <RotateCcw size={12} />
              Restaurar valores reais
            </button>
          ) : (
            <span className="font-mono text-[10px] tracking-widest text-[#9CA3AF] uppercase">
              Cenário: real
            </span>
          )
        }
      />

      {/* ── Verdict badge ──────────────────────────────────────────────── */}
      <div
        className={`mb-6 flex flex-wrap items-center justify-between gap-4 border p-5 ${
          verdict.tone === 'positive'
            ? 'border-[#A8C5B2] bg-[#EBF3EE]'
            : verdict.tone === 'neutral'
              ? 'border-[#FED7AA] bg-[#FFFBEB]'
              : 'border-[#FECACA] bg-[#FEF2F2]'
        }`}
      >
        <div>
          <p
            className={`font-mono text-[10px] font-semibold tracking-[0.14em] uppercase ${
              verdict.tone === 'positive'
                ? 'text-[#3D6B4F]'
                : verdict.tone === 'neutral'
                  ? 'text-[#B45309]'
                  : 'text-[#991B1B]'
            }`}
          >
            Cenário simulado
          </p>
          <p
            className={`mt-1 text-xl font-black tracking-tight ${
              verdict.tone === 'positive'
                ? 'text-[#3D6B4F]'
                : verdict.tone === 'neutral'
                  ? 'text-[#B45309]'
                  : 'text-[#991B1B]'
            }`}
          >
            {verdict.label}
          </p>
          <p
            className={`mt-0.5 text-xs ${
              verdict.tone === 'positive'
                ? 'text-[#3D6B4F]'
                : verdict.tone === 'neutral'
                  ? 'text-[#B45309]'
                  : 'text-[#991B1B]'
            }`}
          >
            {verdict.detail}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <ResultPill
            label="Fluxo / mês"
            value={(cashFlow >= 0 ? '+ ' : '− ') + brl(Math.abs(cashFlow))}
            delta={cashFlow - mB.monthlyCashFlow}
            deltaFormatter={(d) => (d >= 0 ? `+${brl(d)}` : `−${brl(Math.abs(d))}`)}
            tone={cashFlow >= 0 ? 'positive' : 'negative'}
          />
          <ResultPill
            label="Rentab. anual"
            value={pct(m.netYieldAnnualPct ?? 0)}
            delta={(m.netYieldAnnualPct ?? 0) - (mB.netYieldAnnualPct ?? 0)}
            deltaFormatter={(d) => `${d >= 0 ? '+' : ''}${d.toFixed(2)} pp`}
            tone={(m.netYieldAnnualPct ?? 0) >= CDI_BENCHMARK ? 'positive' : 'neutral'}
          />
          <ResultPill
            label="ImmoScore"
            value={`${score.total} / 100`}
            delta={score.total - scoreB.total}
            deltaFormatter={(d) => `${d >= 0 ? '+' : ''}${d}`}
            tone={getScoreLabel(score.total).label === 'Excelente' || getScoreLabel(score.total).label === 'Bom' ? 'positive' : 'neutral'}
          />
        </div>
      </div>

      {/* ── Two-column body: sliders | targets ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT — parameter inputs */}
        <div>
          <SectionHeading label="Ajuste os parâmetros" />
          <FormCard>
            <SimField
              label="Preço de compra"
              value={scenario.purchasePrice}
              baseline={baseline.purchasePrice}
              prefix="R$"
              onChange={(v) => set('purchasePrice', v)}
            />
            <SimField
              label="Aluguel mensal"
              value={scenario.monthlyRent}
              baseline={baseline.monthlyRent}
              prefix="R$"
              suffix="/mês"
              onChange={(v) => set('monthlyRent', v)}
            />
            <SimField
              label="Taxa de vacância"
              value={scenario.vacancyPct}
              baseline={baseline.vacancyPct}
              suffix="%"
              decimals={1}
              percent
              onChange={(v) => set('vacancyPct', v)}
            />
            <SimField
              label="Entrada"
              value={scenario.downPaymentPct}
              baseline={baseline.downPaymentPct}
              suffix="%"
              decimals={0}
              percent
              hint={`= ${brl((scenario.downPaymentPct / 100) * scenario.purchasePrice)}`}
              onChange={(v) => set('downPaymentPct', v)}
            />
            <SimField
              label="Juros do financiamento"
              value={scenario.interestPct}
              baseline={baseline.interestPct}
              suffix="% a.a."
              decimals={2}
              percent
              onChange={(v) => set('interestPct', v)}
            />
          </FormCard>

          {/* Bonus: NOI + parcela visible at the bottom for transparency */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <MiniStat label="Cap Rate" value={pct(m.capRate)} />
            <MiniStat label="Cash-on-Cash" value={pct(m.cashOnCashNetPct ?? m.cashOnCash)} />
            <MiniStat
              label="Parcela / mês"
              value={brl(m.firstInstallment ?? 0)}
            />
          </div>
        </div>

        {/* RIGHT — goal-seek answers */}
        <div>
          <SectionHeading label="Quanto de aluguel preciso cobrar?" />
          <FormCard className="p-0">
            <TargetRow
              title="Para fluxo zero"
              subtitle="O ponto em que o aluguel paga toda a operação"
              currentRent={scenario.monthlyRent}
              targetRent={targets.breakEven}
            />
            <TargetRow
              title="Para superar o CDI"
              subtitle={`Cash-on-cash ≥ ${pct(CDI_BENCHMARK)} a.a.`}
              currentRent={scenario.monthlyRent}
              targetRent={targets.beatCdi}
            />
            <TargetRow
              title="Cap Rate de 8%"
              subtitle="Yield bruto típico de aluguel residencial premium"
              currentRent={scenario.monthlyRent}
              targetRent={targets.cap8}
            />
            <TargetRow
              title="Cap Rate de 10%"
              subtitle="Yield agressivo · raro em capitais"
              currentRent={scenario.monthlyRent}
              targetRent={targets.cap10}
              last
            />
          </FormCard>

          <p className="mt-3 font-mono text-[10px] text-[#9CA3AF]">
            Cálculos consideram financiamento, IR (regime do deal), vacância e despesas operacionais.
          </p>
        </div>
      </div>

      {/* ── Save / Reset bar ────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E0DA] pt-5">
        <button
          type="button"
          onClick={() => setScenario(baseline)}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-2 text-xs font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Restaurar valores reais
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-full bg-[#4A7C59] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar novos valores'}
        </button>
      </div>
    </>
  );
}

// ── Verdict logic ──────────────────────────────────────────────────────────

function computeVerdict(
  monthlyCashFlow: number,
  cashOnCashPct: number,
  capRatePct: number,
): { label: string; tone: 'positive' | 'neutral' | 'negative'; detail: string } {
  if (monthlyCashFlow < 0) {
    return {
      label: 'RUIM',
      tone: 'negative',
      detail: 'Fluxo de caixa mensal negativo — você paga para manter o imóvel.',
    };
  }
  if (cashOnCashPct >= CDI_BENCHMARK) {
    return {
      label: 'BOM DEAL',
      tone: 'positive',
      detail: `Cash-on-cash de ${pct(cashOnCashPct)} supera o CDI de ${pct(CDI_BENCHMARK)} — bom uso de capital.`,
    };
  }
  return {
    label: 'EQUILÍBRIO',
    tone: 'neutral',
    detail: `Fluxo positivo, mas cash-on-cash ${pct(cashOnCashPct)} ainda abaixo do CDI ${pct(CDI_BENCHMARK)}. Cap Rate ${pct(capRatePct)}.`,
  };
}

// ── Result pill (inside the verdict banner) ────────────────────────────────

function ResultPill({
  label,
  value,
  delta,
  deltaFormatter,
  tone,
}: {
  label: string;
  value: string;
  delta: number;
  deltaFormatter: (d: number) => string;
  tone: 'positive' | 'neutral' | 'negative';
}) {
  const showDelta = Math.abs(delta) > 1e-3;
  const Arrow = !showDelta ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const arrowColor = !showDelta
    ? 'text-[#9CA3AF]'
    : delta > 0
      ? 'text-[#4A7C59]'
      : 'text-[#DC2626]';

  return (
    <div className="text-right">
      <p className="font-mono text-[9px] tracking-widest text-[#9CA3AF] uppercase">{label}</p>
      <p
        className={`font-mono text-base font-black tabular-nums ${
          tone === 'positive'
            ? 'text-[#4A7C59]'
            : tone === 'negative'
              ? 'text-[#DC2626]'
              : 'text-[#1C2B20]'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 inline-flex items-center justify-end gap-1 font-mono text-[10px] tabular-nums text-[#6B7280]">
        <Arrow size={10} className={arrowColor} />
        {showDelta ? deltaFormatter(delta) : 'sem alteração'}
      </p>
    </div>
  );
}

// ── Mini stat tile ─────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2">
      <p className="font-mono text-[9px] tracking-widest text-[#9CA3AF] uppercase">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-[#1C2B20]">{value}</p>
    </div>
  );
}

// ── Target row (goal-seek answer) ──────────────────────────────────────────

function TargetRow({
  title,
  subtitle,
  currentRent,
  targetRent,
  last,
}: {
  title: string;
  subtitle: string;
  currentRent: number;
  targetRent: number | null;
  last?: boolean;
}) {
  const reached = targetRent != null && currentRent >= targetRent;
  const delta = targetRent != null ? targetRent - currentRent : null;

  return (
    <div
      className={`flex items-start justify-between gap-3 px-5 py-4 ${
        last ? '' : 'border-b border-[#F0EFEB]'
      } ${reached ? 'bg-[#EBF3EE]/40' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1C2B20]">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{subtitle}</p>
      </div>
      <div className="shrink-0 text-right">
        {targetRent == null ? (
          <p className="font-mono text-xs text-[#9CA3AF]">—</p>
        ) : (
          <>
            <p
              className={`font-mono text-base font-black tabular-nums ${
                reached ? 'text-[#4A7C59]' : 'text-[#1C2B20]'
              }`}
            >
              {brl(targetRent)}
            </p>
            <p className={`font-mono text-[10px] ${reached ? 'text-[#4A7C59]' : 'text-[#6B7280]'}`}>
              {reached
                ? '✓ atingido'
                : delta != null
                  ? `+ ${brl(delta)} acima do atual`
                  : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Parameter field — NumberInput row with baseline drift indicator ───────

function SimField({
  label,
  value,
  baseline,
  prefix,
  suffix,
  decimals = 0,
  hint,
  onChange,
  percent,
}: {
  label: string;
  value: number;
  baseline: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  decimals?: number;
  hint?: string;
  onChange: (v: number) => void;
  percent?: boolean;
}) {
  const drift = Math.abs(value - baseline) > 1e-3;

  return (
    <FormRow
      label={
        <span className="inline-flex items-center gap-2">
          {label}
          {drift && (
            <span className="rounded-sm bg-[#FFFBEB] px-1 py-0.5 font-mono text-[9px] font-bold tracking-wide text-[#B45309] uppercase">
              alterado
            </span>
          )}
        </span>
      }
    >
      <div className="space-y-1">
        <NumberInput
          value={value}
          onChange={(v) => onChange(typeof v === 'number' ? v : 0)}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          percent={percent}
        />
        {hint && (
          <p className="font-mono text-[10px] text-[#9CA3AF]">{hint}</p>
        )}
      </div>
    </FormRow>
  );
}
