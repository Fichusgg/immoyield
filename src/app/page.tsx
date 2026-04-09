import Link from 'next/link';
import { getBenchmarks } from '@/lib/benchmarks';

export default async function Home() {
  const benchmarks = await getBenchmarks();

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#4A7C59] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          <nav className="flex items-center gap-6">
            <Link
              href="/propriedades"
              className="border-b-2 border-[#4A7C59] pb-0.5 text-sm font-medium text-[#4A7C59] focus-visible:ring-1 focus-visible:ring-[#4A7C59] focus-visible:outline-none"
            >
              Meus Negócios
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section id="hero" className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="mb-5 inline-flex items-center border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-1.5 text-xs font-medium tracking-[0.12em] text-[#9CA3AF] uppercase">
          Mercado Brasileiro
        </div>
        <h1 className="mx-auto max-w-2xl text-5xl leading-[1.1] font-bold tracking-tight text-[#1C2B20]">
          Teu Calculador de{' '}
          <span className="font-serif text-[#4A7C59] italic">Investimento Imobiliário</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-[#6B7280]">
          Calculadora de investimento imobiliário rápida e clara para o mercado brasileiro. Precisão
          editorial para suas decisões de capital.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/propriedades"
            className="bg-[#4A7C59] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] focus-visible:ring-2 focus-visible:ring-[#4A7C59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F7F4] focus-visible:outline-none"
          >
            Analisar um imóvel →
          </Link>
          <Link
            href="/propriedades"
            className="border border-[#D0CEC8] bg-transparent px-6 py-3 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59] focus-visible:ring-2 focus-visible:ring-[#4A7C59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F7F4] focus-visible:outline-none"
          >
            Ver Exemplos
          </Link>
        </div>
      </section>

      {/* ── KPI Preview Cards ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-px border border-[#E2E0DA] bg-[#E2E0DA] sm:grid-cols-3">
          {/* Card 1 */}
          <div className="bg-[#FAFAF8] p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
              Yield Bruto
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-[#1C2B20]">8.4</span>
              <span className="font-mono text-lg font-medium text-[#6B7280]">%</span>
            </div>
            <div className="mt-3 h-px w-full bg-[#E2E0DA]">
              <div className="h-px w-3/5 bg-[#4A7C59]" />
            </div>
            <p className="mt-2 font-mono text-xs text-[#4A7C59]">Acima da média regional</p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FAFAF8] p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
              ROI Estreito
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-[#1C2B20]">12.2</span>
              <span className="font-mono text-lg font-medium text-[#6B7280]">%</span>
            </div>
            <div className="mt-3 h-px w-full bg-[#E2E0DA]">
              <div className="h-px w-2/5 bg-[#6B7280]" />
            </div>
            <p className="mt-2 font-mono text-xs text-[#6B7280]">Projeção 12 meses</p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#FAFAF8] p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.07em] text-[#9CA3AF] uppercase">
              Fluxo de Caixa
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-sm font-medium text-[#6B7280]">R$</span>
              <span className="font-mono text-3xl font-bold text-[#1C2B20]">4.250</span>
            </div>
            <p className="mt-2 font-mono text-xs font-semibold text-[#4A7C59]">
              ↗ +R$ 450 vs mês anterior
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">Líquido mensal</p>
          </div>
        </div>
      </section>

      {/* ── Feature Banner ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden border border-[#E2E0DA] bg-[#FAFAF8]">
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 p-10">
            <p className="text-xl font-bold text-[#1C2B20]">
              Decisões baseadas em dados, não em palpites.
            </p>
            <p className="mt-2 max-w-md text-sm text-[#9CA3AF]">
              Utilize métricas avançadas do mercado imobiliário brasileiro para garantir a
              rentabilidade do seu portfólio.
            </p>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="font-mono text-2xl font-bold text-[#4A7C59]">
                  {benchmarks?.cdi?.toFixed(1) ?? '—'}%
                </p>
                <p className="font-mono text-xs text-[#9CA3AF]">CDI atual</p>
              </div>
              <div className="w-px bg-[#E2E0DA]" />
              <div>
                <p className="font-mono text-2xl font-bold text-[#4A7C59]">
                  {benchmarks?.fii?.toFixed(1) ?? '—'}%
                </p>
                <p className="font-mono text-xs text-[#9CA3AF]">Média FII</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm font-bold text-[#1C2B20]">ImmoYield</span>
          <div className="flex gap-6 text-xs font-medium text-[#9CA3AF]">
            <Link
              href="#"
              className="transition-colors hover:text-[#6B7280] focus-visible:ring-1 focus-visible:ring-[#4A7C59] focus-visible:outline-none"
            >
              TERMOS
            </Link>
            <Link
              href="#"
              className="transition-colors hover:text-[#6B7280] focus-visible:ring-1 focus-visible:ring-[#4A7C59] focus-visible:outline-none"
            >
              PRIVACIDADE
            </Link>
            <Link
              href="#"
              className="transition-colors hover:text-[#6B7280] focus-visible:ring-1 focus-visible:ring-[#4A7C59] focus-visible:outline-none"
            >
              CONTATO
            </Link>
          </div>
          <span className="font-mono text-xs text-[#9CA3AF]">© 2026 ImmoYield.</span>
        </div>
      </footer>
    </main>
  );
}
