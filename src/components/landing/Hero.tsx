'use client';

import Link from 'next/link';

const SAGE = '#4A7C59';
const SAGE_DIM = '#3D6B4F';

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[#F8F7F4]"
      style={{ paddingTop: 128, paddingBottom: 96 }}
    >
      {/* Background washes — sage radial accents, no-op for layout */}
      <div
        aria-hidden
        className="immo-fade pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse 60% 60% at 85% 15%, rgba(74,124,89,0.10) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 5% 95%, rgba(74,124,89,0.05) 0%, transparent 55%)',
          animationDelay: '0ms',
        }}
      />

      {/* Faint masthead hairline */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 h-px w-full max-w-[1200px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#D0CEC8] to-transparent"
        style={{ zIndex: 0 }}
      />

      {/* Subtle decorative grid lines on the right edge — editorial feel */}
      <div
        aria-hidden
        className="immo-fade pointer-events-none absolute top-32 right-0 hidden h-[420px] w-[300px] lg:block"
        style={{
          zIndex: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(74,124,89,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 100%',
          maskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
          animationDelay: '300ms',
        }}
      />

      <div
        className="relative mx-auto flex max-w-[1120px] flex-col items-start px-6"
        style={{ zIndex: 1 }}
      >
        {/* Masthead row */}
        <div
          className="immo-rise mb-9 flex items-center gap-3 text-[10px] font-semibold tracking-[0.18em] text-[#6B7280] uppercase"
          style={{ animationDelay: '0ms' }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SAGE }}
            aria-hidden
          />
          <span className="inline-block h-[1px] w-8 bg-[#9CA3AF]" />
          <span>Calculadora</span>
          <span className="text-[#D0CEC8]">·</span>
          <span>Brasil</span>
          <span className="text-[#D0CEC8]">·</span>
          <span>2026</span>
        </div>

        {/* Headline */}
        <h1
          className="immo-rise max-w-[900px] text-[44px] font-bold leading-[1.02] tracking-tight text-[#1C2B20] md:text-[68px] lg:text-[80px]"
          style={{ animationDelay: '100ms' }}
        >
          Analise qualquer imóvel.
          <br />
          <span style={{ color: SAGE }}>Ofereça com confiança.</span>
        </h1>

        {/* Subhead */}
        <p
          className="immo-rise mt-8 max-w-[640px] text-base leading-[1.65] text-[#3F4B45] md:text-[19px] md:leading-[1.6]"
          style={{ animationDelay: '220ms' }}
        >
          Aluguel, flip e financiamento com a tributação brasileira embutida.
          Carnê-Leão, PRICE e ImmoScore num só fluxo — compare contra o CDI sem
          nunca abrir uma planilha.
        </p>

        {/* CTAs */}
        <div
          className="immo-rise mt-11 flex flex-wrap items-center gap-4"
          style={{ animationDelay: '340ms' }}
        >
          <Link
            href="/auth"
            className="group inline-flex items-center gap-2 px-7 py-4 text-[11px] font-semibold tracking-[0.16em] text-white uppercase transition-all"
            style={{
              backgroundColor: SAGE,
              boxShadow: '0 12px 24px -10px rgba(74,124,89,0.55)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = SAGE_DIM;
              e.currentTarget.style.boxShadow = '0 16px 32px -10px rgba(74,124,89,0.65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = SAGE;
              e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(74,124,89,0.55)';
            }}
          >
            Começar análise grátis
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="#funcionalidades"
            className="inline-flex items-center gap-2 border border-[#D0CEC8] bg-white/40 px-7 py-4 text-[11px] font-semibold tracking-[0.16em] text-[#3F4B45] uppercase backdrop-blur-sm transition-colors hover:border-[#4A7C59] hover:bg-white/70 hover:text-[#4A7C59]"
          >
            Ver recursos
          </Link>
        </div>

        {/* Trust micro-row */}
        <div
          className="immo-rise mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#6B7280]"
          style={{ animationDelay: '440ms' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckDot />
            Estimativa em 5s
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckDot />
            Sem cadastro
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckDot />
            Matemática igual à do app
          </span>
        </div>

        {/* Capability strip */}
        <div
          className="immo-rise mt-24 grid w-full grid-cols-2 gap-y-10 border-t border-[#D0CEC8] pt-12 md:grid-cols-4 md:gap-x-10"
          style={{ animationDelay: '560ms' }}
        >
          <Pillar
            kicker="Financiamento"
            title="Tabela PRICE"
            body="Amortização real, com parcela e juros mês a mês."
          />
          <Pillar
            kicker="Tributação"
            title="Carnê-Leão"
            body="IR de pessoa física embutido em cada cenário."
          />
          <Pillar
            kicker="Score"
            title="ImmoScore 0–100"
            body="Sinal de qualidade com critérios transparentes."
          />
          <Pillar
            kicker="Comparativo"
            title="CDI · 10 anos"
            body="Patrimônio projetado contra renda fixa real."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative flex flex-col gap-2 md:pl-5">
      <span
        aria-hidden
        className="absolute top-1 left-0 hidden h-7 w-px bg-[#4A7C59] transition-all duration-300 group-hover:h-9 md:block"
      />
      <span className="text-[10px] font-semibold tracking-[0.16em] text-[#6B7280] uppercase">
        {kicker}
      </span>
      <span className="text-[15px] font-semibold leading-snug tracking-tight text-[#1C2B20]">
        {title}
      </span>
      <span className="text-[13px] leading-[1.55] text-[#6B7280]">{body}</span>
    </div>
  );
}

function CheckDot() {
  return (
    <span
      aria-hidden
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full"
      style={{ backgroundColor: '#EBF3EE', color: SAGE }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}
