import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { SavedDeal } from '@/lib/supabase/deals';
import { buildExampleDeal, EXAMPLE_DEAL_ID } from '@/lib/deals/example';

/**
 * Standard server-side loader for property workspace pages.
 * Authenticates, fetches the deal with ownership check, or short-circuits
 * with redirect/notFound. Used by every /imoveis/[id]/<section>/page.tsx.
 *
 * Special-cased `id === 'exemplo'`: returns a fully-formed in-memory example
 * deal so every user can browse the workspace exactly as it looks for a real
 * deal. The example never hits Supabase (no row exists) so write operations
 * triggered from sub-pages will fail at their own write boundary — that's
 * intentional: it's read-only on the storage layer.
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

  if (id === EXAMPLE_DEAL_ID) {
    return { deal: buildExampleDeal(), userEmail: user.email };
  }

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) notFound();

  return { deal: data as SavedDeal, userEmail: user.email };
}
