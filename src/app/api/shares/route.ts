import { NextResponse } from 'next/server';
import { createShareLinkServer, revokeShareLinkServer } from '@/lib/supabase/shares.server';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { dealId, dealName } = body as Record<string, unknown>;
    if (!isNonEmptyString(dealId) || !isNonEmptyString(dealName)) {
      return NextResponse.json({ error: 'Missing dealId or dealName' }, { status: 400 });
    }

    const share = await createShareLinkServer(dealId, dealName);
    return NextResponse.json({ share });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status =
      message.toLowerCase().includes('não autenticado') || message.toLowerCase().includes('login')
        ? 401
        : message.toLowerCase().includes('acesso negado')
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');
    if (!isNonEmptyString(dealId)) {
      return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
    }

    await revokeShareLinkServer(dealId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    const status =
      message.toLowerCase().includes('não autenticado') || message.toLowerCase().includes('login')
        ? 401
        : message.toLowerCase().includes('acesso negado')
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
