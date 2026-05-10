import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import FeatureSection from '@/components/landing/FeatureSection';
import FadeInSection from '@/components/landing/FadeInSection';
import FloatingButton from '@/components/landing/FloatingButton';
import Footer from '@/components/landing/Footer';
import FaqSection from '@/components/landing/FaqSection';
import {
  PropertyDataCard,
  InputsCard,
  AnalyticsCard,
  MapCard,
  OfferCalculatorCard,
  ReportsCard,
} from '@/components/landing/featureVisuals';

const SAGE = '#4A7C59';

const FEATURES = [
  {
    id: 'dados',
    eyebrow: 'Dados do imóvel',
    title: 'Cada anúncio em uma ficha limpa.',
    subheading: 'Cole um link, preenchemos o resto.',
    body: 'Endereço, área, preço e fotos de ZAP, VivaReal e QuintoAndar — normalizados em um único registro que você pode revisar, compartilhar e voltar depois.',
    visual: <PropertyDataCard />,
  },
  {
    id: 'inputs',
    eyebrow: 'Inputs',
    title: 'Campos simples, defaults bem pensados.',
    subheading: 'Digite o que sabe. Pule o resto.',
    body: 'Todo campo já vem com um default calibrado para o mercado brasileiro. A primeira análise sai em segundos — e ainda resiste a escrutínio.',
    visual: <InputsCard />,
  },
  {
    id: 'analise',
    eyebrow: 'Análise',
    title: 'O raio-x financeiro do deal.',
    subheading: 'Yields, caixa, TIR — em uma tela.',
    body: 'Veja para onde o dinheiro realmente vai: prestação, impostos, vacância e caixa líquido. Toda conta é auditável até a fórmula.',
    visual: <AnalyticsCard />,
  },
  {
    id: 'mapa',
    eyebrow: 'Mapa',
    title: 'Seu portfólio no mapa.',
    subheading: 'Compare cada deal no seu bairro.',
    body: 'Plote imóveis lado a lado, veja preços e yields num piscar, e identifique as quadras que consistentemente performam melhor.',
    visual: <MapCard />,
  },
  {
    id: 'oferta',
    eyebrow: 'Calculadora de oferta',
    title: 'Entre na negociação com um número.',
    subheading: 'Pedido, justo e alvo — tudo calibrado.',
    body: 'Ajuste financiamento, cláusulas de vistoria e quem paga o ITBI. A banda de preço justo atualiza em tempo real.',
    visual: <OfferCalculatorCard />,
  },
  {
    id: 'relatorios',
    eyebrow: 'Relatórios',
    title: 'Apresente como consultoria financeira.',
    subheading: 'PDF white-label em um clique.',
    body: 'Envie a clientes e sócios um relatório executivo com a sua marca, as métricas que importam e todo o underwriting por trás delas.',
    visual: <ReportsCard />,
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '0',
    suffix: 'para sempre',
    tagline: 'Para suas primeiras análises.',
    features: ['5 análises por mês', 'PDF com marca ImmoYield', 'Compartilhamento por link', 'Suporte por email'],
    cta: 'Começar grátis',
    href: '/auth',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '39',
    suffix: 'por mês',
    tagline: 'Para investidores ativos.',
    features: ['Análises ilimitadas', 'Comparativo lado a lado', 'PDF com marca ImmoYield', 'Suporte prioritário'],
    cta: 'Assinar Pro',
    href: '/auth',
    highlight: true,
  },
  {
    name: 'Agência',
    price: '149',
    suffix: 'por mês',
    tagline: 'Para corretores e times.',
    features: ['PDF white-label (seu logo)', 'Até 5 membros', 'Comparativo ilimitado', 'Suporte dedicado'],
    cta: 'Falar com o time',
    href: '/auth?tipo=agencia',
    highlight: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#1C2B20]">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-[#4A7C59] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      <Navbar />
      <Hero />

      {/* Como funciona */}
      <section id="como-funciona" className="border-b border-[#E2E0DA] py-[100px]">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeInSection className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#6B7480] uppercase">
              Como funciona
            </p>
            <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[32px]">
              Do anúncio à decisão em três passos.
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
            {[
              { n: '01', title: 'Importe o imóvel', body: 'Cole o link de um anúncio ou insira os dados manualmente. Normalizamos tudo em uma única ficha.' },
              { n: '02', title: 'Veja a análise', body: 'Yield líquido, caixa, TIR e payback — calculados com a tributação brasileira e o CDI do momento.' },
              { n: '03', title: 'Compartilhe ou salve', body: 'Exporte um PDF, envie um link público, ou guarde o deal no portfólio para comparar depois.' },
            ].map((s, i) => (
              <FadeInSection key={s.n} delay={i * 0.1} className="md:col-span-4">
                <p className="text-xs font-bold tracking-[0.12em] tabular-nums text-[#4A7C59]">
                  {s.n}
                </p>
                <h3 className="mt-3 text-lg font-bold text-[#1C2B20]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.65] text-[#6B7280]">{s.body}</p>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <div id="funcionalidades">
        {FEATURES.map((f, i) => (
          <FeatureSection
            key={f.id}
            id={f.id}
            eyebrow={f.eyebrow}
            title={f.title}
            subheading={f.subheading}
            body={f.body}
            visual={f.visual}
            reversed={i % 2 === 1}
          />
        ))}
      </div>

      {/* Pricing */}
      <section id="precos" className="border-b border-[#E2E0DA] bg-[#FAFAF8] py-[100px]">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeInSection className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#6B7480] uppercase">
              Preços transparentes
            </p>
            <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[32px]">
              Simples, sem surpresas.
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {PLANS.map((p, i) => (
              <FadeInSection
                key={p.name}
                delay={i * 0.1}
                className={`relative md:col-span-4 border bg-[#FAFAF8] p-6 transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(28,43,32,0.08)] ${
                  p.highlight ? 'border-[#4A7C59]' : 'border-[#E2E0DA] hover:border-[#D0CEC8]'
                }`}
                style={p.highlight ? { boxShadow: '0 2px 12px rgba(74,124,89,0.10)' } : undefined}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FAFAF8] px-3 text-[10px] font-semibold tracking-[0.14em] text-[#4A7C59] uppercase">
                    Mais escolhido
                  </span>
                )}
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#6B7480] uppercase">
                  {p.name}
                </p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-[#6B7280]">R$</span>
                  <span className="text-4xl font-bold tracking-tight tabular-nums text-[#1C2B20]">
                    {p.price}
                  </span>
                  <span className="text-sm text-[#6B7480]">/ {p.suffix}</span>
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{p.tagline}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#1C2B20]">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={SAGE}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-1 shrink-0"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`mt-8 block py-3 text-center text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                    p.highlight
                      ? 'text-white'
                      : 'border border-[#D0CEC8] text-[#6B7280] hover:border-[#4A7C59] hover:text-[#4A7C59]'
                  }`}
                  style={p.highlight ? { backgroundColor: SAGE } : undefined}
                >
                  {p.cta}
                </Link>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      
      {/* FAQ */}
      <FaqSection />

      {/* Final CTA */}
      <section className="border-b border-[#E2E0DA] py-[100px]">
        <FadeInSection className="mx-auto max-w-[1200px] px-6 text-center">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[32px]">
            Pronto para analisar seu próximo imóvel?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.65] text-[#6B7280]">
            Sua primeira análise em 3 minutos · Sem cartão · Sem SPAM
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="px-6 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-white transition-colors"
              style={{ backgroundColor: SAGE }}
            >
              Começar análise grátis
            </Link>
            <Link
              href="/auth?tipo=agencia"
              className="border border-[#D0CEC8] px-6 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#6B7280] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
            >
              Ver demo para agências
            </Link>
          </div>
        </FadeInSection>
      </section>

      <Footer />

      <FloatingButton />
    </main>
  );
}
