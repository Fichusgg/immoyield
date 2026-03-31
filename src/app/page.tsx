import Link from 'next/link';
import { getBenchmarks } from '@/lib/benchmarks';

export default async function Home() {
  const benchmarks = await getBenchmarks();

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#e5e5e3] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-[#1a1a1a]">ImmoYield</span>
          <nav className="flex items-center gap-6">
            <Link
              href="/meus-negocios"
              className="border-b-2 border-[#1a1a1a] pb-0.5 text-sm font-medium text-[#1a1a1a]"
            >
              Meus Negócios
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="mb-5 inline-flex items-center rounded-full border border-[#e5e5e3] bg-white px-4 py-1.5 text-xs font-medium tracking-widest text-[#737373] uppercase">
          Mercado Brasileiro
        </div>
        <h1 className="mx-auto max-w-2xl text-5xl leading-[1.1] font-bold tracking-tight text-[#1a1a1a]">
          Teu Calculador de{' '}
          <span className="font-serif text-[#1a5c3a] italic">Investimento Imobiliário</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-[#737373]">
          Calculadora de investimento imobiliário rápida e clara para o mercado brasileiro. Precisão
          editorial para suas decisões de capital.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/analisar"
            className="rounded-lg bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
          >
            Analisar um imóvel →
          </Link>
          <button className="rounded-lg border border-[#e5e5e3] bg-white px-6 py-3 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#f5f5f3]">
            Ver Exemplos
          </button>
        </div>
      </section>

      {/* ── KPI Preview Cards ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1 */}
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
              Yield Bruto
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#1a1a1a]">8.4</span>
              <span className="text-lg font-medium text-[#737373]">%</span>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-[#efefed]">
              <div className="h-1 w-3/5 rounded-full bg-[#1a5c3a]" />
            </div>
            <p className="mt-2 text-xs text-[#1a5c3a]">Acima da média regional</p>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
              ROI Estreito
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[#1a1a1a]">12.2</span>
              <span className="text-lg font-medium text-[#737373]">%</span>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-[#efefed]">
              <div className="h-1 w-2/5 rounded-full bg-[#737373]" />
            </div>
            <p className="mt-2 text-xs text-[#737373]">Projeção 12 meses</p>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
              Fluxo de Caixa
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-[#737373]">R$</span>
              <span className="text-3xl font-bold text-[#1a1a1a]">4.250</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-[#1a5c3a]">↗ +R$ 450 vs mês anterior</p>
            <p className="mt-0.5 text-xs text-[#a3a3a1]">Líquido mensal</p>
          </div>
        </div>
      </section>

      {/* ── Feature Banner ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl bg-[#1a1a1a]">
          {/* Abstract grid texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 p-10">
            <p className="text-xl font-bold text-white">
              Decisões baseadas em dados, não em palpites.
            </p>
            <p className="mt-2 max-w-md text-sm text-[#a3a3a1]">
              Utilize métricas avançadas do mercado imobiliário brasileiro para garantir a
              rentabilidade do seu portfólio.
            </p>
            <div className="mt-6 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-[#4a8c65]">
                  {benchmarks?.cdi?.toFixed(1) ?? '—'}%
                </p>
                <p className="text-xs text-[#737373]">CDI atual</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#4a8c65]">
                  {benchmarks?.fii?.toFixed(1) ?? '—'}%
                </p>
                <p className="text-xs text-[#737373]">Média FII</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e5e3] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm font-bold text-[#1a1a1a]">ImmoYield</span>
          <div className="flex gap-6 text-xs font-medium text-[#737373]">
            <Link href="#" className="hover:text-[#1a1a1a]">
              TERMOS
            </Link>
            <Link href="#" className="hover:text-[#1a1a1a]">
              PRIVACIDADE
            </Link>
            <Link href="#" className="hover:text-[#1a1a1a]">
              CONTATO
            </Link>
          </div>
          <span className="text-xs text-[#a3a3a1]">© 2026 ImmoYield.</span>
        </div>
      </footer>
    </main>
  );
}
