import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import { ComingSoonPanel } from '@/components/property/ComingSoonPanel';
import { PageHeader } from '@/components/property/PageHeader';

export default async function BuscarImoveisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/buscar-imoveis');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
          <PageHeader
            title="Buscar Imóveis"
            helper="Pesquise imóveis à venda em portais brasileiros — VivaReal, Zap, QuintoAndar — e importe direto para a sua análise."
          />
          <ComingSoonPanel
            title="Buscador de Imóveis"
            description="Em breve você poderá buscar e filtrar imóveis à venda direto do ImmoYield, sem precisar abrir cada portal."
          />
        </div>
      </main>
    </div>
  );
}
