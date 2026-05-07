'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (process.env.NODE_ENV === 'production') {
      window.location.href = 'https://immoyield.com/';
    } else {
      router.replace('/');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 border border-[#E2E0DA] px-2.5 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#D0CEC8] hover:text-[#6B7280] focus-visible:ring-1 focus-visible:ring-[#4A7C59] focus-visible:outline-none"
    >
      <LogOut size={12} />
      Sair
    </button>
  );
}
