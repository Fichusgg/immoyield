'use client';

import Link from 'next/link';
import { LogOut, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopNavProps {
  userEmail?: string;
  breadcrumb?: BreadcrumbItem[];
}

export default function TopNav({ userEmail, breadcrumb }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[#E2E0DA] bg-[#FAFAF8] px-6">
      {/* Logo */}
      <Link href="/" className="mr-8 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
          I
        </div>
        <span className="text-sm font-bold tracking-tight text-[#1C2B20]">ImóYield</span>
      </Link>

      {/* Main nav link */}
      <Link
        href="/propriedades"
        className="flex h-full items-center border-b-2 border-[#4A7C59] px-4 text-sm font-medium text-[#1C2B20]"
      >
        Minhas Propriedades
      </Link>

      {/* Optional breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="ml-2 flex items-center gap-1">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-[#D0CEC8]" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="font-mono text-[11px] text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-mono text-[11px] text-[#6B7280]">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Right — user + logout */}
      <div className="ml-auto flex items-center gap-4">
        {userEmail && (
          <>
            <span className="hidden font-mono text-xs text-[#9CA3AF] sm:inline">{userEmail}</span>
            <div className="flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-bold text-white">
              {userEmail[0].toUpperCase()}
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 font-mono text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </header>
  );
}
