import { NextResponse } from 'next/server';
import { promises as dns } from 'node:dns';
import { validateSignupEmail } from '@/lib/auth/email-validation';

export const runtime = 'nodejs';

/**
 * Server-side email verification used as a second gate before sign-up.
 * Re-runs the client-side checks (in case someone bypasses the form) and
 * confirms the domain actually accepts mail by resolving its MX record.
 *
 * If the DNS lookup fails for transient reasons (timeout, NXDOMAIN flake)
 * we accept the address — better to let a real signup through than block a
 * legitimate user because of a one-off DNS hiccup.
 */
export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-format' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const syntactic = validateSignupEmail(email);
  if (!syntactic.ok) {
    return NextResponse.json(syntactic, { status: 400 });
  }

  const domain = email.trim().toLowerCase().split('@')[1];

  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('mx-timeout')), 3500)),
    ]);
    if (!Array.isArray(mx) || mx.length === 0) {
      return NextResponse.json({ ok: false, reason: 'no-mx' }, { status: 400 });
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return NextResponse.json({ ok: false, reason: 'no-mx' }, { status: 400 });
    }
    // Transient failure — fall through and accept.
  }

  return NextResponse.json({ ok: true });
}
