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
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">I</span>
            </div>
            <span className="font-black text-slate-900 tracking-tight">ImmoYield</span>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">beta</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[160px]">{user.email}</span>
            <Link
              href="/"
              className="text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Nova análise
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Minhas Análises</h1>
          <p className="text-sm text-slate-400 mt-1">Todos os deals salvos na sua conta.</p>
        </div>
        <DealList />
      </div>
    </main>
  );
}
