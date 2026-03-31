import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DealList from '@/components/dashboard/DealList';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default async function MeusNegociosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  return (
    <SidebarLayout userEmail={user.email}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">Meus Negócios</h1>
            <p className="mt-1 text-sm text-[#737373]">Todos os deals salvos na sua conta.</p>
          </div>
          <Link
            href="/analisar"
            className="rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
          >
            + Nova análise
          </Link>
        </div>
        <DealList />
      </div>
    </SidebarLayout>
  );
}
