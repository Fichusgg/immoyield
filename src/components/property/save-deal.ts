'use client';

import { createClient } from '@/lib/supabase/client';
import type { SavedDeal } from '@/lib/supabase/deals';

/**
 * Patches a row in the `deals` table for the property workspace edit flows.
 * Returns the updated row. RLS enforces ownership; we still scope by id.
 *
 * Wraps Supabase's PostgrestError (a plain object, not an Error instance) in
 * a real Error so that `e instanceof Error` works in callers and the toast
 * surface the actual database message instead of a generic fallback.
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

  if (error) {
    // PostgrestError shape: { message, code, details, hint }
    const parts = [error.message, error.details, error.hint]
      .filter(Boolean)
      .join(' · ');
    const wrapped = new Error(parts || 'Erro desconhecido ao salvar');
    // Tag for telemetry / debugging in the console
    (wrapped as Error & { code?: string }).code = error.code;
    console.error('[patchDeal] Supabase error', {
      id,
      patch,
      error,
    });
    throw wrapped;
  }
  return data as SavedDeal;
}
