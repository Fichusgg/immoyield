'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  HelpCircle,
  Settings,
  ArrowUpCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface TopNavProps {
  userEmail?: string;
}

const PRIMARY_NAV: { href: string; label: string; comingSoon?: boolean }[] = [
  { href: '/propriedades', label: 'Meus Imóveis' },
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
    <header className="flex h-12 shrink-0 items-center border-b border-[#E2E0DA] bg-[#FAFAF8] px-3 sm:px-6">
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <Link href="/" className="mr-3 flex items-center gap-2 sm:mr-8">
        <Image
          src="/immoyield_logo_dark.png"
          alt="ImmoYield logo"
          width={28}
          height={28}
          className="object-contain"
        />
        <span className="hidden text-sm font-bold tracking-tight text-[#1C2B20] sm:inline">ImmoYield</span>
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
              className={`flex h-full items-center gap-1.5 border-b-2 px-2 text-sm font-medium transition-colors sm:px-4 ${
                active
                  ? 'border-[#4A7C59] text-[#1C2B20]'
                  : 'border-transparent text-[#6B7480] hover:text-[#6B7280]'
              }`}
            >
              {label}
              {comingSoon && (
                <span className="rounded bg-[#F0EFEB] px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide text-[#6B7480] uppercase">
                  Em Breve
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Right cluster ─────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">
        <IconButton ariaLabel="Importar / Upgrade" icon={<ArrowUpCircle size={15} />} className="hidden sm:flex" />
        <IconLink ariaLabel="Ajuda" href="/ajuda" icon={<HelpCircle size={15} />} className="hidden sm:flex" />
        <IconLink ariaLabel="Configurações" href="/configuracoes" icon={<Settings size={15} />} />

        {userEmail && (
          <>
            <span className="ml-3 hidden font-mono text-xs text-[#6B7480] md:inline">
              {userEmail}
            </span>
            <div
              aria-hidden
              className="ml-1 hidden h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-bold text-white sm:flex"
            >
              {userEmail[0].toUpperCase()}
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="ml-1 flex h-9 items-center gap-1.5 px-2 font-mono text-xs text-[#6B7480] transition-colors hover:text-[#6B7280] sm:ml-2"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}

function IconButton({ ariaLabel, icon, className = '' }: { ariaLabel: string; icon: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-[#6B7480] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20] ${className}`}
    >
      {icon}
    </button>
  );
}

function IconLink({
  ariaLabel,
  href,
  icon,
  className = '',
}: {
  ariaLabel: string;
  href: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`flex h-9 w-9 items-center justify-center rounded-md text-[#6B7480] transition-colors hover:bg-[#F0EFEB] hover:text-[#1C2B20] ${className}`}
    >
      {icon}
    </Link>
  );
}
