import Link from 'next/link';

const SAGE = '#4A7C59';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Como funciona', href: '/#como-funciona' },
      { label: 'Funcionalidades', href: '/#funcionalidades' },
      { label: 'Preços', href: '/#precos' },
      { label: 'Perguntas frequentes', href: '/#faq' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Quem somos', href: '/#funcionalidades' },
      { label: 'Metodologia', href: '/#funcionalidades' },
      { label: 'Contato', href: 'mailto:contato@immoyield.com.br' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Central de ajuda', href: '/ajuda' },
      { label: 'Documentação', href: '/ajuda' },
      { label: 'Status', href: '/ajuda' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de uso', href: '/legal/termos' },
      { label: 'Política de privacidade', href: '/legal/privacidade' },
      { label: 'Política de cookies', href: '/legal/cookies' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#FAFAF8]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-3 md:grid-cols-5">
        <div className="col-span-2 sm:col-span-3 md:col-span-1">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center text-xs font-black text-white"
              style={{ backgroundColor: SAGE }}
            >
              I
            </span>
            <span className="font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-[#9CA3AF]">
            Calculadora de investimento imobiliário para o mercado brasileiro.
          </p>
          <p className="mt-4 font-mono text-[10px] text-[#9CA3AF]">
            contato@immoyield.com.br
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              {col.title}
            </p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-xs text-[#6B7280] transition-colors hover:text-[#1C2B20]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E2E0DA]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-4 text-[10px] leading-relaxed text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} ImmoYield. CNPJ XX.XXX.XXX/0001-XX. CDI: fonte BACEN SGS, atualizado
            semanalmente.
          </p>
          <p className="sm:max-w-md sm:text-right">
            Cálculos para fins informativos — ImmoYield não compra, vende nem recomenda imóveis e
            não presta consultoria de investimento.
          </p>
        </div>
      </div>
    </footer>
  );
}
