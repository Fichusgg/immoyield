import { describe, it, expect } from 'vitest';
import type Stripe from 'stripe';
import { handleStripeEvent } from '../webhook-handler';

interface UpdateRow {
  table: string;
  match: Record<string, unknown>;
  values: Record<string, unknown>;
}

function fakeAdmin() {
  const updates: UpdateRow[] = [];
  const lookups: { table: string; col: string; value: unknown }[] = [];

  const admin = {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            eq: (col: string, value: unknown) => {
              updates.push({ table, match: { [col]: value }, values });
              return Promise.resolve({ error: null });
            },
          };
        },
        select() {
          return {
            eq: (col: string, value: unknown) => {
              lookups.push({ table, col, value });
              return {
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              };
            },
          };
        },
      };
    },
  };

  return { admin: admin as never, updates, lookups };
}

function event<T extends string>(type: T, data: object): Stripe.Event {
  return {
    id: `evt_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: { object: data },
  } as unknown as Stripe.Event;
}

describe('handleStripeEvent — checkout.session.completed', () => {
  it('persists customer id when client_reference_id is present', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(
      admin,
      event('checkout.session.completed', {
        client_reference_id: 'user_123',
        customer: 'cus_abc',
        subscription: null,
      }),
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      table: 'users',
      match: { id: 'user_123' },
      values: { stripe_customer_id: 'cus_abc' },
    });
  });

  it('falls back to metadata.supabase_user_id when client_reference_id missing', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(
      admin,
      event('checkout.session.completed', {
        client_reference_id: null,
        customer: 'cus_xyz',
        metadata: { supabase_user_id: 'user_meta' },
      }),
    );
    expect(updates[0].match).toEqual({ id: 'user_meta' });
  });

  it('skips when both ids missing', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(
      admin,
      event('checkout.session.completed', {
        client_reference_id: null,
        customer: null,
      }),
    );
    expect(updates).toHaveLength(0);
  });
});

describe('handleStripeEvent — subscription updates', () => {
  function subEvent(type: string, status: Stripe.Subscription.Status) {
    return event(type, {
      customer: 'cus_abc',
      status,
      metadata: { supabase_user_id: 'user_123' },
      items: {
        data: [{ current_period_end: 1893456000 }], // 2030-01-01
      },
    });
  }

  it('active → premium/active', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, subEvent('customer.subscription.updated', 'active'));
    expect(updates[0].values).toMatchObject({
      plan: 'premium',
      subscription_status: 'active',
      stripe_customer_id: 'cus_abc',
    });
  });

  it('trialing maps to active', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, subEvent('customer.subscription.updated', 'trialing'));
    expect(updates[0].values.subscription_status).toBe('active');
  });

  it('past_due → premium/past_due (keep access while Stripe retries)', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, subEvent('customer.subscription.updated', 'past_due'));
    expect(updates[0].values).toMatchObject({
      plan: 'premium',
      subscription_status: 'past_due',
    });
  });

  it('canceled → free/canceled', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, subEvent('customer.subscription.deleted', 'canceled'));
    expect(updates[0].values).toMatchObject({
      plan: 'free',
      subscription_status: 'canceled',
    });
  });

  it('incomplete state is ignored (no DB write)', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, subEvent('customer.subscription.updated', 'incomplete'));
    expect(updates).toHaveLength(0);
  });

  it('looks up user via stripe_customer_id when metadata is missing', async () => {
    const { admin, lookups, updates } = fakeAdmin();
    const evt = event('customer.subscription.updated', {
      customer: 'cus_no_meta',
      status: 'active' as const,
      metadata: {},
      items: { data: [{ current_period_end: 1893456000 }] },
    });
    await handleStripeEvent(admin, evt);
    expect(lookups).toEqual([
      { table: 'users', col: 'stripe_customer_id', value: 'cus_no_meta' },
    ]);
    // No user found in our fake → no update.
    expect(updates).toHaveLength(0);
  });
});

describe('handleStripeEvent — invoice.payment_failed', () => {
  it('does not write (logged only; sub.updated will follow)', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(
      admin,
      event('invoice.payment_failed', { customer: 'cus_abc' }),
    );
    expect(updates).toHaveLength(0);
  });
});

describe('handleStripeEvent — unknown event types', () => {
  it('is a no-op', async () => {
    const { admin, updates } = fakeAdmin();
    await handleStripeEvent(admin, event('product.created', {}));
    expect(updates).toHaveLength(0);
  });
});
