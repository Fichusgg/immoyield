import type { Metadata } from 'next';
import LegalDoc, { H2, P, UL } from '@/components/legal/LegalDoc';

export const metadata: Metadata = {
  title: 'Política de Privacidade · ImmoYield',
  description:
    'Como a ImmoYield coleta, usa e protege seus dados pessoais em conformidade com a LGPD.',
};

export default function PoliticaPrivacidadePage() {
  return (
    <LegalDoc
      eyebrow="Documento legal"
      title="Política de Privacidade"
      updatedAt="03 de maio de 2026"
    >
      <P>
        A ImmoYield (CNPJ XX.XXX.XXX/0001-XX) leva sua privacidade a sério. Esta Política descreve
        como coletamos, utilizamos, compartilhamos e protegemos seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD) e demais normas
        aplicáveis.
      </P>

      <H2>1. Quem é o controlador dos dados?</H2>
      <P>
        A ImmoYield atua como <strong>controladora</strong> dos dados pessoais coletados na
        Plataforma. Nosso encarregado de proteção de dados (DPO) pode ser contatado pelo e-mail{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="mailto:dpo@immoyield.com.br">
          dpo@immoyield.com.br
        </a>
        .
      </P>

      <H2>2. Dados que coletamos</H2>
      <P>Coletamos apenas o necessário para operar o Serviço:</P>
      <UL>
        <li>
          <strong>Cadastrais:</strong> nome, e-mail e senha (criptografada).
        </li>
        <li>
          <strong>De uso:</strong> análises criadas, imóveis salvos, parâmetros de simulação.
        </li>
        <li>
          <strong>Técnicos:</strong> endereço IP, agente do navegador, logs de acesso e erros — usados
          para segurança e diagnóstico.
        </li>
        <li>
          <strong>De pagamento:</strong> processados exclusivamente por gateway parceiro (Stripe);
          a ImmoYield não armazena números de cartão.
        </li>
      </UL>

      <H2>3. Bases legais e finalidades</H2>
      <P>Tratamos seus dados com base nas seguintes hipóteses da LGPD (art. 7º):</P>
      <UL>
        <li>
          <strong>Execução de contrato</strong> — para autenticá-lo, prestar o Serviço e processar
          pagamentos;
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> — emissão de notas fiscais e atendimento
          a autoridades;
        </li>
        <li>
          <strong>Legítimo interesse</strong> — segurança da Plataforma, prevenção a fraudes e
          melhoria do produto;
        </li>
        <li>
          <strong>Consentimento</strong> — comunicações de marketing, quando aplicável (com opção de
          descadastro).
        </li>
      </UL>

      <H2>4. Compartilhamento de dados</H2>
      <P>
        Não vendemos seus dados. Compartilhamos apenas com operadores estritamente necessários:
      </P>
      <UL>
        <li>Provedores de infraestrutura em nuvem (Vercel, Supabase);</li>
        <li>Gateway de pagamentos (Stripe);</li>
        <li>Ferramentas de e-mail transacional;</li>
        <li>Autoridades públicas, mediante requisição legal.</li>
      </UL>
      <P>
        Todos os operadores são contratualmente obrigados a tratar dados conforme a LGPD e padrões
        equivalentes de segurança.
      </P>

      <H2>5. Retenção</H2>
      <P>
        Mantemos seus dados pelo tempo necessário às finalidades descritas, ou conforme exigido por
        lei (por exemplo, 5 anos para registros fiscais). Após a exclusão da conta, dados pessoais
        são eliminados em até 30 dias, salvo obrigação legal de retenção.
      </P>

      <H2>6. Seus direitos como titular</H2>
      <P>Em conformidade com o art. 18 da LGPD, você pode, a qualquer momento, solicitar:</P>
      <UL>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
        <li>Portabilidade a outro fornecedor;</li>
        <li>Eliminação dos dados tratados com seu consentimento;</li>
        <li>Informação sobre compartilhamentos;</li>
        <li>Revogação do consentimento.</li>
      </UL>
      <P>
        Para exercer qualquer direito, escreva para{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="mailto:dpo@immoyield.com.br">
          dpo@immoyield.com.br
        </a>
        . Responderemos em até 15 dias.
      </P>

      <H2>7. Segurança</H2>
      <P>
        Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia em
        trânsito (TLS) e em repouso, controle de acesso por papel, registros de auditoria,
        treinamento de equipe e processos de resposta a incidentes. Em caso de incidente que possa
        gerar risco relevante, comunicaremos os titulares afetados e a ANPD nos prazos legais.
      </P>

      <H2>8. Cookies e tecnologias similares</H2>
      <P>
        Utilizamos cookies para autenticação, preferências e métricas agregadas. Detalhes completos
        estão na nossa{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="/legal/cookies">
          Política de Cookies
        </a>
        .
      </P>

      <H2>9. Crianças e adolescentes</H2>
      <P>
        A Plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de
        menores. Caso identifiquemos cadastro irregular, a conta será removida.
      </P>

      <H2>10. Transferência internacional</H2>
      <P>
        Alguns provedores podem operar fora do Brasil. Nesses casos, garantimos que a transferência
        ocorra apenas para países com nível adequado de proteção ou mediante cláusulas contratuais
        específicas, conforme art. 33 da LGPD.
      </P>

      <H2>11. Atualizações desta política</H2>
      <P>
        Esta Política pode ser revisada periodicamente. Mudanças relevantes serão comunicadas por
        e-mail ou aviso na Plataforma com antecedência mínima de 15 dias.
      </P>

      <H2>12. Autoridade Nacional de Proteção de Dados (ANPD)</H2>
      <P>
        Caso entenda que seus direitos não foram adequadamente atendidos, você poderá apresentar
        reclamação à ANPD pelo site{' '}
        <a className="font-semibold text-[#4A7C59] hover:underline" href="https://www.gov.br/anpd" target="_blank" rel="noreferrer noopener">
          gov.br/anpd
        </a>
        .
      </P>
    </LegalDoc>
  );
}
