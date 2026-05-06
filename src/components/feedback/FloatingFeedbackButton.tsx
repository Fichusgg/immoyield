'use client';

/**
 * Floating feedback widget — bottom-right on every authenticated screen.
 * Posts to /api/feedback. Anonymous submissions allowed; if a session
 * exists, the email field is prefilled (and the route auto-fills user_id).
 *
 * Mobile (<sm): renders as a pill in the bottom nav area instead of a
 * floating circle, avoiding overlap with the keyboard.
 */

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prefill email from the session if available. Failing silently is fine —
  // the user can type it manually.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled && data.user?.email) setEmail(data.user.email);
      } catch {
        /* anon — leave email blank */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          email: email.trim() || undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Falha ao enviar feedback');
      }
      toast.success('Obrigado! Vamos ler todo feedback.');
      setMessage('');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
        className="fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#4A7C59] text-white shadow-lg transition-colors hover:bg-[#3D6B4F] focus-visible:ring-2 focus-visible:ring-[#4A7C59]/40 focus-visible:outline-none sm:right-6 sm:bottom-6"
      >
        <MessageCircle size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1C2B20]">Enviar feedback</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-[#9CA3AF] hover:text-[#1C2B20]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[#6B7280]">
              Encontrou um bug? Tem uma sugestão? Conte aqui — lemos tudo.
            </p>
            <label className="mb-1 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase">
              Mensagem
            </label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={5000}
              rows={5}
              className="mb-3 w-full rounded-lg border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2 text-sm text-[#1C2B20] focus:border-[#4A7C59] focus:outline-none"
              placeholder="O que você quer nos contar?"
            />
            <label className="mb-1 block text-[11px] font-semibold tracking-[0.06em] text-[#9CA3AF] uppercase">
              E-mail (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={320}
              className="mb-4 w-full rounded-lg border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2 text-sm text-[#1C2B20] focus:border-[#4A7C59] focus:outline-none"
              placeholder="voce@exemplo.com"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#E2E0DA] px-3 py-2 text-sm text-[#6B7280] hover:bg-[#F0EFEB]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || message.trim().length === 0}
                className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3D6B4F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
