'use client';

/**
 * Client helpers for the Stripe flow. Keeping fetch + redirect logic here so
 * pricing page, upgrade modal, and settings all hit the same shape.
 */

async function postJson(path: string): Promise<{ url?: string; error?: string }> {
  const res = await fetch(path, { method: 'POST' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}

export async function startCheckout(): Promise<void> {
  const { url } = await postJson('/api/stripe/checkout');
  if (!url) throw new Error('no checkout url');
  window.location.assign(url);
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await postJson('/api/stripe/portal');
  if (!url) throw new Error('no portal url');
  window.location.assign(url);
}
