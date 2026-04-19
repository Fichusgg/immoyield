'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { SavedDeal } from '@/lib/supabase/deals';

// ─── Market Reference Data (2025 / April 2026) ───────────────────────────────
// Sources: Banco Central do Brasil, FipeZap, ABECIP, JLL, SECOVI-SP

const SELIC = 14.75;         // % a.a. — BCB April 2026
const TR_ANNUAL = 1.97;      // % a.a. — BCB 2025 full-year average
const IFIX_YIELD = 11.64;    // % a.a. — IFIX weighted dividend yield, Oct 2025
const NATIONAL_GROSS_YIELD = 5.71; // % — FipeZap Q1 2026 national average

const SFH_MAX_VALUE = 2_250_000; // raised from R$1.5M — Conselho FGTS, Nov 2025

// TR-indexed SFH rates from major banks (nominal + TR ≈ effective)
const SFH_BANKS = [
  { id: 'caixa',     label: 'Caixa Econômica Federal', nominal: 11.19, cet: 12.39 },
  { id: 'itau',      label: 'Itaú Unibanco',           nominal: 11.60, cet: 13.15 },
  { id: 'bradesco',  label: 'Bradesco',                nominal: 11.70, cet: 12.75 },
  { id: 'santander', label: 'Santander',               nominal: 11.69, cet: 12.75 },
  { id: 'bb',        label: 'Banco do Brasil',         nominal: 12.00, cet: 13.00 },
];

const SFI_RATE = 13.5; // % a.a. fixed — typical SFI market rate 2025

// MCMV 2025 faixas (urban, residential, primary residence)
const MCMV_BRACKETS = [
  { faixa: 1, maxIncome:  2_850, maxPrice:  190_000, rateMid:  4.50, subsidyLabel: 'até R$ 55.000' },
  { faixa: 2, maxIncome:  4_700, maxPrice:  264_000, rateMid:  5.88, subsidyLabel: 'até R$ 55.000' },
  { faixa: 3, maxIncome:  8_600, maxPrice:  350_000, rateMid:  7.91, subsidyLabel: 'sem subsídio'  },
  { faixa: 4, maxIncome: 12_000, maxPrice:  600_000, rateMid: 10.50, subsidyLabel: 'sem subsídio'  },
];

// FipeZap gross yield benchmarks by city (Jan/Oct 2025)
const CITY_YIELDS = [
  { keys: ['belém', 'belem'],                      gross: 8.62, net: 6.5 },
  { keys: ['manaus'],                               gross: 8.15, net: 6.2 },
  { keys: ['recife'],                               gross: 8.06, net: 6.0 },
  { keys: ['fortaleza'],                            gross: 7.50, net: 5.5 },
  { keys: ['brasília', 'brasilia'],                 gross: 6.35, net: 4.9 },
  { keys: ['são paulo', 'sao paulo'],               gross: 6.25, net: 4.8 },
  { keys: ['salvador'],                             gross: 6.00, net: 4.5 },
  { keys: ['florianópolis', 'florianopolis'],       gross: 5.60, net: 4.2 },
  { keys: ['rio de janeiro'],                       gross: 5.85, net: 4.4 },
  { keys: ['porto alegre'],                         gross: 5.00, net: 3.7 },
  { keys: ['belo horizonte'],                       gross: 5.07, net: 3.8 },
  { keys: ['curitiba'],                             gross: 4.50, net: 3.3 },
];

// Average yield by bedroom count (national, FipeZap Jan 2025)
const BEDROOM_YIELD: Record<number, number> = { 1: 6.58, 2: 5.90, 3: 5.20, 4: 4.73 };

// ITBI rates by municipality (2025)
const CITY_ITBI = [
  { keys: ['brasília', 'brasilia'],                     rate: 0.01 },
  { keys: ['recife', 'rio de janeiro', 'belo horizonte'], rate: 0.02 },
  { keys: ['fortaleza'],                                rate: 0.04 },
  { keys: ['curitiba'],                                 rate: 0.027 },
];

// Price/m² benchmarks by city
const CITY_PRICE_M2 = [
  { keys: ['são paulo', 'sao paulo'],   avg: 11_945 },
  { keys: ['rio de janeiro'],           avg: 10_865 },
  { keys: ['brasília', 'brasilia'],     avg:  9_500 },
  { keys: ['curitiba'],                 avg:  7_800 },
  { keys: ['belo horizonte'],           avg:  7_200 },
  { keys: ['porto alegre'],             avg:  6_900 },
  { keys: ['fortaleza'],                avg:  5_800 },
  { keys: ['recife'],                   avg:  5_500 },
  { keys: ['salvador'],                 avg:  5_500 },
];

// GRM benchmarks (1/grossYield × 12)
const CITY_GRM = [
  { keys: ['são paulo', 'sao paulo'],   grm: 16.0 },
  { keys: ['rio de janeiro'],           grm: 17.1 },
  { keys: ['belo horizonte'],           grm: 19.7 },
  { keys: ['curitiba'],                 grm: 22.2 },
  { keys: ['brasília', 'brasilia'],     grm: 15.7 },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

function cityLookup<T>(
  city: string | null | undefined,
  table: { keys: string[]; [k: string]: unknown }[],
  field: string,
  fallback: T,
): T {
  if (!city) return fallback;
  const c = city.toLowerCase();
  for (const row of table) {
    if ((row.keys as string[]).some((k) => c.includes(k))) return row[field] as T;
  }
  return fallback;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const R = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

const Pct = (v: number, d = 1) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(v / 100);

const N = (v: number, d = 1) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(v);

// ─── Amortization calculators ─────────────────────────────────────────────────

function sacCalc(principal: number, annualRate: number, months: number) {
  const r = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const amort = principal / months;
  const firstInstallment = amort + principal * r;
  const lastInstallment = amort * (1 + r);
  // Exact SAC total interest: r × principal × (months + 1) / 2
  const totalInterest = r * principal * (months + 1) / 2;
  const totalPaid = principal + totalInterest;
  return { firstInstallment, lastInstallment, totalInterest, totalPaid, monthlyAmort: amort };
}

function priceCalc(principal: number, annualRate: number, months: number) {
  const r = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const installment =
    r === 0
      ? principal / months
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalPaid = installment * months;
  const totalInterest = totalPaid - principal;
  return { installment, totalInterest, totalPaid };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalysisTab = 'renda' | 'financiamento' | 'metricas' | 'alertas';

interface Inputs {
  monthlyRent: number;
  vacancyRate: number;       // 0–1
  managementRate: number;    // 0–1
  maintenanceRate: number;   // 0–1 of price/year
  insuranceAnnual: number;   // R$/year
  condoMonthly: number;
  iptuAnnual: number;
  downPaymentPct: number;    // 0–100
  termMonths: number;
  bankIdx: number;           // index in SFH_BANKS
  brokerPct: number;         // 0–100
  buyerMonthlyIncome: number;
  isFirstProperty: boolean;
}

// ─── Rating helpers ───────────────────────────────────────────────────────────

type Rating = 'green' | 'yellow' | 'orange' | 'red' | 'neutral';

const RATING_CLASSES: Record<Rating, string> = {
  green:   'bg-green-50 text-green-700 border border-green-200',
  yellow:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  orange:  'bg-orange-50 text-orange-700 border border-orange-200',
  red:     'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-[#f5f5f3] text-[#737373] border border-[#e5e5e3]',
};

function Badge({ rating, label }: { rating: Rating; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${RATING_CLASSES[rating]}`}>
      {label}
    </span>
  );
}

function ratingIcon(rating: Rating) {
  if (rating === 'green')  return <TrendingUp size={14} className="text-green-600" />;
  if (rating === 'red')    return <TrendingDown size={14} className="text-red-500" />;
  if (rating === 'orange') return <AlertTriangle size={14} className="text-orange-500" />;
  if (rating === 'yellow') return <Minus size={14} className="text-yellow-600" />;
  return <Minus size={14} className="text-[#737373]" />;
}

// ─── Small reusable UI ────────────────────────────────────────────────────────

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e5e3] bg-[#f5f5f3] px-5 py-3">
        <p className="text-[10px] font-bold tracking-widest text-[#1a5c3a] uppercase">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function MetricRow({
  label,
  value,
  sub,
  rating,
  indent,
}: {
  label: string;
  value: string;
  sub?: string;
  rating?: Rating;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${indent ? 'pl-9' : ''}`}>
      <div className="flex items-center gap-2">
        {rating && ratingIcon(rating)}
        <div>
          <p className="text-sm text-[#737373]">{label}</p>
          {sub && <p className="text-xs text-[#a3a3a1]">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-[#1c2b20]">{value}</span>
        {rating && <Badge rating={rating} label={
          rating === 'green'  ? 'Bom'      :
          rating === 'yellow' ? 'Regular'  :
          rating === 'orange' ? 'Atenção'  :
          rating === 'red'    ? 'Ruim'     : '—'
        } />}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-5 border-t border-[#f5f5f3]" />;
}

function TotalRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 ${positive === undefined ? 'bg-[#f5f5f3]' : positive ? 'bg-green-50' : 'bg-red-50'}`}>
      <span className="text-sm font-bold text-[#1c2b20]">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${positive === undefined ? 'text-[#1c2b20]' : positive ? 'text-green-700' : 'text-red-600'}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  suffix,
  prefix,
  min,
  max,
  step,
  hint,
  money,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  money?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const formattedMoney = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold tracking-wide text-[#737373] uppercase">
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-lg border border-[#e5e5e3] bg-white px-2.5 py-1.5 focus-within:border-[#1a5c3a] focus-within:ring-1 focus-within:ring-[#1a5c3a]/20">
        {prefix && <span className="text-xs text-[#a3a3a1]">{prefix}</span>}
        {money ? (
          <input
            type="text"
            inputMode="numeric"
            value={editing ? draft : formattedMoney}
            onFocus={() => { setEditing(true); setDraft(String(value)); }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const cleaned = draft.replace(/\./g, '').replace(',', '.');
              onChange(parseFloat(cleaned) || 0);
            }}
            className="w-full min-w-0 bg-transparent text-sm font-medium text-[#1c2b20] outline-none tabular-nums"
          />
        ) : (
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step ?? 1}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-full min-w-0 bg-transparent text-sm font-medium text-[#1c2b20] outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}
        {suffix && <span className="text-xs text-[#a3a3a1] shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-[#a3a3a1]">{hint}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  deal: SavedDeal;
  /** When true the analysis panel opens immediately without requiring a button click.
   *  Pass true when there are no wizard results so the section is immediately useful. */
  defaultOpen?: boolean;
  /** Override the heading text shown in both collapsed button and open header. */
  heading?: string;
}

export default function BrazilianAnalysis({ deal, defaultOpen = false, heading }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('renda');
  const [showRef, setShowRef] = useState(false);

  // ── Smart defaults from deal data ──────────────────────────────────────────
  const price = deal.price ?? deal.inputs?.purchasePrice ?? 0;
  const city  = deal.city ?? deal.inputs?.property?.address?.city ?? null;
  const beds  = deal.bedrooms ?? deal.inputs?.property?.bedrooms ?? 2;
  const area  = deal.area ?? deal.inputs?.property?.squareFootage ?? null;

  const defaultYield    = cityLookup(city, CITY_YIELDS, 'gross', NATIONAL_GROSS_YIELD);
  const defaultRent     = deal.inputs?.revenue?.monthlyRent
                          ?? Math.round((price * defaultYield) / 100 / 12);
  const defaultCondo    = deal.condo_fee ?? deal.inputs?.expenses?.condo ?? 0;
  const defaultIptu     = (deal.iptu ?? deal.inputs?.expenses?.iptu ?? 0) * 12;
  const defaultVacancy  = deal.inputs?.revenue?.vacancyRate ?? 0.09;
  const defaultMgmt     = deal.inputs?.expenses?.managementPercent ?? 0.10;
  const defaultMaint    = deal.inputs?.expenses?.maintenancePercent ?? 0.005;
  const defaultBroker   = 5;
  const defaultDP       = 20;
  const defaultItbi     = cityLookup(city, CITY_ITBI, 'rate', 0.03) * 100;

  const [inp, setInp] = useState<Inputs>({
    monthlyRent:        defaultRent,
    vacancyRate:        defaultVacancy,
    managementRate:     defaultMgmt,
    maintenanceRate:    defaultMaint,
    insuranceAnnual:    600,
    condoMonthly:       defaultCondo,
    iptuAnnual:         defaultIptu,
    downPaymentPct:     defaultDP,
    termMonths:         360,
    bankIdx:            0,
    brokerPct:          defaultBroker,
    buyerMonthlyIncome: 0,
    isFirstProperty:    true,
  });

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) =>
    setInp((prev) => ({ ...prev, [k]: v }));

  // ── Core calculations (all memoised) ───────────────────────────────────────
  const calc = useMemo(() => {
    if (price <= 0) return null;

    // ── A: Income / Renda ──────────────────────────────────────────────────
    const annualGross       = inp.monthlyRent * 12;
    const vacancyLoss       = annualGross * inp.vacancyRate;
    const effectiveAnnual   = annualGross - vacancyLoss;

    const annualMgmt        = effectiveAnnual * inp.managementRate;
    const annualCondo       = inp.condoMonthly * 12;
    const annualIptu        = inp.iptuAnnual;
    const annualInsurance   = inp.insuranceAnnual;
    const annualMaint       = price * inp.maintenanceRate;

    const annualCosts       = annualCondo + annualIptu + annualMgmt + annualMaint + annualInsurance;
    const annualNOI         = effectiveAnnual - annualCosts;
    const monthlyNOI        = annualNOI / 12;

    const grossYield        = price > 0 ? (annualGross / price) * 100 : 0;
    const netYield          = price > 0 ? (annualNOI  / price) * 100 : 0;

    // cost drain
    const costDrainPct      = annualGross > 0 ? ((annualGross - annualNOI) / annualGross) * 100 : 0;
    const vacancySharePct   = annualGross > 0 ? (vacancyLoss  / annualGross) * 100 : 0;
    const mgmtSharePct      = annualGross > 0 ? (annualMgmt   / annualGross) * 100 : 0;
    const condoSharePct     = annualGross > 0 ? (annualCondo  / annualGross) * 100 : 0;
    const iptuSharePct      = annualGross > 0 ? (annualIptu   / annualGross) * 100 : 0;
    const maintSharePct     = annualGross > 0 ? (annualMaint  / annualGross) * 100 : 0;
    const insSharePct       = annualGross > 0 ? (annualInsurance / annualGross) * 100 : 0;
    const netSharePct       = 100 - costDrainPct;

    // yield rating vs city benchmark
    const cityGross         = cityLookup(city, CITY_YIELDS, 'gross', NATIONAL_GROSS_YIELD);
    const yieldDelta        = grossYield - cityGross;
    const yieldRating: Rating =
      yieldDelta >  1.5 ? 'green'  :
      yieldDelta >  0   ? 'yellow' :
      yieldDelta > -1.5 ? 'yellow' : 'red';

    // ── B: Financing ──────────────────────────────────────────────────────
    const downPayment       = price * (inp.downPaymentPct / 100);
    const loanAmount        = price - downPayment;

    const bank              = SFH_BANKS[inp.bankIdx];
    const sfhEffectiveRate  = bank.nominal + TR_ANNUAL;  // approximation
    const sfhSAC            = loanAmount > 0 ? sacCalc(loanAmount,  sfhEffectiveRate, inp.termMonths) : null;
    const sfhPRICE          = loanAmount > 0 ? priceCalc(loanAmount, sfhEffectiveRate, inp.termMonths) : null;
    const sfiSAC            = loanAmount > 0 ? sacCalc(loanAmount,  SFI_RATE, inp.termMonths) : null;
    const sfiPRICE          = loanAmount > 0 ? priceCalc(loanAmount, SFI_RATE, inp.termMonths) : null;

    const sfhInterestSaving = (sfhPRICE && sfhSAC)
      ? sfhPRICE.totalInterest - sfhSAC.totalInterest : 0;
    const sfiInterestSaving = (sfiPRICE && sfiSAC)
      ? sfiPRICE.totalInterest - sfiSAC.totalInterest : 0;

    const isSFHEligible     = price <= SFH_MAX_VALUE;
    const mcmvBracket       = MCMV_BRACKETS.find(
      (b) => price <= b.maxPrice && inp.isFirstProperty,
    ) ?? null;

    // down payment sensitivity (B4): 20 / 30 / 40 / 50%
    const dpScenarios = [20, 30, 40, 50].map((dpPct) => {
      const dp    = price * (dpPct / 100);
      const loan  = price - dp;
      const sac   = loan > 0 ? sacCalc(loan, sfhEffectiveRate, inp.termMonths) : null;
      const cf    = monthlyNOI - (sac?.firstInstallment ?? 0);
      const totalCash = dp + (price * (defaultItbi / 100)) + (price * 0.0075)
                        + (price * (inp.brokerPct / 100)) + 1_500;
      const coc   = totalCash > 0 ? ((cf * 12) / totalCash) * 100 : 0;
      return { dpPct, dp, loan, firstInstallment: sac?.firstInstallment ?? 0, cf, coc };
    });

    // break-even occupancy (A3)
    const monthlyFixed = inp.condoMonthly + (inp.iptuAnnual / 12)
                        + (inp.insuranceAnnual / 12) + (annualMaint / 12)
                        + (sfhSAC?.firstInstallment ?? 0);
    const beo          = inp.monthlyRent > 0
      ? (monthlyFixed / (inp.monthlyRent * (1 - inp.managementRate))) * 100 : 0;
    const beoRating: Rating =
      beo < 60 ? 'green' :
      beo < 75 ? 'yellow' :
      beo < 85 ? 'orange' : 'red';

    // ── C: Transaction costs ──────────────────────────────────────────────
    const itbiRate      = defaultItbi / 100;
    const itbiAmt       = price * itbiRate;
    const cartorio      = price * 0.0075;
    const broker        = price * (inp.brokerPct / 100);
    const bankAppraisal = 1_500;
    const closingCosts  = itbiAmt + cartorio + bankAppraisal; // broker paid by seller
    const totalCashClose= downPayment + closingCosts;

    // closing cost recovery years (C4)
    const closingRecoveryYears = annualNOI > 0 ? closingCosts / annualNOI : 999;
    const closingRecoveryRating: Rating =
      closingRecoveryYears < 1 ? 'green' :
      closingRecoveryYears < 2 ? 'yellow' :
      closingRecoveryYears < 3 ? 'orange' : 'red';

    // ── D: Investment metrics ─────────────────────────────────────────────
    const GRM = annualGross > 0 ? price / annualGross : 0;
    const cityGRM = cityLookup(city, CITY_GRM, 'grm', 17.5);
    const grmRating: Rating =
      GRM < 13 ? 'green'  :
      GRM < 17 ? 'yellow' :
      GRM < 22 ? 'yellow' : 'red';

    // Cap rate vs FII (C3)
    const capRate = price > 0 ? (annualNOI / price) * 100 : 0;
    const capVsAvg = capRate - NATIONAL_GROSS_YIELD;
    const capRating: Rating =
      capRate > IFIX_YIELD              ? 'green'  :
      capRate > NATIONAL_GROSS_YIELD + 2 ? 'green'  :
      capRate > NATIONAL_GROSS_YIELD     ? 'yellow' :
      capRate > NATIONAL_GROSS_YIELD - 1 ? 'yellow' : 'red';

    // Cash on cash (A4)
    const annualCashFlow = annualNOI - ((sfhSAC?.firstInstallment ?? 0) * 12);
    const coc = totalCashClose > 0 ? (annualCashFlow / totalCashClose) * 100 : 0;
    const cocRating: Rating =
      coc > 8 ? 'green'  :
      coc > 5 ? 'yellow' :
      coc > 0 ? 'orange' : 'red';

    // Payback (A5)
    const simplePayback = annualCashFlow > 0 ? totalCashClose / annualCashFlow : 999;
    const paybackRating: Rating =
      simplePayback < 13 ? 'green'  :
      simplePayback < 18 ? 'yellow' :
      simplePayback < 25 ? 'orange' : 'red';

    // Discounted payback approximation (using SELIC)
    const dr = SELIC / 100;
    const discPayback = annualCashFlow > 0 && annualCashFlow > totalCashClose * dr
      ? Math.log(annualCashFlow / (annualCashFlow - totalCashClose * dr)) / Math.log(1 + dr)
      : 999;

    // Price per m² (C1)
    const pricePerM2    = area && area > 0 ? price / area : null;
    const benchM2       = cityLookup(city, CITY_PRICE_M2, 'avg', 8_500);
    const m2Delta       = pricePerM2 ? ((pricePerM2 - benchM2) / benchM2) * 100 : 0;
    const m2Rating: Rating =
      m2Delta < -20 ? 'green'  :
      m2Delta <  -5 ? 'green'  :
      m2Delta <   5 ? 'yellow' :
      m2Delta <  20 ? 'orange' : 'red';

    // ── Risk flags ─────────────────────────────────────────────────────────
    const condoRentRatio  = inp.monthlyRent > 0
      ? (inp.condoMonthly / inp.monthlyRent) * 100 : 0;
    const condoRating: Rating =
      condoRentRatio < 15 ? 'green'  :
      condoRentRatio < 25 ? 'yellow' :
      condoRentRatio < 35 ? 'orange' : 'red';

    const iptuAnnualActual  = inp.iptuAnnual;
    const iptuToRentRatio   = annualGross > 0 ? (iptuAnnualActual / annualGross) * 100 : 0;
    const iptuRating: Rating =
      iptuToRentRatio < 5  ? 'green'  :
      iptuToRentRatio < 10 ? 'yellow' :
      iptuToRentRatio < 15 ? 'orange' : 'red';

    return {
      // income
      annualGross, vacancyLoss, effectiveAnnual, annualMgmt, annualCondo,
      annualIptu, annualInsurance, annualMaint, annualCosts, annualNOI, monthlyNOI,
      grossYield, netYield, costDrainPct, netSharePct,
      vacancySharePct, mgmtSharePct, condoSharePct, iptuSharePct, maintSharePct, insSharePct,
      yieldDelta, yieldRating, cityGross,
      // financing
      downPayment, loanAmount, bank, sfhEffectiveRate,
      sfhSAC, sfhPRICE, sfiSAC, sfiPRICE,
      sfhInterestSaving, sfiInterestSaving,
      isSFHEligible, mcmvBracket, dpScenarios,
      // costs
      itbiRate, itbiAmt, cartorio, broker, bankAppraisal, closingCosts, totalCashClose,
      closingRecoveryYears, closingRecoveryRating,
      // metrics
      GRM, cityGRM, grmRating, capRate, capVsAvg, capRating,
      annualCashFlow, coc, cocRating,
      simplePayback, discPayback, paybackRating,
      pricePerM2, benchM2, m2Delta, m2Rating,
      beo, beoRating,
      // alerts
      condoRentRatio, condoRating, iptuToRentRatio, iptuRating,
    };
  }, [inp, price, city, area, defaultItbi]);

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS: { id: AnalysisTab; label: string }[] = [
    { id: 'renda',        label: 'Renda' },
    { id: 'financiamento', label: 'Financiamento' },
    { id: 'metricas',     label: 'Métricas' },
    { id: 'alertas',      label: 'Alertas' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#1a5c3a]/40 bg-[#f5fff8] px-5 py-4 text-left transition-colors hover:bg-[#ebf7ef]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a5c3a]/10">
            <Calculator size={18} className="text-[#1a5c3a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a5c3a]">{heading ?? 'Calcular Análise Completa'}</p>
            <p className="text-xs text-[#737373]">
              Renda, financiamento, métricas e alertas com dados reais do mercado 2025
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="shrink-0 text-[#1a5c3a]" />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a5c3a]/10">
            <Calculator size={16} className="text-[#1a5c3a]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1c2b20]">{heading ?? 'Análise Financeira Completa'}</p>
            <p className="text-[11px] text-[#737373]">Dados de referência: FipeZap, BCB, ABECIP — 2025/2026</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1c2b20]"
        >
          <ChevronUp size={14} />
          Fechar
        </button>
      </div>

      {/* ── Assumptions panel ──────────────────────────────────────────── */}
      <Card title="Premissas — edite antes de calcular">
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Field
            label="Aluguel Mensal Estimado"
            value={inp.monthlyRent}
            onChange={(v) => set('monthlyRent', v)}
            prefix="R$"
            min={0}
            step={100}
            money
            hint={`Estimativa mercado: ${R(Math.round((price * defaultYield) / 100 / 12))}`}
          />
          <Field
            label="Taxa de Vacância"
            value={Math.round(inp.vacancyRate * 100)}
            onChange={(v) => set('vacancyRate', v / 100)}
            suffix="%"
            min={0}
            max={50}
            hint="Ref. SP: 8–10% (saudável)"
          />
          <Field
            label="Administração"
            value={Math.round(inp.managementRate * 100)}
            onChange={(v) => set('managementRate', v / 100)}
            suffix="%"
            min={0}
            max={20}
            hint="Padrão: 8–12% do aluguel"
          />
          <Field
            label="Reserva Manutenção"
            value={inp.maintenanceRate * 100}
            onChange={(v) => set('maintenanceRate', v / 100)}
            suffix="% / ano"
            step={0.1}
            min={0}
            max={3}
            hint="Ref.: 0.5–1% do valor do imóvel"
          />
          <Field
            label="Condomínio Mensal"
            value={inp.condoMonthly}
            onChange={(v) => set('condoMonthly', v)}
            prefix="R$"
            min={0}
            step={50}
            money
            hint="Ref. SP: R$ 928 / RJ: R$ 948"
          />
          <Field
            label="IPTU Anual"
            value={inp.iptuAnnual}
            onChange={(v) => set('iptuAnnual', v)}
            prefix="R$"
            min={0}
            step={100}
            money
            hint="SP: ~1% do valor venal/ano"
          />
          <Field
            label="Seguro Residencial"
            value={inp.insuranceAnnual}
            onChange={(v) => set('insuranceAnnual', v)}
            prefix="R$"
            suffix="/ano"
            min={0}
            step={50}
            money
            hint="Ref.: R$ 400–800/ano"
          />
          <Field
            label="Entrada"
            value={inp.downPaymentPct}
            onChange={(v) => set('downPaymentPct', Math.min(100, Math.max(0, v)))}
            suffix="%"
            min={0}
            max={100}
            hint="Mín SFH: 20% (SAC) / 30% (PRICE)"
          />
          <Field
            label="Prazo"
            value={inp.termMonths}
            onChange={(v) => set('termMonths', Math.round(v))}
            suffix="meses"
            min={60}
            max={420}
            step={12}
            hint="Padrão: 360 meses (30 anos)"
          />
          <Field
            label="Comissão Corretor"
            value={inp.brokerPct}
            onChange={(v) => set('brokerPct', v)}
            suffix="%"
            min={0}
            max={10}
            step={0.5}
            hint="Padrão: 5–6% (pago pelo vendedor)"
          />
        </div>
        {/* Banco selector */}
        <div className="border-t border-[#e5e5e3] px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-[#737373] uppercase">
            Banco SFH (para simulação de financiamento)
          </p>
          <div className="flex flex-wrap gap-2">
            {SFH_BANKS.map((b, i) => (
              <button
                key={b.id}
                onClick={() => set('bankIdx', i)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  inp.bankIdx === i
                    ? 'border-[#1a5c3a] bg-[#1a5c3a]/10 text-[#1a5c3a]'
                    : 'border-[#e5e5e3] bg-white text-[#737373] hover:bg-[#f5f5f3]'
                }`}
              >
                {b.label}
                <span className="ml-1 font-bold">{N(b.nominal, 2)}%</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Tab nav ────────────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-[#e5e5e3] bg-[#f5f5f3] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              activeTab === t.id
                ? 'bg-white text-[#1a5c3a] shadow-sm'
                : 'text-[#737373] hover:text-[#1c2b20]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {calc && (
        <>
          {activeTab === 'renda'         && <TabRenda  c={calc} inp={inp} price={price} city={city} />}
          {activeTab === 'financiamento' && <TabFinanciamento c={calc} inp={inp} price={price} />}
          {activeTab === 'metricas'      && <TabMetricas c={calc} inp={inp} price={price} area={area} />}
          {activeTab === 'alertas'       && <TabAlertas c={calc} inp={inp} price={price} />}
        </>
      )}

      {/* ── Reference rates ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
        <button
          onClick={() => setShowRef(!showRef)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Info size={13} className="text-[#737373]" />
            <p className="text-[10px] font-bold tracking-widest text-[#737373] uppercase">
              Taxas de referência utilizadas (atualização: 2025 / Abril 2026)
            </p>
          </div>
          {showRef ? <ChevronUp size={14} className="text-[#737373]" /> : <ChevronDown size={14} className="text-[#737373]" />}
        </button>
        {showRef && (
          <div className="border-t border-[#e5e5e3] px-5 py-4">
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">Taxas macroeconômicas</p>
                <ul className="space-y-1 text-[#737373]">
                  <li>SELIC: <strong className="text-[#1c2b20]">14,75% a.a.</strong> (BCB, Abril 2026)</li>
                  <li>TR (anual 2025): <strong className="text-[#1c2b20]">1,97% a.a.</strong></li>
                  <li>TR (mensal): <strong className="text-[#1c2b20]">0,1679%/mês</strong></li>
                  <li>IFIX dividend yield: <strong className="text-[#1c2b20]">11,64% a.a.</strong> (Out 2025)</li>
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">Taxas SFH (nominal + TR)</p>
                <ul className="space-y-1 text-[#737373]">
                  {SFH_BANKS.map((b) => (
                    <li key={b.id}>
                      {b.label}: <strong className="text-[#1c2b20]">{N(b.nominal, 2)}% + TR</strong>{' '}
                      (CET ≈ {N(b.cet, 2)}%)
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">Rendimento bruto médio por cidade</p>
                <ul className="space-y-1 text-[#737373]">
                  {CITY_YIELDS.map((c) => (
                    <li key={c.keys[0]}>
                      {c.keys[0].replace(/^\w/, (l) => l.toUpperCase())}:{' '}
                      <strong className="text-[#1c2b20]">{N(c.gross, 2)}%</strong>
                      {' '}(líquido ref. {N(c.net, 1)}%)
                    </li>
                  ))}
                  <li>Média Brasil: <strong className="text-[#1c2b20]">{N(NATIONAL_GROSS_YIELD, 2)}%</strong></li>
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">MCMV 2025 — Faixas de renda</p>
                <ul className="space-y-1 text-[#737373]">
                  {MCMV_BRACKETS.map((b) => (
                    <li key={b.faixa}>
                      Faixa {b.faixa} (até {R(b.maxIncome)}/mês): taxa {N(b.rateMid, 2)}%, imóvel até {R(b.maxPrice)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">ITBI por município</p>
                <ul className="space-y-1 text-[#737373]">
                  <li>São Paulo (SP): <strong className="text-[#1c2b20]">3,0%</strong></li>
                  <li>Rio de Janeiro (RJ): <strong className="text-[#1c2b20]">2,0%</strong></li>
                  <li>Belo Horizonte (MG): <strong className="text-[#1c2b20]">2,0%</strong></li>
                  <li>Curitiba (PR): <strong className="text-[#1c2b20]">2,7%</strong></li>
                  <li>Fortaleza (CE): <strong className="text-[#1c2b20]">4,0%</strong></li>
                  <li>Brasília (DF): <strong className="text-[#1c2b20]">1,0%</strong> (novo) / 2,0% (usado)</li>
                  <li>Demais cidades: <strong className="text-[#1c2b20]">3,0%</strong> (padrão)</li>
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-bold text-[#1c2b20]">Fontes</p>
                <ul className="space-y-1 text-[#737373]">
                  <li>FipeZap (Out 2025 / Jan 2026)</li>
                  <li>Banco Central do Brasil (BCB)</li>
                  <li>ABECIP / Caixa Econômica Federal</li>
                  <li>JLL Brazil — Office Market Q4 2025</li>
                  <li>Agência Gov — MCMV Faixa 4 (Abril 2025)</li>
                  <li>SECOVI-SP, Portas.com.br</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Renda ───────────────────────────────────────────────────────────────

type CalcResult = NonNullable<ReturnType<typeof computeCalc>>;

// trick to infer type — just use the calc object directly in tab props
function TabRenda({
  c,
  inp,
  price,
  city,
}: {
  c: Record<string, unknown>;
  inp: Inputs;
  price: number;
  city: string | null;
}) {
  const cc = c as {
    annualGross: number; vacancyLoss: number; effectiveAnnual: number;
    annualMgmt: number; annualCondo: number; annualIptu: number;
    annualInsurance: number; annualMaint: number; annualCosts: number;
    annualNOI: number; monthlyNOI: number; grossYield: number; netYield: number;
    costDrainPct: number; netSharePct: number;
    vacancySharePct: number; mgmtSharePct: number; condoSharePct: number;
    iptuSharePct: number; maintSharePct: number; insSharePct: number;
    yieldDelta: number; yieldRating: Rating; cityGross: number;
    beo: number; beoRating: Rating;
  };

  const segments = [
    { label: 'Vacância',          pct: cc.vacancySharePct,  color: 'bg-red-200'     },
    { label: 'Condomínio',        pct: cc.condoSharePct,    color: 'bg-orange-200'  },
    { label: 'IPTU',              pct: cc.iptuSharePct,     color: 'bg-yellow-200'  },
    { label: 'Administração',     pct: cc.mgmtSharePct,     color: 'bg-amber-200'   },
    { label: 'Manutenção',        pct: cc.maintSharePct,    color: 'bg-orange-100'  },
    { label: 'Seguro',            pct: cc.insSharePct,      color: 'bg-yellow-100'  },
    { label: 'Renda Líquida',     pct: cc.netSharePct,      color: 'bg-green-200'   },
  ].filter((s) => s.pct > 0);

  return (
    <div className="space-y-4">
      {/* Income waterfall */}
      <Card title="Demonstrativo de Renda Mensal">
        <div className="divide-y divide-[#f5f5f3]">
          <MetricRow label="Aluguel Bruto (estimado)" value={R(inp.monthlyRent)} />
          <MetricRow label="(−) Perda por Vacância" value={`− ${R(cc.vacancyLoss / 12)}`} indent sub="% aplicada ao aluguel bruto" />
          <MetricRow label="= Aluguel Efetivo"       value={R(cc.effectiveAnnual / 12)} />
          <MetricRow label="(−) Taxa de Administração" value={`− ${R(cc.annualMgmt / 12)}`} indent sub={`${Pct(inp.managementRate * 100)} do aluguel efetivo`} />
          <MetricRow label="(−) Condomínio"          value={`− ${R(inp.condoMonthly)}`} indent />
          <MetricRow label="(−) IPTU (÷ 12)"         value={`− ${R(cc.annualIptu / 12)}`} indent />
          <MetricRow label="(−) Seguro Residencial"   value={`− ${R(inp.insuranceAnnual / 12)}`} indent />
          <MetricRow label="(−) Reserva Manutenção"  value={`− ${R(cc.annualMaint / 12)}`} indent sub={`${Pct(inp.maintenanceRate * 100)} a.a. do valor do imóvel`} />
        </div>
        <TotalRow label="= NOI Mensal (Renda Líquida)" value={R(cc.monthlyNOI)} positive={cc.monthlyNOI >= 0} />
      </Card>

      {/* Yield comparison */}
      <Card title="Rendimento vs Mercado">
        <div className="divide-y divide-[#f5f5f3]">
          <MetricRow
            label="Rendimento Bruto"
            value={Pct(cc.grossYield)}
            sub={`Média ${city ?? 'Brasil'}: ${N(cc.cityGross, 2)}%`}
            rating={cc.yieldRating}
          />
          <MetricRow
            label="Rendimento Líquido (NOI)"
            value={Pct(cc.netYield)}
            sub="Após todos os custos operacionais"
            rating={cc.netYield > 4 ? 'green' : cc.netYield > 2.5 ? 'yellow' : 'red'}
          />
          <MetricRow
            label="Diferença vs média da cidade"
            value={`${cc.yieldDelta >= 0 ? '+' : ''}${N(cc.yieldDelta, 2)} p.p.`}
          />
          <MetricRow
            label="Benchmark IFIX (FIIs)"
            value={Pct(IFIX_YIELD)}
            sub="Referência de rentabilidade líquida imobiliária"
          />
          <MetricRow
            label="SELIC (renda fixa)"
            value={Pct(SELIC)}
            sub="Retorno livre de risco para comparação"
          />
        </div>
      </Card>

      {/* Cost waterfall bar */}
      <Card title="Composição dos Custos (% do Aluguel Bruto)">
        <div className="px-5 py-4 space-y-2">
          <div className="flex h-7 w-full overflow-hidden rounded-full">
            {segments.map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${N(s.pct, 1)}%`}
                className={`${s.color} transition-all`}
                style={{ width: `${Math.max(s.pct, 0)}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
                <span className="text-[11px] text-[#737373]">{s.label} <strong className="text-[#1c2b20]">{N(s.pct, 1)}%</strong></span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#737373]">
            A cada <strong className="text-[#1c2b20]">R$ 100</strong> de aluguel bruto, você retém{' '}
            <strong className="text-green-700">R$ {N(cc.netSharePct, 0)}</strong> após todos os custos.
          </p>
        </div>

        {/* Break-even occupancy */}
        <div className="border-t border-[#e5e5e3] px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1c2b20]">Ocupação Mínima (Break-even)</p>
              <p className="mt-0.5 text-xs text-[#737373]">
                Abaixo deste nível de ocupação, o imóvel gera fluxo de caixa negativo.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums text-[#1c2b20]">{N(cc.beo, 1)}%</p>
              <Badge rating={cc.beoRating} label={
                cc.beoRating === 'green'  ? 'Muito resiliente' :
                cc.beoRating === 'yellow' ? 'Resiliente'        :
                cc.beoRating === 'orange' ? 'Risco moderado'    : 'Alto risco'
              } />
            </div>
          </div>
          {/* Simple gauge bar */}
          <div className="mt-3">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#f0f0ee]">
              <div
                className={`rounded-full transition-all ${
                  cc.beoRating === 'green'  ? 'bg-green-400'  :
                  cc.beoRating === 'yellow' ? 'bg-yellow-400' :
                  cc.beoRating === 'orange' ? 'bg-orange-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(cc.beo, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#a3a3a1]">
              <span>0%</span>
              <span>Ocupação necessária: {N(cc.beo, 1)}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Financiamento ───────────────────────────────────────────────────────

function TabFinanciamento({
  c,
  inp,
  price,
}: {
  c: Record<string, unknown>;
  inp: Inputs;
  price: number;
}) {
  const cc = c as {
    downPayment: number; loanAmount: number; bank: (typeof SFH_BANKS)[number];
    sfhEffectiveRate: number;
    sfhSAC: ReturnType<typeof sacCalc> | null;
    sfhPRICE: ReturnType<typeof priceCalc> | null;
    sfiSAC: ReturnType<typeof sacCalc> | null;
    sfiPRICE: ReturnType<typeof priceCalc> | null;
    sfhInterestSaving: number; sfiInterestSaving: number;
    isSFHEligible: boolean; mcmvBracket: (typeof MCMV_BRACKETS)[number] | null;
    dpScenarios: {
      dpPct: number; dp: number; loan: number;
      firstInstallment: number; cf: number; coc: number;
    }[];
  };

  const [tab, setTab] = useState<'sfh' | 'sfi' | 'mcmv'>('sfh');

  return (
    <div className="space-y-4">
      {/* Program switcher */}
      <div className="flex gap-2">
        {(['sfh', 'sfi'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t
                ? 'border-[#1a5c3a] bg-[#1a5c3a]/10 text-[#1a5c3a]'
                : 'border-[#e5e5e3] bg-white text-[#737373] hover:bg-[#f5f5f3]'
            }`}
          >
            {t.toUpperCase()}
            {t === 'sfh' && !cc.isSFHEligible && (
              <span className="ml-1 text-red-400">✕</span>
            )}
          </button>
        ))}
        {cc.mcmvBracket && (
          <button
            onClick={() => setTab('mcmv')}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              tab === 'mcmv'
                ? 'border-[#1a5c3a] bg-[#1a5c3a]/10 text-[#1a5c3a]'
                : 'border-[#e5e5e3] bg-white text-[#737373] hover:bg-[#f5f5f3]'
            }`}
          >
            MCMV <span className="text-[#1a5c3a]">Faixa {cc.mcmvBracket.faixa}</span>
          </button>
        )}
      </div>

      {/* SFH panel */}
      {tab === 'sfh' && (
        <div className="space-y-4">
          {!cc.isSFHEligible && (
            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                Valor do imóvel <strong>{R(price)}</strong> excede o teto SFH de{' '}
                <strong>{R(SFH_MAX_VALUE)}</strong>. Somente SFI disponível.
              </p>
            </div>
          )}
          <Card title={`SFH — ${cc.bank.label} (${N(cc.bank.nominal, 2)}% a.a. + TR)`}>
            {cc.sfhSAC && cc.sfhPRICE && (
              <>
                <div className="divide-y divide-[#f5f5f3]">
                  <MetricRow label="Valor do Imóvel"                    value={R(price)} />
                  <MetricRow label="Entrada"                            value={`${R(cc.downPayment)} (${Pct(inp.downPaymentPct)})`} />
                  <MetricRow label="Valor Financiado"                   value={R(cc.loanAmount)} />
                  <MetricRow label="Taxa Nominal"                       value={`${N(cc.bank.nominal, 2)}% a.a. + TR`} />
                  <MetricRow label="Taxa Efetiva Estimada (+ TR 2025)"  value={`≈ ${N(cc.sfhEffectiveRate, 2)}% a.a.`} />
                  <MetricRow label="CET (Custo Efetivo Total)"          value={`≈ ${N(cc.bank.cet, 2)}% a.a.`} />
                  <MetricRow label="Prazo"                              value={`${inp.termMonths} meses (${inp.termMonths / 12} anos)`} />
                  <MetricRow label="FGTS Elegível"                      value={cc.isSFHEligible ? 'Sim — imóvel dentro do teto SFH' : 'Não'} />
                </div>

                {/* SAC vs PRICE comparison */}
                <div className="border-t border-[#e5e5e3] p-5">
                  <p className="mb-3 text-[10px] font-bold tracking-widest text-[#1a5c3a] uppercase">
                    SAC vs PRICE — Comparativo
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                          <th className="pb-2 pr-4">Parâmetro</th>
                          <th className="pb-2 pr-4 text-right">SAC</th>
                          <th className="pb-2 text-right">PRICE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f5f5f3]">
                        {[
                          { label: '1ª Parcela',         sac: R(cc.sfhSAC.firstInstallment),  price: R(cc.sfhPRICE.installment) },
                          { label: 'Última Parcela',     sac: R(cc.sfhSAC.lastInstallment),   price: R(cc.sfhPRICE.installment) + ' (fixa)' },
                          { label: 'Total de Juros',     sac: R(cc.sfhSAC.totalInterest),     price: R(cc.sfhPRICE.totalInterest), highlight: true },
                          { label: 'Total Pago',         sac: R(cc.sfhSAC.totalPaid),         price: R(cc.sfhPRICE.totalPaid) },
                        ].map((row) => (
                          <tr key={row.label} className={row.highlight ? 'font-semibold' : ''}>
                            <td className="py-2 pr-4 text-[#737373]">{row.label}</td>
                            <td className="py-2 pr-4 text-right tabular-nums text-green-700">
                              {row.sac}
                            </td>
                            <td className="py-2 text-right tabular-nums text-[#1c2b20]">
                              {row.price}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-700">
                    <strong>SAC economiza {R(cc.sfhInterestSaving)}</strong> em juros ao longo do contrato vs PRICE. Para imóveis de investimento, SAC é quase sempre a melhor escolha.
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* SFI panel */}
      {tab === 'sfi' && (
        <Card title={`SFI — Taxa Fixa de Mercado (${N(SFI_RATE, 1)}% a.a. estimado)`}>
          {cc.sfiSAC && cc.sfiPRICE ? (
            <>
              <div className="px-5 py-3 text-xs text-[#737373] bg-[#fff9f0] border-b border-[#e5e5e3]">
                SFI: sem teto de valor, sem FGTS. Taxa varia por banco, perfil e LTV. Referência: ~13–14% a.a. fixo ou IPCA + spread no mercado 2025.
              </div>
              <div className="divide-y divide-[#f5f5f3]">
                <MetricRow label="Valor Financiado" value={R(cc.loanAmount)} />
                <MetricRow label="Taxa de Referência" value={`${N(SFI_RATE, 1)}% a.a. fixo`} />
                <MetricRow label="FGTS" value="Não elegível (SFI)" />
              </div>
              <div className="border-t border-[#e5e5e3] p-5">
                <p className="mb-3 text-[10px] font-bold tracking-widest text-[#1a5c3a] uppercase">SAC vs PRICE (SFI)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                        <th className="pb-2 pr-4">Parâmetro</th>
                        <th className="pb-2 pr-4 text-right">SAC</th>
                        <th className="pb-2 text-right">PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f3]">
                      {[
                        { label: '1ª Parcela',      sac: R(cc.sfiSAC.firstInstallment),  price: R(cc.sfiPRICE.installment) },
                        { label: 'Última Parcela',  sac: R(cc.sfiSAC.lastInstallment),   price: R(cc.sfiPRICE.installment) + ' (fixa)' },
                        { label: 'Total de Juros',  sac: R(cc.sfiSAC.totalInterest),     price: R(cc.sfiPRICE.totalInterest), highlight: true },
                        { label: 'Total Pago',      sac: R(cc.sfiSAC.totalPaid),         price: R(cc.sfiPRICE.totalPaid) },
                      ].map((row) => (
                        <tr key={row.label} className={row.highlight ? 'font-semibold' : ''}>
                          <td className="py-2 pr-4 text-[#737373]">{row.label}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-green-700">{row.sac}</td>
                          <td className="py-2 text-right tabular-nums text-[#1c2b20]">{row.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
                  <strong>Atenção:</strong> Com SELIC a {N(SELIC, 2)}%, a taxa SFI ({N(SFI_RATE, 1)}% a.a.) representa custo de capital elevado. Avalie se o retorno do imóvel justifica a alavancagem.
                </div>
              </div>
            </>
          ) : (
            <p className="px-5 py-4 text-sm text-[#737373]">Defina valor do imóvel e entrada para simular.</p>
          )}
        </Card>
      )}

      {/* MCMV panel */}
      {tab === 'mcmv' && cc.mcmvBracket && (
        <Card title={`Minha Casa Minha Vida — Faixa ${cc.mcmvBracket.faixa}`}>
          <div className="divide-y divide-[#f5f5f3]">
            <MetricRow label="Renda Familiar Máxima"    value={`R$ ${N(cc.mcmvBracket.maxIncome, 0)}/mês`} />
            <MetricRow label="Valor Máximo do Imóvel"   value={R(cc.mcmvBracket.maxPrice)} />
            <MetricRow label="Taxa de Juros"            value={`${N(cc.mcmvBracket.rateMid, 2)}% a.a.`} />
            <MetricRow label="Subsídio"                 value={cc.mcmvBracket.subsidyLabel} />
            <MetricRow label="FGTS Elegível"            value="Sim (mín. 3 anos de contribuição)" />
          </div>
          {(() => {
            const mcmvSAC = cc.loanAmount > 0
              ? sacCalc(cc.loanAmount, cc.mcmvBracket.rateMid, inp.termMonths)
              : null;
            const mcmvPRICE = cc.loanAmount > 0
              ? priceCalc(cc.loanAmount, cc.mcmvBracket.rateMid, inp.termMonths)
              : null;
            if (!mcmvSAC || !mcmvPRICE) return null;
            const saving = mcmvPRICE.totalInterest - mcmvSAC.totalInterest;
            return (
              <div className="border-t border-[#e5e5e3] p-5">
                <p className="mb-3 text-[10px] font-bold tracking-widest text-[#1a5c3a] uppercase">SAC vs PRICE (MCMV)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                        <th className="pb-2 pr-4">Parâmetro</th>
                        <th className="pb-2 pr-4 text-right">SAC</th>
                        <th className="pb-2 text-right">PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f3]">
                      {[
                        { label: '1ª Parcela',      sac: R(mcmvSAC.firstInstallment),  price: R(mcmvPRICE.installment)     },
                        { label: 'Última Parcela',  sac: R(mcmvSAC.lastInstallment),   price: R(mcmvPRICE.installment) + ' (fixa)' },
                        { label: 'Total de Juros',  sac: R(mcmvSAC.totalInterest),     price: R(mcmvPRICE.totalInterest), highlight: true },
                      ].map((row) => (
                        <tr key={row.label} className={(row as {highlight?: boolean}).highlight ? 'font-semibold' : ''}>
                          <td className="py-2 pr-4 text-[#737373]">{row.label}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-green-700">{row.sac}</td>
                          <td className="py-2 text-right tabular-nums text-[#1c2b20]">{row.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-700">
                  SAC economiza <strong>{R(saving)}</strong> em juros. Taxas MCMV são subsidiadas — custo de capital muito inferior ao mercado.
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Down payment sensitivity */}
      <Card title="Sensibilidade da Entrada (SAC · SFH)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#737373] bg-[#f5f5f3]">
                <th className="px-5 py-3">Entrada</th>
                <th className="px-3 py-3 text-right">Valor Entrada</th>
                <th className="px-3 py-3 text-right">1ª Parcela</th>
                <th className="px-3 py-3 text-right">Fluxo de Caixa</th>
                <th className="px-3 py-3 text-right">Cash-on-Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f3]">
              {cc.dpScenarios.map((s) => {
                const cfPositive = s.cf >= 0;
                const isSelected = Math.round(inp.downPaymentPct) === s.dpPct;
                return (
                  <tr key={s.dpPct} className={isSelected ? 'bg-[#ebf3ee]' : ''}>
                    <td className="px-5 py-3 font-semibold text-[#1c2b20]">
                      {s.dpPct}%
                      {isSelected && <span className="ml-2 text-[10px] font-bold text-[#1a5c3a]">← selecionado</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#737373]">{R(s.dp)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#1c2b20]">{R(s.firstInstallment)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums font-semibold ${cfPositive ? 'text-green-700' : 'text-red-600'}`}>
                      {cfPositive ? '+' : ''}{R(s.cf)}/mês
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums font-semibold ${s.coc > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {N(s.coc, 1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#e5e5e3] px-5 py-3">
          <p className="text-xs text-[#737373]">
            Fluxo de caixa = NOI mensal − 1ª parcela SAC. Cash-on-cash = fluxo anual ÷ capital total investido (entrada + ITBI + cartório + avaliação).
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Métricas ────────────────────────────────────────────────────────────

function TabMetricas({
  c,
  inp,
  price,
  area,
}: {
  c: Record<string, unknown>;
  inp: Inputs;
  price: number;
  area: number | null;
}) {
  const cc = c as {
    GRM: number; cityGRM: number; grmRating: Rating;
    capRate: number; capRating: Rating;
    coc: number; cocRating: Rating;
    annualNOI: number; annualCashFlow: number;
    simplePayback: number; discPayback: number; paybackRating: Rating;
    pricePerM2: number | null; benchM2: number; m2Delta: number; m2Rating: Rating;
    downPayment: number; loanAmount: number;
    closingCosts: number; totalCashClose: number;
    closingRecoveryYears: number; closingRecoveryRating: Rating;
    itbiAmt: number; itbiRate: number; cartorio: number; broker: number; bankAppraisal: number;
    sfhSAC: ReturnType<typeof sacCalc> | null;
    grossYield: number; netYield: number;
  };

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Rendimento Bruto',
            value: Pct(cc.grossYield),
            sub: `Média cidade: ${N(cityLookup(null, CITY_YIELDS, 'gross', NATIONAL_GROSS_YIELD), 2)}%`,
            rating: cc.grossYield > 6 ? 'green' : cc.grossYield > 4.5 ? 'yellow' : 'red',
          },
          {
            label: 'Rendimento Líquido',
            value: Pct(cc.netYield),
            sub: 'Após custos operacionais',
            rating: cc.netYield > 4.5 ? 'green' : cc.netYield > 3 ? 'yellow' : 'red',
          },
          {
            label: 'Cap Rate',
            value: Pct(cc.capRate),
            sub: `IFIX: ${N(IFIX_YIELD, 2)}% | SELIC: ${N(SELIC, 2)}%`,
            rating: cc.capRating,
          },
          {
            label: 'Cash-on-Cash',
            value: Pct(cc.coc),
            sub: 'Retorno sobre capital investido',
            rating: cc.cocRating,
          },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-[#e5e5e3] bg-white p-4">
            <p className="text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">{k.label}</p>
            <p className={`mt-1.5 text-xl font-bold tabular-nums ${
              k.rating === 'green'  ? 'text-green-700'  :
              k.rating === 'yellow' ? 'text-yellow-600'  :
              'text-red-600'
            }`}>{k.value}</p>
            <p className="mt-0.5 text-[11px] text-[#a3a3a1]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Detailed metrics table */}
      <Card title="Indicadores Completos">
        <div className="divide-y divide-[#f5f5f3]">
          <MetricRow
            label="GRM (Gross Rent Multiplier)"
            value={`${N(cc.GRM, 1)}x`}
            sub={`Referência ${inp ? '' : ''}cidade: ${N(cc.cityGRM, 1)}x. Em ${N(cc.GRM, 0)} anos de aluguel bruto, paga o imóvel.`}
            rating={cc.grmRating}
          />
          <MetricRow
            label="Cap Rate vs Média Nacional"
            value={Pct(cc.capRate)}
            sub={`Média residencial Brasil: ${N(NATIONAL_GROSS_YIELD, 2)}% | IFIX (FIIs): ${N(IFIX_YIELD, 2)}%`}
            rating={cc.capRating}
          />
          <MetricRow
            label="Payback Simples"
            value={cc.simplePayback < 100 ? `${N(cc.simplePayback, 1)} anos` : 'N/A'}
            sub="Anos para recuperar o capital investido via fluxo de caixa"
            rating={cc.paybackRating}
          />
          <MetricRow
            label="Payback Descontado (SELIC)"
            value={cc.discPayback < 100 ? `${N(cc.discPayback, 1)} anos` : 'Sem retorno real (SELIC > CoC)'}
            sub={`Usando SELIC ${N(SELIC, 2)}% como taxa de desconto`}
            rating={cc.discPayback > 30 ? 'red' : cc.discPayback > 20 ? 'orange' : 'yellow'}
          />
          <MetricRow
            label="Recuperação dos Custos de Transação"
            value={cc.closingRecoveryYears < 100 ? `${N(cc.closingRecoveryYears, 1)} anos` : 'N/A'}
            sub="Tempo para recuperar ITBI + cartório + avaliação via NOI"
            rating={cc.closingRecoveryRating}
          />
          {cc.pricePerM2 && (
            <MetricRow
              label="Preço por m²"
              value={`${R(cc.pricePerM2)}/m²`}
              sub={`Referência cidade: ${R(cc.benchM2)}/m² — ${cc.m2Delta >= 0 ? '+' : ''}${N(cc.m2Delta, 1)}% vs mercado`}
              rating={cc.m2Rating}
            />
          )}
        </div>
      </Card>

      {/* Closing cost breakdown */}
      <Card title="Custos de Fechamento">
        <div className="divide-y divide-[#f5f5f3]">
          <MetricRow label="Preço do Imóvel" value={R(price)} />
          <MetricRow
            label={`ITBI (${Pct(cc.itbiRate * 100, 1)})`}
            value={`+ ${R(cc.itbiAmt)}`}
          />
          <MetricRow label="Cartório + Registro (≈ 0,75%)" value={`+ ${R(cc.cartorio)}`} />
          <MetricRow label="Avaliação Bancária" value={`+ ${R(cc.bankAppraisal)}`} />
        </div>
        <TotalRow label="Total de Custos de Aquisição (comprador)" value={R(cc.closingCosts)} />
        <div className="divide-y divide-[#f5f5f3]">
          <MetricRow label="Entrada" value={R(cc.downPayment)} />
          <MetricRow
            label="Comissão Corretor"
            value={R(cc.broker)}
            sub="Paga pelo vendedor — não entra no capital do comprador"
          />
        </div>
        <TotalRow label="Capital Total Necessário (comprador)" value={R(cc.totalCashClose)} positive />
        <div className="border-t border-[#e5e5e3] px-5 py-3">
          <p className="text-xs text-[#737373]">
            O capital total é entrada + ITBI + cartório + avaliação. A comissão do corretor é
            convencionalmenteborne pelo vendedor no Brasil.
          </p>
        </div>
      </Card>

      {/* FII comparison */}
      <Card title="Comparativo de Rentabilidade">
        <div className="p-5 space-y-3">
          {[
            { label: 'Este imóvel (Cap Rate)', pct: cc.capRate,         color: 'bg-[#1a5c3a]',     text: 'text-white' },
            { label: 'FIIs — IFIX (Out 2025)', pct: IFIX_YIELD,         color: 'bg-[#4a7c59]',     text: 'text-white' },
            { label: 'Média residencial Brasil', pct: NATIONAL_GROSS_YIELD, color: 'bg-[#a8c5b2]', text: 'text-white' },
            { label: 'SELIC (renda fixa)',       pct: SELIC,             color: 'bg-[#e5e5e3]',     text: 'text-[#737373]' },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[#737373]">{row.label}</span>
                <span className="font-bold text-[#1c2b20]">{N(row.pct, 2)}% a.a.</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-[#f0f0ee]">
                <div
                  className={`h-full ${row.color} flex items-center justify-end pr-2`}
                  style={{ width: `${Math.min((row.pct / SELIC) * 100, 100)}%` }}
                >
                  <span className={`text-[10px] font-bold ${row.text}`}>{N(row.pct, 1)}%</span>
                </div>
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-[#737373]">
            Com SELIC a {N(SELIC, 2)}%, um imóvel de investimento deveria oferecer prêmio de liquidez sobre FIIs para justificar o risco e a iliquidez.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

function TabAlertas({
  c,
  inp,
  price,
}: {
  c: Record<string, unknown>;
  inp: Inputs;
  price: number;
}) {
  const cc = c as {
    condoRentRatio: number; condoRating: Rating;
    iptuToRentRatio: number; iptuRating: Rating;
    annualNOI: number; grossYield: number; netYield: number;
    capRate: number; coc: number; beo: number; beoRating: Rating;
    sfhSAC: ReturnType<typeof sacCalc> | null;
    monthlyNOI: number;
  };

  // Overall deal quality score (0–100)
  type Flag = { label: string; ok: boolean; msg: string; rating: Rating };
  const flags: Flag[] = [
    {
      label: 'Rendimento bruto',
      ok: cc.grossYield >= 5.71,
      msg: cc.grossYield >= 5.71
        ? `${Pct(cc.grossYield)} — acima ou igual à média nacional de ${Pct(NATIONAL_GROSS_YIELD)}`
        : `${Pct(cc.grossYield)} — abaixo da média nacional (${Pct(NATIONAL_GROSS_YIELD)}). Rentabilidade apertada no mercado atual.`,
      rating: cc.grossYield >= 6 ? 'green' : cc.grossYield >= 4.5 ? 'yellow' : 'red',
    },
    {
      label: 'Rendimento líquido vs SELIC',
      ok: cc.netYield >= SELIC * 0.4,
      msg: cc.netYield >= SELIC * 0.4
        ? `${Pct(cc.netYield)} — razoável frente a SELIC ${Pct(SELIC)}`
        : `${Pct(cc.netYield)} — muito abaixo da SELIC (${Pct(SELIC)}). Renda fixa paga mais sem risco. Necessário contar com valorização.`,
      rating: cc.netYield >= SELIC * 0.4 ? 'yellow' : 'red',
    },
    {
      label: 'Taxa de condomínio',
      ok: cc.condoRentRatio < 30,
      msg: cc.condoRentRatio < 15
        ? `${Pct(cc.condoRentRatio)} do aluguel — saudável`
        : cc.condoRentRatio < 30
        ? `${Pct(cc.condoRentRatio)} do aluguel — moderado (atenção com reajustes)`
        : `${Pct(cc.condoRentRatio)} do aluguel — ELEVADO. Condomínios em SP/RJ cresceram >20% em 2024–25. Risco de erosão da renda.`,
      rating: cc.condoRating,
    },
    {
      label: 'IPTU',
      ok: cc.iptuToRentRatio < 10,
      msg: cc.iptuToRentRatio < 5
        ? `${Pct(cc.iptuToRentRatio, 1)} da renda bruta — normal`
        : cc.iptuToRentRatio < 10
        ? `${Pct(cc.iptuToRentRatio, 1)} da renda bruta — moderado`
        : `${Pct(cc.iptuToRentRatio, 1)} da renda bruta — ALTO. Verifique o valor venal junto à prefeitura.`,
      rating: cc.iptuRating,
    },
    {
      label: 'Ocupação mínima (break-even)',
      ok: cc.beo < 80,
      msg: cc.beo < 60
        ? `${Pct(cc.beo)} — imóvel muito resiliente a vacância`
        : cc.beo < 80
        ? `${Pct(cc.beo)} — aceitável, mas avalie posição no bairro`
        : `${Pct(cc.beo)} — RISCO ALTO. Pequenas variações de vacância impactam fortemente o resultado.`,
      rating: cc.beoRating,
    },
    {
      label: 'Fluxo de caixa (com financiamento)',
      ok: cc.monthlyNOI > (cc.sfhSAC?.firstInstallment ?? 0),
      msg:
        cc.sfhSAC
          ? cc.monthlyNOI > cc.sfhSAC.firstInstallment
            ? `NOI (${R(cc.monthlyNOI)}) > parcela SFH (${R(cc.sfhSAC.firstInstallment)}) — fluxo positivo`
            : `NOI (${R(cc.monthlyNOI)}) < parcela SFH (${R(cc.sfhSAC.firstInstallment)}) — fluxo NEGATIVO de ${R(cc.sfhSAC.firstInstallment - cc.monthlyNOI)}/mês. O imóvel custa dinheiro todo mês.`
          : 'Compra à vista — sem parcela de financiamento',
      rating:
        !cc.sfhSAC ? 'green' :
        cc.monthlyNOI > cc.sfhSAC.firstInstallment ? 'green' :
        cc.monthlyNOI > cc.sfhSAC.firstInstallment * 0.9 ? 'yellow' : 'red',
    },
    {
      label: 'Valorização necessária',
      ok: cc.netYield >= SELIC * 0.5,
      msg: cc.netYield >= SELIC * 0.5
        ? 'Renda é suficientemente competitiva — valorização é upside'
        : `Com yield líquido de ${Pct(cc.netYield)}, é necessário valorização anual ≥ ${Pct(SELIC - cc.netYield)} para superar renda fixa.`,
      rating: cc.netYield >= SELIC * 0.5 ? 'green' : cc.netYield >= SELIC * 0.3 ? 'yellow' : 'red',
    },
  ];

  const goodCount = flags.filter((f) => f.rating === 'green').length;
  const score = Math.round((goodCount / flags.length) * 100);
  const overallRating: Rating =
    score >= 70 ? 'green' :
    score >= 50 ? 'yellow' :
    score >= 35 ? 'orange' : 'red';

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className={`rounded-xl border p-5 ${
        overallRating === 'green'  ? 'border-green-200 bg-green-50' :
        overallRating === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
        overallRating === 'orange' ? 'border-orange-200 bg-orange-50' :
        'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#737373]">Pontuação Geral do Negócio</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${
              overallRating === 'green'  ? 'text-green-700' :
              overallRating === 'yellow' ? 'text-yellow-700' :
              overallRating === 'orange' ? 'text-orange-700' : 'text-red-700'
            }`}>{score}/100</p>
            <p className="mt-0.5 text-xs text-[#737373]">
              {goodCount} de {flags.length} indicadores positivos
            </p>
          </div>
          <div className="text-right">
            <Badge rating={overallRating} label={
              overallRating === 'green'  ? 'Negócio sólido'   :
              overallRating === 'yellow' ? 'Passável'         :
              overallRating === 'orange' ? 'Com ressalvas'    : 'Alto risco'
            } />
            <p className="mt-2 max-w-[180px] text-xs text-[#737373]">
              {score >= 70
                ? 'Os fundamentos estão alinhados com boas práticas de investimento.'
                : score >= 50
                ? 'Alguns pontos merecem atenção antes da decisão final.'
                : 'Múltiplos indicadores desfavoráveis. Reavalie premissas ou o imóvel.'}
            </p>
          </div>
        </div>
      </div>

      {/* Flags list */}
      <Card title="Análise de Riscos e Alertas">
        <div className="divide-y divide-[#f5f5f3]">
          {flags.map((f) => (
            <div key={f.label} className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 shrink-0">
                {f.rating === 'green'  && <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 text-xs font-bold">✓</span></div>}
                {f.rating === 'yellow' && <div className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center"><span className="text-yellow-600 text-xs font-bold">!</span></div>}
                {f.rating === 'orange' && <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center"><AlertTriangle size={11} className="text-orange-500" /></div>}
                {f.rating === 'red'    && <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center"><span className="text-red-600 text-xs font-bold">✕</span></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1c2b20]">{f.label}</p>
                  <Badge rating={f.rating} label={
                    f.rating === 'green'  ? 'OK'      :
                    f.rating === 'yellow' ? 'Atenção' :
                    f.rating === 'orange' ? 'Alerta'  : 'Problema'
                  } />
                </div>
                <p className="mt-0.5 text-xs text-[#737373]">{f.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Benchmark table */}
      <Card title="Benchmarks do Mercado Brasileiro (2025)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5f5f3] text-left text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                <th className="px-5 py-3">Métrica</th>
                <th className="px-3 py-3 text-center">Ruim</th>
                <th className="px-3 py-3 text-center">Regular</th>
                <th className="px-3 py-3 text-center">Bom</th>
                <th className="px-3 py-3 text-center">Ótimo</th>
                <th className="px-3 py-3 text-right">Este imóvel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f3]">
              {[
                {
                  label: 'Yield Bruto',
                  ranges: ['< 4,5%', '4,5–6%', '6–8%', '> 8%'],
                  value: Pct(cc.grossYield),
                  rating: cc.grossYield > 8 ? 3 : cc.grossYield > 6 ? 2 : cc.grossYield > 4.5 ? 1 : 0,
                },
                {
                  label: 'Yield Líquido',
                  ranges: ['< 3%', '3–4,5%', '4,5–6%', '> 6%'],
                  value: Pct(cc.netYield),
                  rating: cc.netYield > 6 ? 3 : cc.netYield > 4.5 ? 2 : cc.netYield > 3 ? 1 : 0,
                },
                {
                  label: 'GRM',
                  ranges: ['> 22x', '17–22x', '13–17x', '< 13x'],
                  value: `${N(cc.coc, 1)}x`, // using cc GRM
                  rating: cc.coc > 12 ? 3 : cc.coc > 8 ? 2 : cc.coc > 5 ? 1 : 0,
                },
                {
                  label: 'Cash-on-Cash',
                  ranges: ['< 5%', '5–8%', '8–12%', '> 12%'],
                  value: Pct(cc.coc),
                  rating: cc.coc > 12 ? 3 : cc.coc > 8 ? 2 : cc.coc > 5 ? 1 : 0,
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-3 font-semibold text-[#1c2b20]">{row.label}</td>
                  {row.ranges.map((r, i) => (
                    <td key={i} className={`px-3 py-3 text-center text-xs ${
                      row.rating === i
                        ? i === 3 ? 'font-bold text-green-700' :
                          i === 2 ? 'font-bold text-green-600' :
                          i === 1 ? 'font-bold text-yellow-700' : 'font-bold text-red-600'
                        : 'text-[#a3a3a1]'
                    }`}>{r}{row.rating === i ? ' ◀' : ''}</td>
                  ))}
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[#1c2b20]">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#e5e5e3] px-5 py-3 text-xs text-[#737373]">
          Benchmarks baseados em dados FipeZap, ABECIP e SECOVI — mercado residencial brasileiro 2025.
        </div>
      </Card>
    </div>
  );
}

// Dummy function for type inference — never called
function computeCalc(..._args: unknown[]) { return null; }
