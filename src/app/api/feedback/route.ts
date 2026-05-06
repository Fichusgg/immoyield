/**
 * POST /api/feedback — accepts a free-text submission from the floating
 * feedback widget. Auth is optional: signed-in users get user_id auto-filled
 * from the session (never trusted from the body); anonymous visitors still
 * land in the table for the owner to read.
 *
 * Rate-limited per IP because anyone can submit.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, limiters, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

interface FeedbackBody {
  message?: unknown;
  email?: unknown;
  url?: unknown;
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(limiters.write, `feedback:${getClientIp(req)}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas requisições.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Mensagem muito longa (máx 5000 caracteres)' }, { status: 400 });
  }

  const email =
    typeof body.email === 'string' && body.email.trim().length > 0
      ? body.email.trim().slice(0, 320)
      : null;
  const url =
    typeof body.url === 'string' && body.url.trim().length > 0
      ? body.url.trim().slice(0, 2048)
      : null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 1024) ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id ?? null,
    email: email ?? user?.email ?? null,
    message,
    url,
    user_agent: userAgent,
  });

  if (error) {
    console.error('[FEEDBACK_INSERT_ERROR]', error);
    return NextResponse.json({ error: 'Falha ao registrar feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
