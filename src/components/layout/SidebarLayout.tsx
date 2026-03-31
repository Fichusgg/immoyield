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
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-[#e5e5e3] bg-white">
        {/* Logo */}
        <div className="border-b border-[#e5e5e3] px-5 py-5">
          <Link
            href="/"
            className="block rounded-sm focus-visible:ring-2 focus-visible:ring-[#1a5c3a] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <p className="text-base font-bold tracking-tight text-[#1a1a1a]">ImmoYield</p>
            <p className="mt-0.5 text-[9px] font-semibold tracking-widest text-[#a3a3a1] uppercase">
              Rentabilidade Imobiliária
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-[#f5f5f3] font-semibold text-[#1a1a1a]'
                    : 'font-normal text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1a1a1a]'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-[#e5e5e3] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a5c3a] text-xs font-bold text-white">
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#1a1a1a]">User Profile</p>
              <p className="truncate text-[10px] text-[#737373]">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-[#e5e5e3] bg-white px-8 py-3.5">
          <nav className="flex gap-6">
            {nav.slice(0, 2).map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm transition-colors ${
                    active
                      ? 'font-semibold text-[#1a1a1a]'
                      : 'font-normal text-[#737373] hover:text-[#1a1a1a]'
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
        <main className="flex-1 overflow-y-auto bg-[#f5f5f3] p-8">{children}</main>
      </div>
    </div>
  );
}
