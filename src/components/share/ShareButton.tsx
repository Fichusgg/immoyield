'use client';

/**
 * ShareButton
 *
 * Creates a shared_reports row via createShareLink() then copies the
 * public URL to clipboard. Shows loading → copied → done states.
 *
 * Props:
 *   dealId   – uuid from the saved deal (required)
 *   dealName – for slug generation
 *   compact  – render icon-only pill (used inside DealCard)
 */

import { useState } from 'react';
import { Link2, Check, Loader2, Copy } from 'lucide-react';
import { createShareLink } from '@/lib/supabase/shares.client';

interface ShareButtonProps {
  dealId: string;
  dealName: string;
  compact?: boolean;
  className?: string;
}

type State = 'idle' | 'loading' | 'copied' | 'error';

export function ShareButton({ dealId, dealName, compact = false, className }: ShareButtonProps) {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleShare = async () => {
    if (state === 'loading' || state === 'copied') return;
    setState('loading');
    setErrorMsg('');

    try {
      const share = await createShareLink(dealId, dealName);
      const url = `${window.location.origin}/r/${share.slug}`;
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao gerar link');
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        title={
          state === 'loading'
            ? 'Gerando link...'
            : state === 'copied'
              ? 'Link copiado!'
              : 'Compartilhar'
        }
        className={
          className ?? 'text-[#9CA3AF] transition-colors hover:text-[#4A7C59] disabled:opacity-50'
        }
        disabled={state === 'loading'}
      >
        {state === 'loading' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : state === 'copied' ? (
          <Check size={14} className="text-[#4A7C59]" />
        ) : (
          <Link2 size={14} />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleShare}
        disabled={state === 'loading'}
        className={
          className ??
          'flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black whitespace-nowrap text-white transition-colors hover:bg-sky-500 disabled:opacity-60'
        }
      >
        {state === 'loading' ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Gerando link...
          </>
        ) : state === 'copied' ? (
          <>
            <Check size={13} /> Link copiado!
          </>
        ) : (
          <>
            <Copy size={13} /> Compartilhar
          </>
        )}
      </button>
      {state === 'error' && <p className="px-1 text-[10px] text-red-400">{errorMsg}</p>}
    </div>
  );
}
