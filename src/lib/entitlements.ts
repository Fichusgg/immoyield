/**
 * Entitlements — single source of truth for feature gating.
 *
 * Routes and components MUST import from here, never re-implement gating
 * logic inline. Gating decisions stay aligned across the app, and adding a
 * new gated feature is one entry in FEATURES + one helper.
 *
 * Server-side enforcement is mandatory (a 402 with `error: 'upgrade_required'`).
 * Client-side checks are advisory only — used to render the UI but never to
 * grant access.
 */

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type Tier = 'free' | 'premium';
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled';

export interface UserEntitlement {
  id: string;
  plan: Tier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

export const FREE_DEAL_LIMIT = 3;

/**
 * The gated-feature registry. Add new keys here when a new feature needs
 * gating; consumers branch on FEATURES[key].requiresTier rather than hardcoding
 * tier checks.
 */
export const FEATURES = {
  compareRent: { requiresTier: 'premium' as Tier, label: 'Comparativo de aluguel' },
  unlimitedDeals: { requiresTier: 'premium' as Tier, label: 'Análises ilimitadas' },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function hasTier(user: UserEntitlement, required: Tier): boolean {
  if (required === 'free') return true;
  // Premium requires a paid plan AND an active-ish subscription. We treat
  // 'past_due' as still entitled (Stripe will retry; we don't yank access on
  // the first failed charge) but 'canceled' is not.
  return (
    user.plan === 'premium' &&
    (user.subscription_status === 'active' || user.subscription_status === 'past_due')
  );
}

export function canUseFeature(user: UserEntitlement, key: FeatureKey): boolean {
  return hasTier(user, FEATURES[key].requiresTier);
}

export function canAccessCompareRent(user: UserEntitlement): boolean {
  return canUseFeature(user, 'compareRent');
}

export interface DealCreationCheck {
  allowed: boolean;
  reason?: 'upgrade_required';
  remaining?: number;
  used?: number;
  limit?: number;
}

/**
 * Free tier: 3 lifetime deals (counted from existing rows). Premium: unlimited.
 *
 * The DB also enforces this via a BEFORE INSERT trigger on `deals`, so this
 * function is for *advisory* checks (route-handler 402, UI counters). The DB
 * is the ultimate source of truth.
 */
export async function canCreateDeal(
  supabase: SupabaseClient,
  user: UserEntitlement,
): Promise<DealCreationCheck> {
  if (canUseFeature(user, 'unlimitedDeals')) {
    return { allowed: true };
  }

  const { count, error } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) {
    // Fail closed: if we can't count, treat as not allowed rather than letting
    // a free user bypass the cap. The trigger will catch it anyway.
    return { allowed: false, reason: 'upgrade_required', used: 0, limit: FREE_DEAL_LIMIT };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, FREE_DEAL_LIMIT - used);
  if (used >= FREE_DEAL_LIMIT) {
    return { allowed: false, reason: 'upgrade_required', used, remaining: 0, limit: FREE_DEAL_LIMIT };
  }
  return { allowed: true, used, remaining, limit: FREE_DEAL_LIMIT };
}

/**
 * Loads the entitlement row for the authenticated user. Returns null if the
 * user row is missing (the auth.users → public.users trigger should prevent
 * this, but we guard against drift).
 */
export async function getUserEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserEntitlement | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, plan, subscription_status, stripe_customer_id, current_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserEntitlement;
}
