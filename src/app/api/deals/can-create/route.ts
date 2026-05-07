/**
 * GET /api/deals/can-create
 *
 * Advisory entitlement check for the deal-creation flow. The DB has a BEFORE
 * INSERT trigger that is the real enforcement (free tier capped at 3 lifetime
 * deals); this endpoint exists so the UI can:
 *   - render the "X of 3 deals used" counter for free users,
 *   - decide whether to show the upgrade modal *before* the user fills the
 *     wizard and hits a Postgres exception on save.
 *
 * Returns 402 with `{ error: 'upgrade_required' }` when the limit is hit.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canCreateDeal, getUserEntitlement } from '@/lib/entitlements';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const entitlement = await getUserEntitlement(supabase, user.id);
  if (!entitlement) {
    return NextResponse.json({ error: 'no_profile' }, { status: 500 });
  }

  const result = await canCreateDeal(supabase, entitlement);
  if (!result.allowed) {
    return NextResponse.json(
      { ...result, error: 'upgrade_required' },
      { status: 402 },
    );
  }
  return NextResponse.json(result);
}
