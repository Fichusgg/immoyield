import { describe, it, expect, vi } from 'vitest';
import {
  FREE_DEAL_LIMIT,
  canAccessCompareRent,
  canCreateDeal,
  canUseFeature,
  getUserEntitlement,
  hasTier,
  type UserEntitlement,
} from '../entitlements';

const baseUser: UserEntitlement = {
  id: 'u1',
  plan: 'free',
  subscription_status: 'free',
  stripe_customer_id: null,
  current_period_end: null,
};

function premium(overrides: Partial<UserEntitlement> = {}): UserEntitlement {
  return {
    ...baseUser,
    plan: 'premium',
    subscription_status: 'active',
    stripe_customer_id: 'cus_x',
    current_period_end: '2030-01-01T00:00:00Z',
    ...overrides,
  };
}

function fakeSupabase(count: number | null, error: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count, error, data: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  } as never;
}

describe('hasTier', () => {
  it('every user satisfies the free tier', () => {
    expect(hasTier(baseUser, 'free')).toBe(true);
    expect(hasTier(premium(), 'free')).toBe(true);
  });

  it('free user does not satisfy premium', () => {
    expect(hasTier(baseUser, 'premium')).toBe(false);
  });

  it('active premium user satisfies premium', () => {
    expect(hasTier(premium(), 'premium')).toBe(true);
  });

  it('past_due premium keeps access (Stripe retries)', () => {
    expect(hasTier(premium({ subscription_status: 'past_due' }), 'premium')).toBe(true);
  });

  it('canceled premium loses access', () => {
    expect(hasTier(premium({ subscription_status: 'canceled' }), 'premium')).toBe(false);
  });

  it('plan=premium but status=free is rejected (drift safety)', () => {
    expect(hasTier(premium({ subscription_status: 'free' }), 'premium')).toBe(false);
  });
});

describe('canAccessCompareRent / canUseFeature', () => {
  it('blocks free users', () => {
    expect(canAccessCompareRent(baseUser)).toBe(false);
    expect(canUseFeature(baseUser, 'compareRent')).toBe(false);
    expect(canUseFeature(baseUser, 'unlimitedDeals')).toBe(false);
  });

  it('allows active premium', () => {
    expect(canAccessCompareRent(premium())).toBe(true);
    expect(canUseFeature(premium(), 'compareRent')).toBe(true);
  });
});

describe('canCreateDeal', () => {
  it('premium users have no cap', async () => {
    const fromSpy = vi.fn();
    const supabase = { from: fromSpy } as never;
    const result = await canCreateDeal(supabase, premium());
    expect(result.allowed).toBe(true);
    // No DB lookup needed for premium.
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('free user with 0 deals can create', async () => {
    const result = await canCreateDeal(fakeSupabase(0), baseUser);
    expect(result).toEqual({
      allowed: true,
      used: 0,
      remaining: FREE_DEAL_LIMIT,
      limit: FREE_DEAL_LIMIT,
    });
  });

  it('free user under cap reports remaining', async () => {
    const result = await canCreateDeal(fakeSupabase(2), baseUser);
    expect(result).toEqual({
      allowed: true,
      used: 2,
      remaining: 1,
      limit: FREE_DEAL_LIMIT,
    });
  });

  it('free user at cap is blocked', async () => {
    const result = await canCreateDeal(fakeSupabase(3), baseUser);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('upgrade_required');
    expect(result.remaining).toBe(0);
  });

  it('free user over cap is blocked (defensive — DB trigger should also stop)', async () => {
    const result = await canCreateDeal(fakeSupabase(5), baseUser);
    expect(result.allowed).toBe(false);
  });

  it('null count from supabase is treated as zero', async () => {
    const result = await canCreateDeal(fakeSupabase(null), baseUser);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
  });

  it('count error fails closed', async () => {
    const result = await canCreateDeal(fakeSupabase(null, new Error('boom')), baseUser);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('upgrade_required');
  });
});

describe('getUserEntitlement', () => {
  it('returns null when row missing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as never;
    expect(await getUserEntitlement(supabase, 'u1')).toBeNull();
  });

  it('returns row when present', async () => {
    const row = premium();
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      }),
    } as never;
    expect(await getUserEntitlement(supabase, 'u1')).toEqual(row);
  });
});
