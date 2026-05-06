import Link from 'next/link';

interface Props {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalDoc({ eyebrow, title, updatedAt, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Voltar para o site
      </Link>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-900">
        <strong className="font-semibold">[REVIEW NEEDED]</strong> Este documento usa
        marcadores genéricos (CNPJ, endereço, contatos do DPO) e <em>ainda não foi
        revisado por advogado</em>. Trate como rascunho LGPD-aderente até validação
        jurídica antes do lançamento público.
      </div>

      <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
        {eyebrow}
      </p>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#1C2B20] md:text-[36px]">
        {title}
      </h1>
      <p className="mt-3 font-mono text-xs text-[#9CA3AF]">
        Última atualização: {updatedAt}
      </p>

      <div className="legal-prose mt-10 space-y-8 text-[15px] leading-[1.7] text-[#3F4A45]">
        {children}
      </div>

      <div className="mt-16 border-t border-[#E2E0DA] pt-6 text-xs text-[#9CA3AF]">
        Dúvidas sobre este documento?{' '}
        <a
          href="mailto:contato@immoyield.com.br"
          className="font-semibold text-[#4A7C59] hover:underline"
        >
          contato@immoyield.com.br
        </a>
      </div>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 mb-3 text-[20px] font-bold tracking-tight text-[#1C2B20]">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-[16px] font-semibold text-[#1C2B20]">{children}</h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.7] text-[#3F4A45]">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-[15px] leading-[1.7] text-[#3F4A45]">{children}</ul>;
}
