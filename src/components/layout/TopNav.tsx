'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  HelpCircle,
  Settings,
  Bell,
  ArrowUpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TopNavProps {
  userEmail?: string;
}

const PRIMARY_NAV: { href: string; label: string; comingSoon?: boolean }[] = [
  { href: '/propriedades', label: 'Meus Imóveis' },
  { href: '/buscar-imoveis', label: 'Buscar Imóveis', comingSoon: true },
  { href: '/buscar-bancos', label: 'Buscar Bancos', comingSoon: true },
];

export default function TopNav({ userEmail }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[#E2E0DA] bg-[#FAFAF8] px-6">
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <Link href="/" className="mr-8 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
          I
        </div>
        <span className="text-sm font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
      </Link>

      {/* ── Primary nav (3 links, centered active underline) ──────────── */}
      <nav className="flex h-full items-center" aria-label="Navegação principal">
        {PRIMARY_NAV.map(({ href, label, comingSoon }) => {
          const active =
            pathname === href ||
            pathname.startsWith(href + '/') ||
            // Property workspace counts as "Meus Imóveis"
            (href === '/propriedades' &&
              (pathname.startsWith('/imoveis/') || pathname.startsWith('/meus-negocios')));
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-full items-center gap-1.5 border-b-2 px-4 text-sm font-medium transition-colors ${
                active
                  ? 'border-[#4A7C59] text-[#1C2B20]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              {label}
              {comingSoon && (
                <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide text-[#9CA3AF] uppercase">
                  Em Breve
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Right cluster ─────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">
        <IconButton ariaLabel="Importar / Upgrade" icon={<ArrowUpCircle size={15} />} />
        <IconButton ariaLabel="Notificações" icon={<Bell size={15} />} />
        <IconButton ariaLabel="Ajuda" icon={<HelpCircle size={15} />} />
        <IconButton ariaLabel="Configurações" icon={<Settings size={15} />} />

        {userEmail && (
          <>
            <span className="ml-3 hidden font-mono text-xs text-[#9CA3AF] sm:inline">
              {userEmail}
            </span>
            <div
              aria-hidden
              className="ml-1 flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-bold text-white"
            >
              {userEmail[0].toUpperCase()}
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="ml-2 flex items-center gap-1.5 font-mono text-xs text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </header>
  );
}

function IconButton({ ariaLabel, icon }: { ariaLabel: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[#9CA3AF] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20]"
    >
      {icon}
    </button>
  );
}
