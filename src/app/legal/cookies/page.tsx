import type { Metadata } from 'next';
import LegalDoc, { H2, P, UL } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Política de Cookies · ImmoYield',
  description:
    'Como a ImmoYield utiliza cookies e tecnologias semelhantes para autenticação, preferências e métricas.',
};

export default function PoliticaCookiesPage() {
  return (
    <LegalDoc
      eyebrow="Documento legal"
      title="Política de Cookies"
      updatedAt="03 de maio de 2026"
    >
      <P>
        Esta Política explica o que são cookies, como a ImmoYield os utiliza e como você pode
        gerenciá-los. Ela complementa nossa{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="/legal/privacidade">
          Política de Privacidade
        </a>
        .
      </P>

      <H2>1. O que são cookies?</H2>
      <P>
        Cookies são pequenos arquivos de texto armazenados pelo navegador quando você acessa um
        site. Eles permitem reconhecer seu dispositivo em visitas subsequentes, manter a sessão
        autenticada e personalizar a experiência.
      </P>

      <H2>2. Quais cookies utilizamos?</H2>
      <P>
        <strong>Cookies essenciais</strong> — necessários para o funcionamento da Plataforma, não
        podem ser desativados:
      </P>
      <UL>
        <li>Autenticação de sessão (Supabase Auth);</li>
        <li>Token CSRF para proteção contra ataques de origem cruzada;</li>
        <li>Preferências de interface (tema, idioma, moeda).</li>
      </UL>

      <P>
        <strong>Cookies de desempenho</strong> — métricas agregadas de uso, sem identificação
        individual:
      </P>
      <UL>
        <li>Telemetria anônima de erros e latência;</li>
        <li>Estatísticas agregadas de páginas visitadas.</li>
      </UL>

      <P>
        <strong>Cookies de terceiros</strong> — definidos por parceiros estritamente necessários:
      </P>
      <UL>
        <li>Stripe — para processamento de pagamentos;</li>
        <li>Vercel Analytics — métricas anônimas de desempenho.</li>
      </UL>

      <H2>3. Como gerenciar cookies?</H2>
      <P>
        A maioria dos navegadores permite controlar cookies pelas configurações. Você pode:
      </P>
      <UL>
        <li>Aceitar ou recusar cookies;</li>
        <li>Excluir cookies armazenados;</li>
        <li>Configurar alertas antes da gravação de novos cookies.</li>
      </UL>
      <P>
        Observe que desabilitar cookies essenciais pode prejudicar funcionalidades como login e
        salvamento de análises.
      </P>

      <H2>4. Não rastreamos publicidade</H2>
      <P>
        A ImmoYield <strong>não utiliza cookies para publicidade direcionada</strong> nem
        compartilha dados com redes de anúncios. Métricas internas servem apenas para melhorar o
        produto.
      </P>

      <H2>5. Atualizações</H2>
      <P>
        Esta Política poderá ser atualizada para refletir mudanças nas tecnologias que utilizamos
        ou na legislação. Mudanças serão comunicadas com antecedência razoável.
      </P>

      <H2>6. Contato</H2>
      <P>
        Para qualquer dúvida sobre cookies, escreva para{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="mailto:dpo@immoyield.com.br">
          dpo@immoyield.com.br
        </a>
        .
      </P>
    </LegalDoc>
  );
}
