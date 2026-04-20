import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import DealDetailView from '@/components/deals/DealDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/imoveis/${id}`);

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !deal) notFound();

  return (
    <div className="flex h-dvh flex-col bg-[#F8F7F4]">
      <TopNav
        userEmail={user.email}
        breadcrumb={[{ label: 'Propriedades', href: '/propriedades' }, { label: deal.title ?? 'Imóvel' }]}
      />
      <main className="min-h-0 flex-1 overflow-y-auto p-8">
        <DealDetailView deal={deal} />
      </main>
    </div>
  );
}
