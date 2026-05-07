import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  FREE_DEAL_LIMIT,
  canCreateDeal,
  getUserEntitlement,
} from '@/lib/entitlements';

/**
 * Server-rendered banner shown to free-tier users on the properties dashboard.
 * Renders nothing for premium users or when the user can't be resolved.
 */
export async function DealQuotaBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ent = await getUserEntitlement(supabase, user.id);
  if (!ent || ent.plan === 'premium') return null;

  const check = await canCreateDeal(supabase, ent);
  const used = check.used ?? 0;
  const limit = check.limit ?? FREE_DEAL_LIMIT;
  const remaining = check.remaining ?? Math.max(0, limit - used);
  const exhausted = !check.allowed;

  return (
    <div
      className={
        'mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-md border px-4 py-2 text-sm ' +
        (exhausted
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-primary/20 bg-primary/5')
      }
      role="status"
    >
      <span className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        {exhausted ? (
          <>Você usou {used} de {limit} análises gratuitas. Faça upgrade para continuar.</>
        ) : (
          <>{used} de {limit} análises gratuitas usadas · {remaining} restantes</>
        )}
      </span>
      <Link
        href="/precos"
        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        Fazer upgrade
      </Link>
    </div>
  );
}
