'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Search } from 'lucide-react';
import LogoutButton from '@/components/auth/LogoutButton';

interface SidebarLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
}

const nav = [
  { href: '/analisar', label: 'Analisar', icon: Search },
  { href: '/meus-negocios', label: 'Meus Negócios', icon: LayoutGrid },
];

export default function SidebarLayout({ children, userEmail }: SidebarLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#22c55e] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-[#27272a] bg-[#111111]">
        {/* Logo */}
        <div className="border-b border-[#27272a] px-5 py-5">
          <Link
            href="/"
            className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
          >
            <p className="text-base font-bold tracking-tight text-[#f4f4f5]">ImmoYield</p>
            <p className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">
              Rentabilidade Imobiliária
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-px px-2 py-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'border-[#22c55e] bg-[#052e16] font-semibold text-[#22c55e]'
                    : 'border-transparent font-normal text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-[#f4f4f5]'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-[#27272a] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#22c55e] text-xs font-bold text-black">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-mono text-[#52525b]">{userEmail ?? ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-[#27272a] bg-[#111111] px-8 py-3.5">
          <nav className="flex gap-6">
            {nav.slice(0, 2).map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e] ${
                    active
                      ? 'font-semibold text-[#f4f4f5]'
                      : 'font-normal text-[#52525b] hover:text-[#a1a1aa]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
