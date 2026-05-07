import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { getUserEntitlement } from '@/lib/entitlements';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const ent = await getUserEntitlement(supabase, user.id);
  if (!ent?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_customer' }, { status: 400 });
  }

  const stripe = getStripe();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: ent.stripe_customer_id,
    return_url: `${origin}/precos`,
  });

  return NextResponse.json({ url: session.url });
}
