'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <LogOut size={12} />
      Sair
    </button>
  );
}
