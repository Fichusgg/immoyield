/**
 * Fix 2 — Edit deal page.
 *
 * Server component: authenticates the user, fetches the deal (with ownership
 * check), then passes the data to the client DealForm in "edit" mode.
 * DealForm pre-fills every field and calls a Supabase UPDATE on submission.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import TopNav from '@/components/layout/TopNav';
import { DealForm } from '@/components/deals/DealForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDealPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth?next=/imoveis/${id}/edit`);

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // RLS redundancy — ensures no cross-user access
    .single();

  if (error || !deal) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <TopNav userEmail={user.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-6 py-10">
          <DealForm mode="edit" initialDeal={deal} />
        </div>
      </main>
    </div>
  );
}
