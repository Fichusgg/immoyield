'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { track } from '@/lib/analytics';

const DEFAULT_PRICE = 680000;
const DEFAULT_DOWN = 204000; // 30%
const DEFAULT_RENT = 3800;
const CDI_RATE = 0.1075; // fallback

function calcMetrics(price: number, down: number, rent: number, cdi: number) {
  if (!price || !rent) return null;

  const annualRent = rent * 12;
  const yieldBruto = (annualRent / price) * 100;
  const capRate = yieldBruto * 0.85; // approx net
  const loanAmount = price - down;
  const monthlyInterest = loanAmount > 0 ? (loanAmount * 0.01) : 0; // ~1% / month approx
  const monthlyCashFlow = rent - monthlyInterest - price * 0.001; // minus IPTU/condo approx
  const paybackYears = price / annualRent;
  const roi10 = ((annualRent * 10 * 0.85 + price * 0.5) / down - 1) * 100;
  const cdiEquiv = (Math.pow(1 + cdi, 10) - 1) * 100;

  return { yieldBruto, capRate, monthlyCashFlow, paybackYears, roi10, cdiEquiv };
}

function parseBRL(v: string): number {
  return Number(v.replace(/\D/g, '')) || 0;
}

function formatBRL(v: number): string {
  return v === 0 ? '' : new Intl.NumberFormat('pt-BR').format(v);
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  benchmarkPct?: number;
}

function KpiCard({ label, value, sub, positive, benchmarkPct }: KpiCardProps) {
  return (
    <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-4">
      <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
        {label}
      </p>
      <p className={`font-mono text-xl font-bold ${positive === false ? 'text-[#DC2626]' : 'text-[#1C2B20]'}`}>
        {value}
      </p>
      {benchmarkPct != null && (
        <div className="mt-2 h-1 w-full rounded-none bg-[#E2E0DA]">
          <div
            className="h-1 bg-[#4A7C59] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, benchmarkPct))}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">{sub}</p>}
    </div>
  );
}

interface InteractiveDemoProps {
  cdi?: number;
}

const kpiContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const kpiItemVariants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function InteractiveDemo({ cdi = CDI_RATE }: InteractiveDemoProps) {
  const reduced = useReducedMotion();
  const [priceRaw, setPriceRaw] = useState(formatBRL(DEFAULT_PRICE));
  const [downRaw, setDownRaw] = useState(formatBRL(DEFAULT_DOWN));
  const [rentRaw, setRentRaw] = useState(formatBRL(DEFAULT_RENT));
  const [metrics, setMetrics] = useState(() => calcMetrics(DEFAULT_PRICE, DEFAULT_DOWN, DEFAULT_RENT, cdi));

  const recalc = useCallback(() => {
    const m = calcMetrics(parseBRL(priceRaw), parseBRL(downRaw), parseBRL(rentRaw), cdi);
    setMetrics(m);
  }, [priceRaw, downRaw, rentRaw, cdi]);

  useEffect(() => {
    const t = setTimeout(recalc, 150);
    return () => clearTimeout(t);
  }, [recalc]);

  const demoParams = new URLSearchParams({
    price: String(parseBRL(priceRaw)),
    down: String(parseBRL(downRaw)),
    rent: String(parseBRL(rentRaw)),
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Input column */}
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
            Preço do imóvel
          </label>
          <div className="flex items-center border border-[#E2E0DA] bg-[#F0EFEB] focus-within:border-[#4A7C59]">
            <span className="px-3 font-mono text-sm text-[#9CA3AF]">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={priceRaw}
              onChange={(e) => setPriceRaw(formatBRL(parseBRL(e.target.value)))}
              className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-[#1C2B20] outline-none placeholder:text-[#D0CEC8]"
              placeholder="680.000"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
            Entrada
          </label>
          <div className="flex items-center border border-[#E2E0DA] bg-[#F0EFEB] focus-within:border-[#4A7C59]">
            <span className="px-3 font-mono text-sm text-[#9CA3AF]">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={downRaw}
              onChange={(e) => setDownRaw(formatBRL(parseBRL(e.target.value)))}
              className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-[#1C2B20] outline-none placeholder:text-[#D0CEC8]"
              placeholder="204.000"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
            Aluguel esperado / mês
          </label>
          <div className="flex items-center border border-[#E2E0DA] bg-[#F0EFEB] focus-within:border-[#4A7C59]">
            <span className="px-3 font-mono text-sm text-[#9CA3AF]">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={rentRaw}
              onChange={(e) => setRentRaw(formatBRL(parseBRL(e.target.value)))}
              className="flex-1 bg-transparent py-2.5 pr-3 font-mono text-sm text-[#1C2B20] outline-none placeholder:text-[#D0CEC8]"
              placeholder="3.800"
            />
          </div>
        </div>

        <p className="font-mono text-[10px] text-[#9CA3AF]">
          Exemplo: Apartamento 70m² · Pinheiros, SP
        </p>
      </div>

      {/* KPI column */}
      <div className="flex flex-col gap-3">
        {metrics ? (
          <motion.div
            className="grid grid-cols-2 gap-px border border-[#E2E0DA] bg-[#E2E0DA]"
            variants={reduced ? undefined : kpiContainerVariants}
            initial={reduced ? false : 'hidden'}
            animate={reduced ? undefined : 'show'}
          >
            {[
              { label: 'Yield Bruto', value: `${metrics.yieldBruto.toFixed(1)}%`, benchmarkPct: (metrics.yieldBruto / 12) * 100, sub: `CDI: ${(cdi * 100).toFixed(1)}%` },
              { label: 'Cap Rate', value: `${metrics.capRate.toFixed(1)}%`, benchmarkPct: (metrics.capRate / 10) * 100 },
              { label: 'Fluxo Mensal', value: formatCurrency(metrics.monthlyCashFlow), positive: metrics.monthlyCashFlow >= 0 },
              { label: 'Payback', value: `${metrics.paybackYears.toFixed(1)} anos`, benchmarkPct: Math.max(0, 100 - (metrics.paybackYears / 30) * 100) },
              { label: 'ROI 10 anos', value: `${metrics.roi10.toFixed(0)}%` },
              { label: 'CDI 10 anos', value: `${metrics.cdiEquiv.toFixed(0)}%`, sub: 'Benchmark' },
            ].map((kpi) => (
              <motion.div key={kpi.label} variants={reduced ? undefined : kpiItemVariants}>
                <KpiCard {...kpi} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex h-full items-center justify-center border border-[#E2E0DA] bg-[#FAFAF8] p-8 text-center">
            <p className="font-mono text-xs text-[#9CA3AF]">Preencha os campos para ver a análise</p>
          </div>
        )}

        <Link
          href={`/auth?${demoParams.toString()}`}
          onClick={() => track('demo_continue_click')}
          className="flex w-full items-center justify-center gap-2 bg-[#4A7C59] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          Continuar com este imóvel →
        </Link>
        <p className="text-center font-mono text-[10px] text-[#9CA3AF]">
          Sem cartão · Análise completa em 3 minutos
        </p>
      </div>
    </div>
  );
}
