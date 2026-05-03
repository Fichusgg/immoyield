import type { Metadata } from 'next';
import LegalDoc, { H2, P, UL } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Termos de Uso · ImmoYield',
  description:
    'Termos e condições de uso da plataforma ImmoYield para análise de investimento imobiliário.',
};

export default function TermosDeUsoPage() {
  return (
    <LegalDoc
      eyebrow="Documento legal"
      title="Termos de Uso"
      updatedAt="03 de maio de 2026"
    >
      <P>
        Bem-vindo à ImmoYield. Estes Termos de Uso (&ldquo;Termos&rdquo;) regulam o acesso e a
        utilização da plataforma disponibilizada em immoyield.com.br (&ldquo;Plataforma&rdquo; ou
        &ldquo;Serviço&rdquo;), operada pela ImmoYield, pessoa jurídica de direito privado inscrita
        no CNPJ sob o nº XX.XXX.XXX/0001-XX (&ldquo;ImmoYield&rdquo;, &ldquo;nós&rdquo; ou
        &ldquo;nossa&rdquo;). Ao criar uma conta ou utilizar a Plataforma, você
        (&ldquo;Usuário&rdquo;) declara ter lido, compreendido e concordado integralmente com estes
        Termos.
      </P>

      <H2>1. Objeto do Serviço</H2>
      <P>
        A ImmoYield é uma ferramenta de análise e simulação de investimentos imobiliários voltada
        ao mercado brasileiro. O Serviço calcula indicadores financeiros (cap rate, fluxo de caixa,
        TIR, payback e similares) com base em parâmetros fornecidos pelo Usuário e em fontes
        públicas (BACEN SGS, portais imobiliários).
      </P>
      <P>
        <strong>A ImmoYield não é uma corretora de imóveis, instituição financeira nem consultor
        de investimentos.</strong> As informações exibidas têm caráter exclusivamente informativo
        e não constituem recomendação de compra, venda ou aluguel. Decisões de investimento são de
        responsabilidade exclusiva do Usuário.
      </P>

      <H2>2. Cadastro e conta</H2>
      <UL>
        <li>O cadastro é gratuito e exige um e-mail válido e senha pessoal e intransferível.</li>
        <li>O Usuário compromete-se a fornecer informações verdadeiras e mantê-las atualizadas.</li>
        <li>
          O Usuário é o único responsável pela guarda de suas credenciais e por todas as atividades
          realizadas em sua conta.
        </li>
        <li>
          Em caso de uso não autorizado, o Usuário deve comunicar imediatamente o suporte da
          ImmoYield.
        </li>
      </UL>

      <H2>3. Planos, pagamentos e cancelamento</H2>
      <P>
        A ImmoYield oferece um plano gratuito com limites de uso e planos pagos com recursos
        adicionais (Pro e Agência). Os preços vigentes estão publicados na página de preços e podem
        ser ajustados mediante aviso prévio.
      </P>
      <UL>
        <li>A cobrança de planos pagos é mensal ou anual, conforme escolha do Usuário.</li>
        <li>
          O cancelamento pode ser feito a qualquer momento pelo painel de configurações; o acesso
          permanece ativo até o final do ciclo de cobrança em curso.
        </li>
        <li>
          Em conformidade com o Código de Defesa do Consumidor (Lei 8.078/90), o Usuário tem direito
          de arrependimento de 7 (sete) dias corridos a contar da contratação, mediante solicitação
          ao suporte.
        </li>
      </UL>

      <H2>4. Uso aceitável</H2>
      <P>O Usuário concorda em <strong>não</strong>:</P>
      <UL>
        <li>Utilizar a Plataforma para fins ilícitos ou contrários a estes Termos;</li>
        <li>Realizar engenharia reversa, scraping massivo ou automação não autorizada;</li>
        <li>Reproduzir, comercializar ou redistribuir conteúdo da ImmoYield sem autorização;</li>
        <li>Tentar burlar limites de uso ou comprometer a segurança da Plataforma.</li>
      </UL>

      <H2>5. Propriedade intelectual</H2>
      <P>
        Todo o conteúdo, código, marca, layout e cálculos proprietários da Plataforma são de
        titularidade exclusiva da ImmoYield e protegidos pela Lei 9.279/96 e pela Lei 9.610/98. Os
        dados inseridos pelo Usuário permanecem de sua propriedade — concedendo-se à ImmoYield
        apenas a licença necessária para operar o Serviço.
      </P>

      <H2>6. Limitação de responsabilidade</H2>
      <P>
        Os cálculos e estimativas exibidos baseiam-se em premissas e dados de mercado que podem
        variar. A ImmoYield não se responsabiliza por:
      </P>
      <UL>
        <li>Decisões de investimento tomadas com base em projeções da Plataforma;</li>
        <li>Indisponibilidades temporárias decorrentes de manutenção ou caso fortuito;</li>
        <li>Conteúdo de portais imobiliários de terceiros importados via link;</li>
        <li>Variações de indicadores externos (CDI, IPCA, ITBI municipal).</li>
      </UL>
      <P>
        A responsabilidade total da ImmoYield, em qualquer hipótese, fica limitada ao valor pago
        pelo Usuário nos 12 (doze) meses anteriores ao evento que originou a reclamação.
      </P>

      <H2>7. Suspensão e encerramento</H2>
      <P>
        A ImmoYield poderá suspender ou encerrar contas que violem estes Termos, sem prejuízo de
        outras medidas cabíveis. O Usuário poderá excluir sua conta a qualquer momento pelas
        configurações da plataforma.
      </P>

      <H2>8. Alterações destes Termos</H2>
      <P>
        Estes Termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas
        por e-mail ou por aviso na Plataforma com antecedência mínima de 15 (quinze) dias. O uso
        continuado após a vigência das alterações implica aceitação.
      </P>

      <H2>9. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
        da comarca de São Paulo/SP para dirimir quaisquer controvérsias, com renúncia a qualquer
        outro, por mais privilegiado que seja.
      </P>

      <H2>10. Contato</H2>
      <P>
        Para esclarecer dúvidas sobre estes Termos, entre em contato pelo e-mail{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="mailto:contato@immoyield.com.br">
          contato@immoyield.com.br
        </a>
        .
      </P>
    </LegalDoc>
  );
}
