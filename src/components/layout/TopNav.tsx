'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface TopNavProps {
  userEmail?: string;
}

export default function TopNav({ userEmail }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[#27272a] bg-[#111111] px-6">
      {/* Logo */}
      <Link href="/" className="mr-8 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center bg-[#22c55e] font-mono text-xs font-black text-black">
          I
        </div>
        <span className="text-sm font-bold tracking-tight text-[#f4f4f5]">ImmoYield</span>
      </Link>

      {/* Single nav link */}
      <Link
        href="/propriedades"
        className="flex h-full items-center border-b-2 border-[#22c55e] px-4 text-sm font-medium text-[#f4f4f5]"
      >
        Minhas Propriedades
      </Link>

      {/* Right — user + logout */}
      <div className="ml-auto flex items-center gap-4">
        {userEmail && (
          <>
            <span className="hidden font-mono text-xs text-[#52525b] sm:inline">{userEmail}</span>
            <div className="flex h-7 w-7 items-center justify-center bg-[#22c55e] font-mono text-xs font-bold text-black">
              {userEmail[0].toUpperCase()}
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 font-mono text-xs text-[#52525b] transition-colors hover:text-[#a1a1aa]"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </header>
  );
}
