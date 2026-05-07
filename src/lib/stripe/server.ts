import 'server-only';

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, { apiVersion: '2025-10-29.clover' });
  return cached;
}

export function getPremiumPriceId(): string {
  const id = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!id) throw new Error('STRIPE_PREMIUM_PRICE_ID is not set');
  return id;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}
