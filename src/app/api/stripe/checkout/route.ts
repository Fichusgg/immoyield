import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, getPremiumPriceId } from '@/lib/stripe/server';
import { getUserEntitlement } from '@/lib/entitlements';

export const runtime = 'nodejs';

function getOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const stripe = getStripe();
  const priceId = getPremiumPriceId();
  const origin = getOrigin();

  const ent = await getUserEntitlement(supabase, user.id);
  const customerId = ent?.stripe_customer_id ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer: customerId,
    customer_email: customerId ? undefined : user.email ?? undefined,
    success_url: `${origin}/precos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/precos`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    metadata: { supabase_user_id: user.id },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}
