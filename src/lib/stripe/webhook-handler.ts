import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pure-ish webhook event handler. Extracted so it can be unit-tested with a
 * fake admin client and Stripe fixture events. The HTTP route does signature
 * verification and idempotency; this file owns the *what to do* per event.
 *
 * Subscription state precedence:
 *   - active / trialing            → plan='premium', status='active'
 *   - past_due / unpaid            → plan='premium', status='past_due'
 *   - canceled / incomplete_expired→ plan='free',    status='canceled'
 *   - everything else (incomplete) → leave as-is, log for manual review
 */

type SubStatus = 'free' | 'active' | 'past_due' | 'canceled';
type Plan = 'free' | 'premium';

function mapSubscriptionStatus(s: Stripe.Subscription.Status): { plan: Plan; status: SubStatus } | null {
  switch (s) {
    case 'active':
    case 'trialing':
      return { plan: 'premium', status: 'active' };
    case 'past_due':
    case 'unpaid':
      return { plan: 'premium', status: 'past_due' };
    case 'canceled':
    case 'incomplete_expired':
      return { plan: 'free', status: 'canceled' };
    default:
      return null;
  }
}

async function findUserId(
  admin: SupabaseClient,
  customerId: string,
  metadataUserId: string | null | undefined,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  const { data } = await admin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function applySubscriptionState(
  admin: SupabaseClient,
  userId: string,
  customerId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const mapped = mapSubscriptionStatus(sub.status);
  if (!mapped) {
    console.warn('[stripe.webhook] ignoring subscription state', {
      userId,
      status: sub.status,
    });
    return;
  }

  // Stripe subscriptions expose period end on items; first item is fine for
  // single-price subscriptions like ours.
  const periodEnd =
    sub.items?.data?.[0]?.current_period_end ??
    // Fallback for older API shapes / legacy fixtures.
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;

  const { error } = await admin
    .from('users')
    .update({
      plan: mapped.plan,
      subscription_status: mapped.status,
      stripe_customer_id: customerId,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('id', userId);

  if (error) {
    console.error('[stripe.webhook] update failed', { userId, error });
    throw error;
  }
}

export async function handleStripeEvent(
  admin: SupabaseClient,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (!userId || !customerId) {
        console.warn('[stripe.webhook] checkout.session.completed missing ids', {
          userId,
          customerId,
        });
        return;
      }
      // Persist customer mapping immediately. Subscription state will arrive
      // via customer.subscription.* events; if the subscription is already on
      // the session object, apply it now too.
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (subId) {
        // We need the full subscription to map status — caller passes a Stripe
        // client through the route handler when calling us in production. In
        // the webhook route we just wait for customer.subscription.updated to
        // follow with full data; updating customer id here is enough.
      }
      const { error } = await admin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
      if (error) throw error;
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const metaUserId = sub.metadata?.supabase_user_id ?? null;
      const userId = await findUserId(admin, customerId, metaUserId);
      if (!userId) {
        console.warn('[stripe.webhook] no user for customer', { customerId });
        return;
      }
      await applySubscriptionState(admin, userId, customerId, sub);
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) return;
      const userId = await findUserId(admin, customerId, null);
      if (!userId) return;
      // Stripe will follow with customer.subscription.updated reflecting the
      // new status; we just log here so dashboards show the failure.
      console.warn('[stripe.webhook] invoice.payment_failed', { userId, customerId });
      return;
    }

    default:
      // Ignore other event types (we don't subscribe to them in production).
      return;
  }
}
