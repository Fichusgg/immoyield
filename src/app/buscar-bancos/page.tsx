import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import { ComingSoonPanel } from '@/components/property/ComingSoonPanel';
import { PageHeader } from '@/components/property/PageHeader';

export default async function BuscarBancosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/buscar-bancos');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
          <PageHeader
            title="Buscar Bancos"
            helper="Compare condições de financiamento entre Caixa, Itaú, Santander, Bradesco e bancos digitais — taxas, prazos e SFH."
          />
          <ComingSoonPanel
            title="Comparador de Bancos"
            description="Em breve você poderá comparar taxas e modalidades (SFH, SFI, MCMV) entre os principais bancos brasileiros e simular cenários de financiamento."
          />
        </div>
      </main>
    </div>
  );
}
