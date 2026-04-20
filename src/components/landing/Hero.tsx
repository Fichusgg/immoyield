'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

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

        {/* RIGHT — layered mockup, warm palette */}
        <motion.div
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          className="relative h-[360px] md:col-span-6 md:h-[460px] lg:h-[520px]"
        >
          {/* Desktop (back) */}
          <div
            className="absolute right-[-5%] top-1/2 w-[105%] -translate-y-1/2 border border-[#E2E0DA] bg-[#FAFAF8] p-3"
            style={{ boxShadow: '0 20px 40px -12px rgba(28,43,32,0.08)' }}
          >
            <div className="flex items-center gap-1.5 pb-2">
              <span className="h-2 w-2 rounded-full bg-[#E2E0DA]" />
              <span className="h-2 w-2 rounded-full bg-[#E2E0DA]" />
              <span className="h-2 w-2 rounded-full bg-[#E2E0DA]" />
            </div>
            <div className="aspect-[16/10] w-full bg-[#F0EFEB] p-4">
              <div className="grid h-full grid-cols-12 gap-3">
                <div className="col-span-3 space-y-2">
                  <div className="h-2.5 w-3/4 bg-[#E2E0DA]" />
                  <div className="h-2.5 w-1/2 bg-[#E2E0DA]" />
                  <div className="h-2.5 w-2/3 bg-[#E2E0DA]" />
                  <div className="h-2.5 w-1/2 bg-[#E2E0DA]" />
                </div>
                <div className="col-span-9 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-14 bg-[#EBF3EE]" />
                    <div className="h-14 bg-[#FAFAF8]" />
                    <div className="h-14 bg-[#FAFAF8]" />
                  </div>
                  <div className="h-20 bg-[#FAFAF8]" />
                  <div className="h-14 bg-[#FAFAF8]" />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile (front) */}
          <div
            className="absolute bottom-2 left-2 z-10 w-[28%] min-w-[130px] border border-[#E2E0DA] bg-[#FAFAF8] p-2"
            style={{ boxShadow: '0 20px 40px -12px rgba(28,43,32,0.12)', borderRadius: 28 }}
          >
            <div className="aspect-[9/19] w-full bg-[#F0EFEB] p-3" style={{ borderRadius: 22 }}>
              <div className="mx-auto mt-1 h-1 w-10 rounded bg-[#E2E0DA]" />
              <div className="mt-3 h-2 w-2/3 bg-[#E2E0DA]" />
              <div className="mt-2 h-2 w-1/2 bg-[#E2E0DA]" />
              <div className="mt-3 h-16 bg-[#EBF3EE]" />
              <div className="mt-2 h-2 w-3/4 bg-[#E2E0DA]" />
              <div className="mt-2 h-2 w-2/3 bg-[#E2E0DA]" />
              <div className="mt-4 h-7 bg-[#4A7C59]" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
