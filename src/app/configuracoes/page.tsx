import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/layout/TopNav';
import ConfiguracoesContent from '@/components/settings/ConfiguracoesContent';

export const metadata = {
  title: 'Configurações · ImmoYield',
};

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/configuracoes');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1">
        <ConfiguracoesContent
          userEmail={user.email ?? ''}
          createdAt={user.created_at}
        />
      </main>
    </div>
  );
}
