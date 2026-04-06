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
  residential: '🏠',
  airbnb: '🏖️',
  flip: '🔨',
  multifamily: '🏘️',
  commercial: '🏢',
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#22c55e] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      {/* ── Top nav bar ──────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#27272a] bg-[#111111] px-6">
        <Link href="/" className="mr-8 flex items-center gap-2">
          <Building2 size={16} className="text-[#22c55e]" />
          <span className="text-sm font-bold tracking-tight text-[#f4f4f5]">ImmoYield</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1a1a1a] text-[#f4f4f5]'
                    : 'text-[#52525b] hover:bg-[#1a1a1a] hover:text-[#a1a1aa]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {userEmail && (
            <div className="flex h-7 w-7 items-center justify-center bg-[#22c55e] text-xs font-bold text-black">
              {userEmail[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#52525b] transition-colors hover:text-[#a1a1aa]"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[#27272a] bg-[#111111]">
          <div className="flex-1 overflow-y-auto py-3">
            {PROPERTY_TYPES.map((type) => {
              const count = dealCounts?.[type] ?? 0;
              return (
                <div key={type} className="mb-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#f4f4f5]">
                      <span>{TYPE_ICONS[type]}</span>
                      {PROPERTY_TYPE_LABELS[type]}
                    </span>
                    <Link
                      href={`/analisar?tipo=${type}`}
                      className="flex h-5 w-5 items-center justify-center text-[#52525b] transition-colors hover:bg-[#1a1a1a] hover:text-[#a1a1aa]"
                      title={`Novo imóvel — ${PROPERTY_TYPE_LABELS[type]}`}
                    >
                      <Plus size={12} />
                    </Link>
                  </div>
                  <div className="ml-3 space-y-px border-l border-[#27272a] pl-3">
                    <Link
                      href={`/meus-negocios?tipo=${type}`}
                      className={`flex items-center justify-between py-1.5 pr-2 text-xs transition-colors ${
                        pathname === '/meus-negocios'
                          ? 'text-[#a1a1aa] hover:bg-[#1a1a1a]'
                          : 'text-[#52525b] hover:bg-[#1a1a1a] hover:text-[#a1a1aa]'
                      }`}
                    >
                      <span>Imóveis</span>
                      {count > 0 && (
                        <span className="bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#52525b]">
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
          <div className="border-t border-[#27272a] px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#22c55e] font-mono text-[10px] font-bold text-black">
                {userEmail ? userEmail[0].toUpperCase() : 'U'}
              </div>
              <p className="min-w-0 truncate font-mono text-[10px] text-[#52525b]">{userEmail}</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
