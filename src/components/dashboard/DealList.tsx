'use client';

import { useEffect, useState } from 'react';
import { SavedDeal } from '@/lib/supabase/deals';
import DealCard from './DealCard';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function logSupabaseError(context: string, error: unknown) {
  const anyError = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    status?: unknown;
  };

  const message =
    typeof anyError?.message === 'string'
      ? anyError.message
      : error instanceof Error
        ? error.message
        : String(anyError?.message ?? error);

  const code = typeof anyError?.code === 'string' ? anyError.code : undefined;
  const details = typeof anyError?.details === 'string' ? anyError.details : undefined;
  const hint = typeof anyError?.hint === 'string' ? anyError.hint : undefined;
  const status = typeof anyError?.status === 'number' ? anyError.status : undefined;

  console.error(`[supabase] ${context}`, { message, code, details, hint, status, raw: error });
}

function toErrorSummary(error: unknown) {
  if (!error) return null;

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      message: typeof obj.message === 'string' ? obj.message : undefined,
      code: typeof obj.code === 'string' ? obj.code : undefined,
      details: typeof obj.details === 'string' ? obj.details : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: String(error) };
}

function looksLikeRlsError(error: unknown) {
  const anyError = error as { message?: unknown; code?: unknown };
  const message = typeof anyError?.message === 'string' ? anyError.message : '';
  const code = typeof anyError?.code === 'string' ? anyError.code : '';
  return (
    code === '42501' ||
    message.toLowerCase().includes('row-level security') ||
    message.toLowerCase().includes('violates row-level security') ||
    message.toLowerCase().includes('permission denied')
  );
}

export default function DealList() {
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.debug('[deals.load] auth.getUser', {
        userId: user?.id,
        email: user?.email,
        error: toErrorSummary(userError),
      });

      if (userError) {
        logSupabaseError('auth.getUser', userError);
        throw new Error('Erro ao validar sessão. Faça login novamente.');
      }
      if (!user) {
        throw new Error('Você precisa estar logado para ver seu dashboard.');
      }

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      console.debug('[deals.load] select response', {
        ok: !error,
        rows: data?.length ?? 0,
        error: toErrorSummary(error),
        data,
      });

      if (error) {
        logSupabaseError('deals.select', error);
        if (looksLikeRlsError(error)) {
          throw new Error(
            'Carregamento bloqueado por permissões (RLS). Verifique políticas na tabela `deals` para SELECT.'
          );
        }
        throw new Error(`Erro ao carregar: ${error.message}`);
      }

      setDeals((data ?? []) as SavedDeal[]);
    } catch (e) {
      if (e instanceof Error) {
        console.error('[deals.load] failed', { message: e.message, name: e.name, stack: e.stack });
        setError(e.message);
      } else {
        logSupabaseError('deals.load (unknown error)', e);
        setError('Erro ao carregar análises.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-white p-5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={load}
          className="mt-4 text-xs text-slate-500 underline hover:text-slate-800"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
        <p className="mb-1 text-sm text-slate-400">Nenhuma análise salva ainda.</p>
        <p className="mb-6 text-xs text-slate-300">
          Complete uma análise e clique em &ldquo;Salvar&rdquo;.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
        >
          Nova análise →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {deals.map((d) => (
        <DealCard key={d.id} deal={d} onDelete={load} />
      ))}
    </div>
  );
}
