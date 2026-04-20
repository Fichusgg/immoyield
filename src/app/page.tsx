import Link from 'next/link';
import { getBenchmarks } from '@/lib/benchmarks';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import FadeInSection from '@/components/landing/FadeInSection';
import TrackableLink from '@/components/landing/TrackableLink';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default async function Home() {
  const benchmarks = await getBenchmarks();
  const cdi = benchmarks?.cdi ? benchmarks.cdi / 100 : 0.1075;

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      {/* ── Skip link ──────────────────────────────────────────────────────────── */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#4A7C59] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Block 1 — Navigation ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex h-14 max-w-[64rem] items-center gap-8 px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="text-base font-bold tracking-tight text-[#1C2B20]">ImóYield</span>
          </Link>

          {/* Section links — hidden on mobile */}
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Como funciona', href: '#como-funciona' },
              { label: 'Funcionalidades', href: '#funcionalidades' },
              { label: 'Preços', href: '#precos' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-[#6B7280] transition-colors hover:text-[#1C2B20]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Auth CTAs — pushed to the right */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/auth"
              className="px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#1C2B20]"
            >
              Entrar
            </Link>
            <Link
              href="/auth"
              className="bg-[#4A7C59] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* ── Block 2 — Hero dual-path ────────────────────────────────────────────── */}
      <section id="hero" className="border-b border-[#E2E0DA] py-20 md:py-28">
        <div className="mx-auto max-w-[64rem] px-4 text-center md:px-6">
          <div className="mb-5 inline-flex items-center border border-[#E2E0DA] bg-[#FAFAF8] px-4 py-1.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
            Mercado Brasileiro · Calculadora para Investidores
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-[#1C2B20] md:text-5xl lg:text-[56px]">
            Análise de investimento imobiliário{' '}
            <span className="font-serif italic text-[#4A7C59]">em minutos, não em planilhas.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#6B7280] md:text-lg">
            Precisão editorial para suas decisões de capital. Rentabilidade, fluxo de caixa, ITBI,
            comparativo com CDI — em uma ferramenta feita para o Brasil.
          </p>

          {/* Dual-path cards */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <TrackableLink
              href="/auth"
              event="hero_cta_click"
              eventProps={{ cta: 'investor' }}
              className="group flex flex-col gap-3 border-2 border-[#4A7C59] bg-[#FAFAF8] p-6 text-left transition-colors hover:bg-[#EBF3EE]"
            >
              <p className="text-sm font-bold text-[#1C2B20]">Sou investidor</p>
              <p className="text-xs leading-relaxed text-[#6B7280]">
                Analise um imóvel e compare com CDI em menos de cinco minutos
              </p>
              <span className="mt-auto text-xs font-semibold text-[#4A7C59] transition-colors group-hover:text-[#3D6B4F]">
                Começar análise gratuita →
              </span>
            </TrackableLink>

            <TrackableLink
              href="/auth?tipo=agencia"
              event="hero_cta_click"
              eventProps={{ cta: 'agency' }}
              className="group flex flex-col gap-3 border border-[#E2E0DA] bg-[#FAFAF8] p-6 text-left transition-colors hover:border-[#4A7C59] hover:bg-[#EBF3EE]"
            >
              <p className="text-sm font-bold text-[#1C2B20]">Represento uma agência</p>
              <p className="text-xs leading-relaxed text-[#6B7280]">
                Apresente deals para clientes com relatórios white-label
              </p>
              <span className="mt-auto text-xs font-semibold text-[#4A7C59] transition-colors group-hover:text-[#3D6B4F]">
                Ver demo para agências →
              </span>
            </TrackableLink>
          </div>

          <p className="mt-5 font-mono text-[11px] text-[#9CA3AF]">
            Sem cartão de crédito · Primeira análise em 3 minutos · 100% em português
          </p>
        </div>
      </section>

      {/* ── Block 3 — Interactive demo ──────────────────────────────────────────── */}
      <section className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Experimente agora
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-[#1C2B20] md:text-3xl">
              Veja a análise antes de criar conta
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Ajuste os valores abaixo e os indicadores atualizam em tempo real.
            </p>
          </div>
          <InteractiveDemo cdi={cdi} />
        </FadeInSection>
      </section>

      {/* ── Block 4 — Como funciona ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Como funciona
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-[#1C2B20] md:text-3xl">
              Do imóvel à decisão em três passos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                n: '1',
                title: 'Informe o imóvel',
                desc: 'Cole o link de um anúncio do ZAP, VivaReal ou QuintoAndar e o ImóYield preenche automaticamente. Ou insira os dados manualmente, ou duplique um deal existente.',
              },
              {
                n: '2',
                title: 'Veja a análise completa',
                desc: 'Yield bruto, Cap rate, Fluxo de caixa mensal, TIR, Payback em anos e Comparativo com CDI — calculados em segundos, com a tributação brasileira embutida.',
              },
              {
                n: '3',
                title: 'Compartilhe ou salve',
                desc: 'Gere um PDF profissional, envie um link público ao cônjuge ou cliente, ou salve no portfólio para comparar com outros deals depois.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-5">
                <span className="font-serif text-5xl font-bold italic leading-none text-[#4A7C59] opacity-60">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1C2B20]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/auth"
              className="border border-[#D0CEC8] px-6 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              Ver análise de exemplo →
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 5 — Feature banner (3 colunas Brasil) ─────────────────────────── */}
      <section id="funcionalidades" className="border-b border-[#E2E0DA] bg-[#FAFAF8] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1C2B20]">
              Decisões baseadas em dados, não em palpites.
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Tributação brasileira embutida. Benchmarks oficiais. Cálculos auditáveis. Você
              analisa, o ImóYield faz a conta.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px border border-[#E2E0DA] bg-[#E2E0DA] md:grid-cols-3">
            <div className="bg-[#FAFAF8] p-6">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Tributação brasileira
              </p>
              <h3 className="mb-3 text-base font-bold text-[#1C2B20]">Impostos embutidos</h3>
              <ul className="space-y-1">
                {['ITBI', 'IPTU', 'IR sobre aluguel (Carnê-Leão)', 'Ganho de capital (alíquota progressiva)'].map(
                  (item) => (
                    <li key={item} className="font-mono text-xs text-[#6B7280]">
                      · {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="bg-[#FAFAF8] p-6">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Benchmarks em tempo real
              </p>
              <h3 className="mb-3 text-base font-bold text-[#1C2B20]">Referências oficiais</h3>
              <div className="mb-3 flex gap-6">
                <div>
                  <p className="font-mono text-2xl font-bold text-[#4A7C59]">
                    {benchmarks?.cdi?.toFixed(1) ?? '—'}%
                  </p>
                  <p className="font-mono text-[10px] text-[#9CA3AF]">CDI atual</p>
                </div>
                <div className="w-px bg-[#E2E0DA]" />
                <div>
                  <p className="font-mono text-2xl font-bold text-[#4A7C59]">
                    {benchmarks?.fii?.toFixed(1) ?? '—'}%
                  </p>
                  <p className="font-mono text-[10px] text-[#9CA3AF]">Média FII</p>
                </div>
              </div>
              <p className="font-mono text-[10px] text-[#9CA3AF]">
                Fonte: BACEN SGS · Atualizado toda segunda-feira
              </p>
            </div>

            <div className="bg-[#FAFAF8] p-6">
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Financiamento local
              </p>
              <h3 className="mb-3 text-base font-bold text-[#1C2B20]">Modalidades brasileiras</h3>
              <ul className="space-y-1">
                {['SFH — Sistema Financeiro da Habitação', 'SFI — Sistema de Financiamento Imobiliário', 'Tabela PRICE', 'Sistema SAC'].map(
                  (item) => (
                    <li key={item} className="font-mono text-xs text-[#6B7280]">
                      · {item}
                    </li>
                  )
                )}
              </ul>
              <p className="mt-3 font-mono text-[10px] text-[#9CA3AF]">
                Cálculos auditados conforme metodologia pública
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 6 — Duas vozes ────────────────────────────────────────────────── */}
      <section className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Investidor individual */}
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-8">
              <p className="mb-4 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Para investidores individuais
              </p>
              <h3 className="mb-4 text-xl font-bold text-[#1C2B20]">
                Decida sobre um imóvel em minutos, não em horas
              </h3>
              <ul className="mb-6 space-y-2">
                {[
                  'Compare diretamente com CDI e média de FII',
                  'Veja o payback, TIR e fluxo de caixa em segundos',
                  'Salve e volte quando tiver nova indicação',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#6B7280]">
                    <span className="mt-0.5 text-[#4A7C59]">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-2 border-[#4A7C59] pl-4">
                <p className="font-serif text-sm italic text-[#1C2B20]">
                  &ldquo;Economizei a planilha que eu fazia a cada imóvel que meu corretor mandava.
                  Agora eu rejeito em dois minutos o que antes tomava uma noite.&rdquo;
                </p>
                <cite className="mt-2 block font-mono text-xs text-[#9CA3AF] not-italic">
                  — Marcos T. · São Paulo
                </cite>
              </blockquote>
              <Link
                href="/auth"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#4A7C59] transition-colors hover:text-[#3D6B4F]"
              >
                Começar análise gratuita →
              </Link>
            </div>

            {/* Corretores e agências */}
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-8">
              <p className="mb-4 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Para corretores e agências
              </p>
              <h3 className="mb-4 text-xl font-bold text-[#1C2B20]">
                Apresente deals com aparência de consultoria financeira
              </h3>
              <ul className="mb-6 space-y-2">
                {[
                  'Relatórios PDF profissionais em segundos',
                  'White-label: seu logo, não o nosso',
                  'Comparativo de múltiplos imóveis lado a lado',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#6B7280]">
                    <span className="mt-0.5 text-[#4A7C59]">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-2 border-[#4A7C59] pl-4">
                <p className="font-serif text-sm italic text-[#1C2B20]">
                  &ldquo;Meus clientes pararam de questionar os números quando comecei a usar o
                  ImóYield. O relatório fala por si só.&rdquo;
                </p>
                <cite className="mt-2 block font-mono text-xs text-[#9CA3AF] not-italic">
                  — Patrícia A. · Corretor autônomo · Curitiba
                </cite>
              </blockquote>
              <Link
                href="/auth?tipo=agencia"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#4A7C59] transition-colors hover:text-[#3D6B4F]"
              >
                Ver demo para agências →
              </Link>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 7 — Prova social ──────────────────────────────────────────────── */}
      <section className="border-b border-[#E2E0DA] bg-[#FAFAF8] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-10 text-center">
            <div className="flex justify-center gap-10">
              {[
                { value: '94%', label: 'voltam na semana seguinte' },
                { value: '< 3min', label: 'para a primeira análise' },
                { value: '100%', label: 'em português' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-mono text-3xl font-bold text-[#1C2B20] md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[#9CA3AF]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-xs text-center">
            <p className="font-mono text-[11px] text-[#9CA3AF]">
              Construído em São Paulo · Para investidores brasileiros · Desde 2026
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 8 — Quem somos ────────────────────────────────────────────────── */}
      <section className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Quem somos
              </p>
              <h2 className="mb-4 text-2xl font-bold text-[#1C2B20]">
                Construído por quem passou pela mesma dor
              </h2>
              <p className="text-sm leading-relaxed text-[#6B7280]">
                Construí o ImóYield depois de perder uma noite inteira tentando decidir se
                compensava comprar o segundo apartamento ou deixar o dinheiro no CDI. A planilha eu
                montei. O sono, não recuperei. Decidi fazer o que eu gostaria de ter tido naquela
                noite: uma ferramenta em português, com os impostos brasileiros embutidos, que
                responde em três minutos o que antes levava três horas.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">
                Meu compromisso: o ImóYield nunca vai vender imóveis, nunca vai ganhar comissão de
                corretora, nunca vai empurrar você para um deal. Só calcula. Você decide.
              </p>
              <p className="mt-4 font-mono text-xs text-[#9CA3AF]">— Fundador · São Paulo</p>
            </div>

            <div className="border border-[#E2E0DA] bg-[#F0EFEB] p-10 text-center">
              <span className="font-serif text-8xl font-bold italic text-[#4A7C59] opacity-20">I</span>
              <p className="mt-4 font-mono text-xs text-[#9CA3AF]">ImóYield · São Paulo · 2026</p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 9 — FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-[#E2E0DA] bg-[#FAFAF8] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Perguntas frequentes
            </p>
            <h2 className="text-2xl font-bold text-[#1C2B20]">Tire suas dúvidas</h2>
          </div>

          <div className="mx-auto max-w-2xl">
            <Accordion>
              {[
                {
                  q: 'Preciso entender de finanças para usar?',
                  a: 'Não. Todos os conceitos técnicos têm explicação inline ao lado do campo. O ImóYield foi desenhado para quem está analisando o primeiro imóvel, não apenas para especialistas.',
                },
                {
                  q: 'O ImóYield compra ou vende imóveis?',
                  a: 'Não. O ImóYield é exclusivamente uma ferramenta de análise. Não temos conflito de interesse: não ganhamos comissão, não indicamos corretoras e não vendemos leads. Só calculamos.',
                },
                {
                  q: 'Os dados que eu digitar ficam privados?',
                  a: 'Sim. Seus dados ficam armazenados no Supabase com criptografia em trânsito (TLS) e em repouso. Nunca compartilhamos seus dados com terceiros.',
                },
                {
                  q: 'Posso usar em qualquer estado do Brasil?',
                  a: 'Sim. O ITBI é configurável por município, pois cada cidade tem sua própria alíquota. Os demais impostos (IR, ganho de capital) seguem a legislação federal.',
                },
                {
                  q: 'Funciona para Airbnb e temporada?',
                  a: 'Sim. Há uma categoria dedicada para locação de curta temporada com campos específicos para diária média e taxa de ocupação mensal.',
                },
                {
                  q: 'O relatório PDF tem o logo do ImóYield?',
                  a: 'No plano gratuito, sim. No plano Agência, o relatório é white-label: você adiciona seu próprio logo e o nome da sua imobiliária.',
                },
                {
                  q: 'Como é a precificação?',
                  a: 'Gratuito para até 5 análises por mês. O plano Individual Pro (R$ 39/mês) oferece análises ilimitadas. O plano Agência (R$ 149/mês) adiciona white-label, múltiplos membros e suporte prioritário.',
                },
                {
                  q: 'Posso cancelar a qualquer momento?',
                  a: 'Sim, sem fidelidade nem multa. O cancelamento é feito pela própria plataforma e tem efeito no próximo ciclo de cobrança.',
                },
              ].map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-[#E2E0DA]">
                  <AccordionTrigger className="text-sm font-medium text-[#1C2B20] hover:text-[#4A7C59] hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[#6B7280]">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 10 — Pricing ──────────────────────────────────────────────────── */}
      <section id="precos" className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 md:px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              Preços transparentes
            </p>
            <h2 className="text-2xl font-bold text-[#1C2B20]">Simples, sem surpresas</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Individual Free
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-[#1C2B20]">R$ 0</p>
              <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">para sempre</p>
              <ul className="mt-6 space-y-2">
                {['5 análises por mês', 'PDF com marca ImóYield', 'Compartilhamento por link', 'Suporte por email'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <span className="text-[#4A7C59]">·</span> {f}
                    </li>
                  )
                )}
              </ul>
              <Link
                href="/auth"
                className="mt-6 block border border-[#D0CEC8] py-2.5 text-center text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
              >
                Começar grátis
              </Link>
            </div>

            {/* Pro — destaque */}
            <div className="relative border-2 border-[#4A7C59] bg-[#FAFAF8] p-6">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FAFAF8] px-3 font-mono text-[10px] font-semibold text-[#9CA3AF]">
                MAIS ESCOLHIDO
              </span>
              <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Individual Pro
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-[#1C2B20]">R$ 39</p>
              <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">por mês</p>
              <ul className="mt-6 space-y-2">
                {['Análises ilimitadas', 'PDF com marca ImóYield', 'Comparativo de até 5 deals', 'Compartilhamento por link', 'Suporte email 24h'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <span className="text-[#4A7C59]">·</span> {f}
                    </li>
                  )
                )}
              </ul>
              <Link
                href="/auth"
                className="mt-6 block bg-[#4A7C59] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
              >
                Assinar Pro
              </Link>
            </div>

            {/* Agência */}
            <div className="border border-[#E2E0DA] bg-[#FAFAF8] p-6">
              <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
                Agência
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-[#1C2B20]">R$ 149</p>
              <p className="mt-0.5 font-mono text-xs text-[#9CA3AF]">por mês</p>
              <ul className="mt-6 space-y-2">
                {['Análises ilimitadas', 'PDF white-label (seu logo)', 'Comparativo ilimitado', 'Até 5 membros na conta', 'Suporte prioritário'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <span className="text-[#4A7C59]">·</span> {f}
                    </li>
                  )
                )}
              </ul>
              <Link
                href="/auth?tipo=agencia"
                className="mt-6 block border border-[#D0CEC8] py-2.5 text-center text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
              >
                Falar com o time
              </Link>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ── Block 11 — CTA final ────────────────────────────────────────────────── */}
      <section className="border-b border-[#E2E0DA] py-16 md:py-20">
        <FadeInSection className="mx-auto max-w-[64rem] px-4 text-center md:px-6">
          <h2 className="text-2xl font-bold text-[#1C2B20] md:text-3xl">
            Pronto para analisar seu próximo imóvel?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackableLink
              href="/auth"
              event="hero_cta_click"
              eventProps={{ cta: 'final_investor' }}
              className="bg-[#4A7C59] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
            >
              Começar análise gratuita →
            </TrackableLink>
            <TrackableLink
              href="/auth?tipo=agencia"
              event="hero_cta_click"
              eventProps={{ cta: 'final_agency' }}
              className="border border-[#D0CEC8] px-8 py-3 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              Ver demo para agências →
            </TrackableLink>
          </div>
          <p className="mt-5 font-mono text-[11px] text-[#9CA3AF]">
            Sua primeira análise em 3 minutos · Sem cartão · Sem SPAM
          </p>
        </FadeInSection>
      </section>

      {/* ── Block 12 — Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-[#FAFAF8]">
        <div className="mx-auto max-w-[64rem] px-4 py-12 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
                  I
                </div>
                <span className="font-bold tracking-tight text-[#1C2B20]">ImóYield</span>
              </div>
              <p className="mt-3 text-xs text-[#9CA3AF]">
                Calculadora de investimento imobiliário para o Brasil.
              </p>
            </div>

            {/* Produto */}
            <div>
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                Produto
              </p>
              <ul className="space-y-2">
                {[
                  { label: 'Criar conta', href: '/auth' },
                  { label: 'Entrar', href: '/auth' },
                  { label: 'Preços', href: '#precos' },
                  { label: 'Para agências', href: '/auth?tipo=agencia' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-[#6B7280] transition-colors hover:text-[#1C2B20]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                Empresa
              </p>
              <ul className="space-y-2">
                {[
                  { label: 'Quem somos', href: '#quem-somos' },
                  { label: 'Metodologia', href: '#' },
                  { label: 'Contato', href: '#' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-[#6B7280] transition-colors hover:text-[#1C2B20]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.1em] text-[#9CA3AF] uppercase">
                Legal
              </p>
              <ul className="space-y-2">
                {[
                  { label: 'Termos de uso', href: '#' },
                  { label: 'Privacidade', href: '#' },
                  { label: 'Aviso de isenção', href: '#' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-[#6B7280] transition-colors hover:text-[#1C2B20]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E2E0DA]">
          <div className="mx-auto max-w-[64rem] px-4 py-4 md:px-6">
            <p className="font-mono text-[10px] leading-relaxed text-[#9CA3AF]">
              © 2026 ImóYield. CDI: fonte BACEN SGS, atualizado semanalmente. Cálculos para fins
              informativos — ImóYield não compra, vende nem recomenda imóveis e não presta
              consultoria de investimento.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
