'use client';

import { createClient } from '@/lib/supabase/client';
import type { SavedDeal } from '@/lib/supabase/deals';

/**
 * Patches a row in the `deals` table for the property workspace edit flows.
 * Returns the updated row. RLS enforces ownership; we still scope by id.
 */
export async function patchDeal(
  id: string,
  patch: Partial<SavedDeal>
): Promise<SavedDeal> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deals')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SavedDeal;
}
