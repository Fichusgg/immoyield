import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { SavedDeal } from '@/lib/supabase/deals';

/**
 * Standard server-side loader for property workspace pages.
 * Authenticates, fetches the deal with ownership check, or short-circuits
 * with redirect/notFound. Used by every /imoveis/[id]/<section>/page.tsx.
 */
export async function loadDealForWorkspace(
  id: string,
  section: string
): Promise<{ deal: SavedDeal; userEmail?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/imoveis/${id}/${section}`);

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) notFound();

  return { deal: data as SavedDeal, userEmail: user.email };
}
