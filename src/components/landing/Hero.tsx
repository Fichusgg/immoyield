'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HeroCalculator } from './HeroCalculator';

const SAGE = '#4A7C59';
const SAGE_DIM = '#3D6B4F';

const EASE = [0.25, 0.1, 0.25, 1] as const;

export default function Hero() {
  const reduced = useReducedMotion();

  const rise = (delay = 0) =>
    reduced
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[#F8F7F4]"
      style={{ paddingTop: 100, paddingBottom: 100 }}
    >
      {/* subtle editorial accent — sage ghost diagonal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse at 85% 30%, rgba(74,124,89,0.06) 0%, transparent 55%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-6 md:grid-cols-12 md:gap-8">
        {/* LEFT */}
        <div className="flex flex-col gap-7 md:col-span-6 md:justify-center">
          <motion.p
            {...rise(0)}
            className="text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase"
          >
            Calculadora · Brasil · 2026
          </motion.p>
          <motion.h1
            {...rise(0.08)}
            className="text-4xl font-bold leading-[1.08] tracking-tight text-[#1C2B20] md:text-5xl lg:text-[56px]"
          >
            Analise qualquer imóvel.
            <br />
            <span className="text-[#4A7C59]">Ofereça com confiança.</span>
          </motion.h1>
          <motion.p
            {...rise(0.16)}
            className="max-w-md text-base leading-[1.65] text-[#6B7280] md:text-lg"
          >
            Aluguel, flip e financiamento com a tributação brasileira embutida.
            Compare com o CDI sem nunca abrir uma planilha.
          </motion.p>

          <motion.div {...rise(0.24)} className="flex flex-wrap items-center gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center px-6 py-3 text-[11px] font-semibold tracking-[0.14em] text-white uppercase transition-colors"
              style={{ backgroundColor: SAGE }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = SAGE_DIM)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = SAGE)}
            >
              Começar análise grátis
            </Link>
            <Link
              href="#funcionalidades"
              className="border border-[#D0CEC8] px-6 py-3 text-[11px] font-semibold tracking-[0.14em] text-[#6B7280] uppercase transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              Ver recursos →
            </Link>
          </motion.div>

          
        </div>

        {/* RIGHT — interactive mini-calculator (replaces the static mockup) */}
        <HeroCalculator />
      </div>
    </section>
  );
}
