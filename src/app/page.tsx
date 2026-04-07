import Link from 'next/link';
import { getBenchmarks } from '@/lib/benchmarks';

export default async function Home() {
  const benchmarks = await getBenchmarks();

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#22c55e] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#27272a] bg-[#111111]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-[#f4f4f5]">ImmoYield</span>
          <nav className="flex items-center gap-6">
            <Link
              href="/propriedades"
              className="border-b-2 border-[#22c55e] pb-0.5 text-sm font-medium text-[#22c55e] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
            >
              Meus Negócios
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section id="hero" className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="mb-5 inline-flex items-center border border-[#27272a] bg-[#111111] px-4 py-1.5 text-xs font-medium tracking-[0.12em] text-[#52525b] uppercase">
          Mercado Brasileiro
        </div>
        <h1 className="mx-auto max-w-2xl text-5xl leading-[1.1] font-bold tracking-tight text-[#f4f4f5]">
          Teu Calculador de{' '}
          <span className="font-serif text-[#22c55e] italic">Investimento Imobiliário</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-[#a1a1aa]">
          Calculadora de investimento imobiliário rápida e clara para o mercado brasileiro. Precisão
          editorial para suas decisões de capital.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/propriedades"
            className="bg-[#22c55e] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
          >
            Analisar um imóvel →
          </Link>
          <Link
            href="/propriedades"
            className="border border-[#3f3f46] bg-transparent px-6 py-3 text-sm font-medium text-[#a1a1aa] transition-colors hover:border-[#22c55e] hover:text-[#22c55e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
          >
            Ver Exemplos
          </Link>
        </div>
      </section>

      {/* ── KPI Preview Cards ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-px border border-[#27272a] bg-[#27272a] sm:grid-cols-3">
          {/* Card 1 */}
          <div className="bg-[#111111] p-5">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">
              Yield Bruto
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-[#f4f4f5]">8.4</span>
              <span className="font-mono text-lg font-medium text-[#a1a1aa]">%</span>
            </div>
            <div className="mt-3 h-px w-full bg-[#27272a]">
              <div className="h-px w-3/5 bg-[#22c55e]" />
            </div>
            <p className="mt-2 font-mono text-xs text-[#22c55e]">Acima da média regional</p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#111111] p-5">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">
              ROI Estreito
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-[#f4f4f5]">12.2</span>
              <span className="font-mono text-lg font-medium text-[#a1a1aa]">%</span>
            </div>
            <div className="mt-3 h-px w-full bg-[#27272a]">
              <div className="h-px w-2/5 bg-[#a1a1aa]" />
            </div>
            <p className="mt-2 font-mono text-xs text-[#a1a1aa]">Projeção 12 meses</p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#111111] p-5">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">
              Fluxo de Caixa
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-sm font-medium text-[#a1a1aa]">R$</span>
              <span className="font-mono text-3xl font-bold text-[#f4f4f5]">4.250</span>
            </div>
            <p className="mt-2 font-mono text-xs font-semibold text-[#22c55e]">
              ↗ +R$ 450 vs mês anterior
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#52525b]">Líquido mensal</p>
          </div>
        </div>
      </section>

      {/* ── Feature Banner ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden border border-[#27272a] bg-[#111111]">
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
            <p className="text-xl font-bold text-[#f4f4f5]">
              Decisões baseadas em dados, não em palpites.
            </p>
            <p className="mt-2 max-w-md text-sm text-[#52525b]">
              Utilize métricas avançadas do mercado imobiliário brasileiro para garantir a
              rentabilidade do seu portfólio.
            </p>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="font-mono text-2xl font-bold text-[#22c55e]">
                  {benchmarks?.cdi?.toFixed(1) ?? '—'}%
                </p>
                <p className="font-mono text-xs text-[#52525b]">CDI atual</p>
              </div>
              <div className="w-px bg-[#27272a]" />
              <div>
                <p className="font-mono text-2xl font-bold text-[#22c55e]">
                  {benchmarks?.fii?.toFixed(1) ?? '—'}%
                </p>
                <p className="font-mono text-xs text-[#52525b]">Média FII</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#27272a] bg-[#111111]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm font-bold text-[#f4f4f5]">ImmoYield</span>
          <div className="flex gap-6 text-xs font-medium text-[#52525b]">
            <Link
              href="#"
              className="transition-colors hover:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
            >
              TERMOS
            </Link>
            <Link
              href="#"
              className="transition-colors hover:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
            >
              PRIVACIDADE
            </Link>
            <Link
              href="#"
              className="transition-colors hover:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
            >
              CONTATO
            </Link>
          </div>
          <span className="font-mono text-xs text-[#52525b]">© 2026 ImmoYield.</span>
        </div>
      </footer>
    </main>
  );
}
