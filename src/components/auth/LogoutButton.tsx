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
      className="flex items-center gap-1.5 border border-[#27272a] px-2.5 py-1.5 text-xs text-[#52525b] transition-colors hover:border-[#3f3f46] hover:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
    >
      <LogOut size={12} />
      Sair
    </button>
  );
}
