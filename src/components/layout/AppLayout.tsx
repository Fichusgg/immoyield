'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, LogOut, Building2 } from 'lucide-react';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, PropertyType } from '@/lib/validations/deal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  dealCounts?: Record<PropertyType, number>;
}

const TYPE_ICONS: Record<PropertyType, string> = {
  aluguel: '🏠',
  airbnb: '🏖️',
  reforma: '🔨',
  comercial: '🏢',
};

export default function AppLayout({ children, userEmail, dealCounts }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      {/* ── Top nav bar ──────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#e5e5e3] bg-white px-6">
        <Link href="/" className="mr-8 flex items-center gap-2">
          <Building2 size={16} className="text-[#1a5c3a]" />
          <span className="text-sm font-bold tracking-tight text-[#1a1a1a]">ImmoYield</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#f5f5f3] text-[#1a1a1a]'
                    : 'text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1a1a1a]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {userEmail && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a5c3a] text-xs font-bold text-white">
              {userEmail[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#1a1a1a]"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[#e5e5e3] bg-white">
          <div className="flex-1 overflow-y-auto py-3">
            {PROPERTY_TYPES.map((type) => {
              const count = dealCounts?.[type] ?? 0;
              return (
                <div key={type} className="mb-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
                      <span>{TYPE_ICONS[type]}</span>
                      {PROPERTY_TYPE_LABELS[type]}
                    </span>
                    <Link
                      href={`/analisar?tipo=${type}`}
                      className="flex h-5 w-5 items-center justify-center rounded text-[#737373] transition-colors hover:bg-[#f5f5f3] hover:text-[#1a1a1a]"
                      title={`Novo imóvel — ${PROPERTY_TYPE_LABELS[type]}`}
                    >
                      <Plus size={12} />
                    </Link>
                  </div>
                  <div className="ml-3 space-y-0.5 border-l border-[#e5e5e3] pl-3">
                    <Link
                      href={`/meus-negocios?tipo=${type}`}
                      className={`flex items-center justify-between rounded-r-md py-1.5 pr-2 text-xs transition-colors ${
                        pathname === '/meus-negocios'
                          ? 'text-[#1a1a1a] hover:bg-[#f5f5f3]'
                          : 'text-[#737373] hover:bg-[#f5f5f3] hover:text-[#1a1a1a]'
                      }`}
                    >
                      <span>Imóveis</span>
                      {count > 0 && (
                        <span className="rounded-full bg-[#f5f5f3] px-1.5 py-0.5 text-[9px] font-bold text-[#737373]">
                          {count}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User footer */}
          <div className="border-t border-[#e5e5e3] px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a5c3a] text-[10px] font-bold text-white">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
              <p className="min-w-0 truncate text-[10px] text-[#737373]">{userEmail}</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-[#f5f5f3] p-8">{children}</main>
      </div>
    </div>
  );
}
