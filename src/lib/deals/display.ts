import type { SavedDeal } from '@/lib/supabase/deals';

export function getDealDisplayTitle(
  deal: Pick<SavedDeal, 'title' | 'inputs'>,
  fallback = 'Imóvel sem nome'
): string {
  const fromInputs = typeof deal.inputs?.name === 'string' ? deal.inputs.name.trim() : '';
  if (fromInputs) return fromInputs;

  const fromTitle = typeof deal.title === 'string' ? deal.title.trim() : '';
  if (fromTitle) return fromTitle;

  return fallback;
}

