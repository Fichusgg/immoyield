'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Plus, LogOut, Home, CalendarDays, Wrench, Building2, Store } from 'lucide-react';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const TYPE_ICONS: Record<PropertyType, React.ElementType> = {
  residential: Home,
  airbnb: CalendarDays,
  flip: Wrench,
  multifamily: Building2,
  commercial: Store,
};

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  dealCounts?: Record<PropertyType, number>;
}

export default function AppLayout({ children, userEmail, dealCounts }: AppLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeType = searchParams.get('tipo') as PropertyType | null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  const navLinks = [
    { href: '/meus-negocios', label: 'Meus Imóveis' },
    { href: '/analisar', label: 'Nova Análise' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#4A7C59] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Top nav bar ───────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#E2E0DA] bg-[#FAFAF8] px-6">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
            I
          </div>
          <span className="text-sm font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
        </Link>

        {/* Nav links with bottom-border active indicator */}
        <nav className="flex h-full items-center">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-full items-center border-b-2 px-4 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[#4A7C59] text-[#1C2B20]'
                    : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right — avatar + logout */}
        <div className="ml-auto flex items-center gap-4">
          {userEmail && <span className="font-mono text-xs text-[#9CA3AF]">{userEmail}</span>}
          {userEmail && (
            <div className="flex h-7 w-7 items-center justify-center bg-[#4A7C59] font-mono text-xs font-bold text-white">
              {userEmail[0].toUpperCase()}
            </div>
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

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar — DealCheck-style property groups ───────────────── */}
        <aside className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-[#E2E0DA] bg-[#FAFAF8]">
          <nav className="flex-1">
            {PROPERTY_TYPES.map((type) => {
              const count = dealCounts?.[type] ?? 0;
              const Icon = TYPE_ICONS[type];
              const isActiveSubItem = activeType === type && pathname === '/meus-negocios';

              return (
                <div key={type} className="border-b border-[#F0EFEB]">
                  {/* Group header row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-[#6B7280]">
                      {PROPERTY_TYPE_LABELS[type]}
                    </span>
                    <Link
                      href="/analisar"
                      title={`Nova análise — ${PROPERTY_TYPE_LABELS[type]}`}
                      className="flex h-5 w-5 items-center justify-center text-[#D0CEC8] transition-colors hover:text-[#4A7C59]"
                    >
                      <Plus size={13} />
                    </Link>
                  </div>

                  {/* Imóveis sub-item — count | icon | label */}
                  <Link
                    href={`/meus-negocios?tipo=${type}`}
                    className={`flex items-center gap-2 border-l-2 py-2 pr-3 pl-4 text-xs transition-colors ${
                      isActiveSubItem
                        ? 'border-[#4A7C59] bg-[#EBF3EE] text-[#4A7C59]'
                        : 'border-transparent text-[#9CA3AF] hover:bg-[#F0EFEB] hover:text-[#6B7280]'
                    }`}
                  >
                    <span className="w-3 shrink-0 text-right font-mono text-[10px] font-bold">
                      {count > 0 ? count : ''}
                    </span>
                    <Icon size={11} className="shrink-0" />
                    <span>Imóveis</span>
                  </Link>

                  {/* Spacer below sub-item */}
                  <div className="h-2" />
                </div>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="border-t border-[#E2E0DA] px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#4A7C59] font-mono text-[10px] font-bold text-white">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
              <p className="min-w-0 truncate font-mono text-[10px] text-[#9CA3AF]">{userEmail}</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-[#F8F7F4] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
