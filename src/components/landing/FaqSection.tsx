'use client';

import { useState } from 'react';
import FadeInSection from './FadeInSection';

const SAGE = '#4A7C59';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'O que é a ImmoYield?',
    a: 'É uma calculadora online de investimento imobiliário para o mercado brasileiro. Você cola um link de anúncio (ZAP, VivaReal, QuintoAndar) ou preenche os dados manualmente e recebe yield líquido, fluxo de caixa, TIR e payback — tudo calibrado com a tributação e o CDI brasileiros.',
  },
  {
    q: 'Para quem a ImmoYield foi feita?',
    a: 'Investidores individuais que avaliam vários imóveis por mês, corretores que precisam justificar números a clientes, e agências que querem entregar relatórios profissionais. Se você usa planilha de Excel para underwriting de imóveis, a ImmoYield substitui esse processo.',
  },
  {
    q: 'Como funciona o plano gratuito?',
    a: 'O plano Free permite até 5 análises por mês, com PDFs com a marca ImmoYield e compartilhamento por link. Sem cartão de crédito. Quando precisar de mais, você pode migrar para o Pro (R$ 39/mês) com análises ilimitadas.',
  },
  {
    q: 'De onde vêm os dados dos imóveis?',
    a: 'Quando você cola um link, normalizamos os dados do anúncio público (endereço, área, preço, fotos). Para cálculos macro, usamos o CDI publicado pelo Banco Central via SGS, atualizado semanalmente. Tributação (IR sobre aluguel, ITBI municipal) é configurável por imóvel.',
  },
  {
    q: 'Os cálculos são confiáveis?',
    a: 'Toda fórmula é auditável até a linha — clicar em qualquer KPI mostra como ele foi calculado. Os defaults são calibrados para o mercado brasileiro (vacância 8%, manutenção 1%/ano, condomínio padrão por região), mas você pode ajustar tudo. A ImmoYield não compra, vende nem recomenda imóveis: apenas calculamos.',
  },
  {
    q: 'Meus dados ficam privados?',
    a: 'Sim. Suas análises são privadas por padrão e ficam atreladas à sua conta. Você decide quando compartilhar (por link público) ou exportar (PDF). Não vendemos dados a terceiros e seguimos os princípios da LGPD. Veja a Política de Privacidade para detalhes.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. O cancelamento é feito direto pelas configurações da plataforma e tem efeito ao final do ciclo em curso. Sem multa, sem fidelidade.',
  },
  {
    q: 'Vocês cobrem todas as cidades do Brasil?',
    a: 'A análise financeira funciona para qualquer imóvel no Brasil. Importação automática hoje cobre os principais portais nacionais (ZAP, VivaReal, QuintoAndar, ImovelWeb, OLX). Para imóveis fora desses portais, o preenchimento manual leva poucos minutos.',
  },
  {
    q: 'Tem suporte em português?',
    a: 'Toda a plataforma é em português brasileiro. Suporte por e-mail no plano Free e prioritário no Pro. Planos Agência incluem onboarding dedicado.',
  },
];

interface FaqItemProps {
  index: number;
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}

function FaqItem({ index, q, a, open, onToggle }: FaqItemProps) {
  const id = `faq-panel-${index}`;
  return (
    <div className="border-b border-[#E2E0DA]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-[#1C2B20]"
      >
        <span className="text-[15px] font-semibold text-[#1C2B20] md:text-base">{q}</span>
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center border transition-all duration-200 ${
            open
              ? 'rotate-45 border-[#4A7C59] text-[#4A7C59]'
              : 'border-[#D0CEC8] text-[#9CA3AF]'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        id={id}
        role="region"
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-[15px] leading-[1.7] text-[#6B7280]">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-b border-[#E2E0DA] py-[100px]">
      <div className="mx-auto max-w-[860px] px-6">
        <FadeInSection className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
            Perguntas frequentes
          </p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[32px]">
            Antes de começar, talvez você queira saber.
          </h2>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <div className="border-t border-[#E2E0DA]">
            {FAQS.map((f, i) => (
              <FaqItem
                key={f.q}
                index={i}
                q={f.q}
                a={f.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </FadeInSection>

        <FadeInSection delay={0.2} className="mt-10 text-center">
          <p className="text-sm text-[#6B7280]">
            Não achou sua dúvida?{' '}
            <a
              href="mailto:contato@immoyield.com.br"
              className="font-semibold underline transition-colors"
              style={{ color: SAGE }}
            >
              Fale com a gente
            </a>
            .
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}
