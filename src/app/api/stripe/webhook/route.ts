import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getWebhookSecret } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleStripeEvent } from '@/lib/stripe/webhook-handler';

export const runtime = 'nodejs';
// Stripe verifies the signature against the *raw* body; do not let Next parse it.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('missing signature', { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    return new NextResponse(`signature verification failed: ${message}`, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: insert the event id; if it already exists, skip.
  const { error: dedupErr } = await admin
    .from('stripe_processed_events')
    .insert({ event_id: event.id, type: event.type });

  if (dedupErr) {
    // Unique-violation = already processed → ack 200 so Stripe stops retrying.
    if (dedupErr.code === '23505') {
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error('[stripe.webhook] dedup insert failed', dedupErr);
    return new NextResponse('dedup failed', { status: 500 });
  }

  try {
    await handleStripeEvent(admin, event);
  } catch (err) {
    console.error('[stripe.webhook] handler error', { eventId: event.id, err });
    // Roll back the dedup row so Stripe's retry will re-attempt.
    await admin.from('stripe_processed_events').delete().eq('event_id', event.id);
    return new NextResponse('handler error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
