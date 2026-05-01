'use client';

/**
 * HeroCalculator — interactive mini-underwrite for the landing-page hero.
 *
 * Four sliders (purchase price, monthly rent, down payment, interest rate)
 * feed a simplified rental computation that mirrors the real app:
 *   • PRICE installment on the financed balance
 *   • Operating expenses ≈ 25% of gross rent (condo + IPTU + mgmt + maint)
 *   • Carnê-Leão IR (PF, single-bracket lookup) on rent net of those expenses
 *   • ImmoScore via the same `computeImmoScore` used in production
 *
 * Numbers are intentionally directional — meant to demo the product, not to
 * replace the full /analisar flow. Hooked to the real scoring lib so the
 * label/colour scale matches what users see after sign-up.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { computeImmoScore, getScoreLabel } from '@/lib/scoring';
import { carneLeaoMonthly } from '@/lib/calculations/taxes';
import { useDealStore } from '@/store/useDealStore';

const SAGE = '#4A7C59';
const SAGE_DIM = '#3D6B4F';
const EASE = [0.25, 0.1, 0.25, 1] as const;

// ── Default inputs ────────────────────────────────────────────────────────
// Calibrated to land slightly cashflow-positive (~R$ 450/mo) at a 9% cap rate
// — a representative tier-2 BR rental that earns the user's attention.
const DEFAULTS = {
  purchasePrice: 350_000,
  monthlyRent: 3_500,
  downPaymentPct: 30,
  interestPct: 10,
};

const RANGES = {
  purchasePrice: { min: 200_000, max: 3_000_000, step: 10_000 },
  monthlyRent:   { min: 1_000,   max: 30_000,    step: 100    },
  downPaymentPct:{ min: 10,      max: 100,       step: 1      },
  interestPct:   { min: 7,       max: 16,        step: 0.1    },
};

const TERM_MONTHS = 360; // 30y, fixed for the mini-calc
const OPEX_RATIO  = 0.25; // 25% of gross rent — rough Brazil-tier-1 average
const CLOSING_PCT = 0.05; // ITBI + cartório + reformas as a single bucket

// ── Formatters ─────────────────────────────────────────────────────────────
const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const brlSigned = (v: number) =>
  (v >= 0 ? '+ ' : '− ') + brl(Math.abs(v));

const pct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

// ── PRICE amortization helper ─────────────────────────────────────────────
function priceInstallment(loan: number, ratePerYear: number, months: number): number {
  if (loan <= 0) return 0;
  const r = ratePerYear / 100 / 12;
  if (r === 0) return loan / months;
  return (loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

// ── Component ──────────────────────────────────────────────────────────────
export function HeroCalculator() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const seedFormData = useDealStore((s) => s.updateFormData);
  const setActiveTab = useDealStore((s) => s.setActiveTab);

  const [purchasePrice, setPurchasePrice] = useState(DEFAULTS.purchasePrice);
  const [monthlyRent, setMonthlyRent] = useState(DEFAULTS.monthlyRent);
  const [downPaymentPct, setDownPaymentPct] = useState(DEFAULTS.downPaymentPct);
  const [interestPct, setInterestPct] = useState(DEFAULTS.interestPct);

  const computed = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPct / 100);
    const closingCosts = purchasePrice * CLOSING_PCT;
    const cashOutlay = downPayment + closingCosts;
    const loan = Math.max(0, purchasePrice - downPayment);
    const installment = priceInstallment(loan, interestPct, TERM_MONTHS);

    const operatingExpenses = monthlyRent * OPEX_RATIO;
    const noi = monthlyRent - operatingExpenses;

    // Carnê-Leão on rent net of allowed deductions (the OPEX bucket above is
    // close enough to the deductible set: condo + IPTU + mgmt fee).
    const monthlyIR = carneLeaoMonthly(Math.max(0, monthlyRent - operatingExpenses));
    const monthlyCashFlow = noi - installment - monthlyIR;
    const annualNOI = noi * 12;
    const capRate = (annualNOI / purchasePrice) * 100;

    const score = computeImmoScore({
      capRate,
      monthlyCashFlow,
      cashOutlay,
      grossMonthlyRent: monthlyRent,
      operatingExpenses,
    });

    return {
      downPayment,
      cashOutlay,
      loan,
      installment,
      operatingExpenses,
      monthlyIR,
      monthlyCashFlow,
      capRate,
      score,
      label: getScoreLabel(score.total),
    };
  }, [purchasePrice, monthlyRent, downPaymentPct, interestPct]);

  const positive = computed.monthlyCashFlow >= 0;

  /**
   * Seed the wizard's form store with the slider values, then navigate to
   * the new-analysis flow. The store uses zustand+persist so the seeded
   * values survive an /auth round-trip if the user isn't logged in yet.
   */
  const handleStartFullAnalysis = () => {
    seedFormData({
      propertyType: 'residential',
      purchasePrice,
      financing: {
        enabled: true,
        downPayment: computed.downPayment,
        interestRateYear: interestPct,
        termMonths: TERM_MONTHS,
        system: 'PRICE',
      },
      revenue: {
        monthlyRent,
        // ReceitasEDespesas treats vacancyRate as a fraction (0..1) on save —
        // pre-fill a sensible default so the user lands with a complete state.
        vacancyRate: 0.05,
      },
    });
    // Always start the wizard at the first tab so the user reviews each step.
    setActiveTab(0);
    router.push('/propriedades?wizard=1');
  };

  return (
    <motion.div
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
      className="relative md:col-span-6"
    >
      <div
        className="relative border border-[#E2E0DA] bg-[#FAFAF8] p-6 md:p-7"
        style={{ boxShadow: '0 20px 40px -12px rgba(28,43,32,0.08)' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
            Calculadora · Tempo Real
          </p>
          <p className="font-mono text-[10px] text-[#9CA3AF]">
            Cap Rate · {pct(computed.capRate)}
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <Slider
            label="Preço de compra"
            value={purchasePrice}
            display={brl(purchasePrice)}
            onChange={setPurchasePrice}
            range={RANGES.purchasePrice}
          />
          <Slider
            label="Aluguel mensal"
            value={monthlyRent}
            display={`${brl(monthlyRent)}/mês`}
            onChange={setMonthlyRent}
            range={RANGES.monthlyRent}
          />
          <Slider
            label="Entrada"
            value={downPaymentPct}
            display={`${downPaymentPct}% · ${brl(computed.downPayment)}`}
            onChange={setDownPaymentPct}
            range={RANGES.downPaymentPct}
          />
          <Slider
            label="Juros do financiamento"
            value={interestPct}
            display={`${interestPct.toFixed(1).replace('.', ',')}% a.a.`}
            onChange={setInterestPct}
            range={RANGES.interestPct}
          />
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-[#E2E0DA]" />

        {/* Outputs */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cash flow */}
          <div
            className={`flex flex-col gap-1 border p-4 ${
              positive
                ? 'border-[#A8C5B2] bg-[#EBF3EE]'
                : 'border-[#FECACA] bg-[#FEF2F2]'
            }`}
          >
            <span
              className={`text-[10px] font-semibold tracking-[0.06em] uppercase ${
                positive ? 'text-[#3D6B4F]' : 'text-[#B45309]'
              }`}
            >
              Fluxo / mês
            </span>
            <span
              className={`font-mono text-xl font-black tabular-nums ${
                positive ? 'text-[#4A7C59]' : 'text-[#DC2626]'
              }`}
            >
              {brlSigned(computed.monthlyCashFlow)}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">
              líquido de IR e despesas
            </span>
          </div>

          {/* ImmoScore */}
          <div
            className={`flex flex-col gap-1 border p-4 ${computed.label.bg} ${computed.label.border}`}
          >
            <span className={`text-[10px] font-semibold tracking-[0.06em] uppercase ${computed.label.color}`}>
              ImmoScore
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-mono text-xl font-black tabular-nums ${computed.label.color}`}
              >
                {computed.score.total}
              </span>
              <span className={`font-mono text-[10px] ${computed.label.color} opacity-60`}>
                /100
              </span>
            </div>
            <span className={`text-[10px] ${computed.label.color} opacity-80`}>
              {computed.label.label}
            </span>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-4 font-mono text-[10px] text-[#9CA3AF]">
          Estimativa em 5s · sem cadastro · matemática igual à do app
        </p>

        {/* CTA — seeds the wizard with the current slider values */}
        <button
          type="button"
          onClick={handleStartFullAnalysis}
          className="mt-3 inline-flex items-center justify-center self-start text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors"
          style={{ color: SAGE }}
          onMouseEnter={(e) => (e.currentTarget.style.color = SAGE_DIM)}
          onMouseLeave={(e) => (e.currentTarget.style.color = SAGE)}
        >
          Salvar essa análise →
        </button>
      </div>
    </motion.div>
  );
}

// ── Slider primitive ───────────────────────────────────────────────────────
function Slider({
  label,
  value,
  display,
  onChange,
  range,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
  range: { min: number; max: number; step: number };
}) {
  const pctFilled = ((value - range.min) / (range.max - range.min)) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.04em] text-[#6B7280]">
          {label}
        </span>
        <span className="font-mono text-xs font-semibold tabular-nums text-[#1C2B20]">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hero-calc-slider w-full cursor-pointer appearance-none bg-transparent"
        style={{
          // Custom track painted via CSS variable, so the filled portion is sage.
          ['--filled' as string]: `${pctFilled}%`,
        }}
        aria-label={label}
      />
    </div>
  );
}
