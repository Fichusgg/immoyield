import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DealList from '@/components/dashboard/DealList';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
              <span className="text-xs font-black text-white">I</span>
            </div>
            <span className="font-black tracking-tight text-slate-900">ImmoYield</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              beta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-xs text-slate-400 sm:block">
              {user.email}
            </span>
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-emerald-500"
            >
              + Nova análise
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Minhas Análises</h1>
          <p className="mt-1 text-sm text-slate-400">Todos os deals salvos na sua conta.</p>
        </div>
        <DealList />
      </div>
    </main>
  );
}
