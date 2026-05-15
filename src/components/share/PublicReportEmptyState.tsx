import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

interface Props {
  dealName: string;
  updatedAt: string;
}

export default function PublicReportEmptyState({ dealName, updatedAt }: Props) {
  const formatted = new Date(updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <header className="border-b border-[#E2E0DA] bg-[#FAFAF8]">
        <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
              I
            </div>
            <span className="font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
          </Link>
          <Link
            href="/auth"
            className="bg-[#4A7C59] px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
          >
            Analisar meu imóvel →
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[40rem] flex-col items-center px-4 py-24 text-center md:px-6">
        <div className="mb-6 flex h-14 w-14 items-center justify-center bg-[#F0EFEB] text-[#6B7480]">
          <FileQuestion size={26} />
        </div>
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
          Análise não disponível
        </p>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#1C2B20] md:text-3xl">
          {dealName}
        </h1>
        <p className="mb-8 max-w-[28rem] text-sm leading-relaxed text-[#6B7280]">
          O proprietário ainda não rodou uma análise financeira completa neste imóvel, então não há
          relatório de investimento para mostrar aqui.
        </p>
        <p className="mb-8 font-mono text-[11px] text-[#6B7480]">Atualizado em {formatted}</p>
        <Link
          href="/auth"
          className="bg-[#4A7C59] px-5 py-2.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#3D6B4F]"
        >
          Criar minha própria análise →
        </Link>
      </main>
    </div>
  );
}
