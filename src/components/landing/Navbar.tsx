'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SAGE = '#4A7C59';
const SAGE_DIM = '#3D6B4F';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[72px] transition-colors ${
        scrolled
          ? 'border-b border-[#E2E0DA] bg-[#FAFAF8]/95 backdrop-blur'
          : 'border-b border-transparent bg-[#F8F7F4]/80 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center text-xs font-black text-white"
            style={{ backgroundColor: SAGE }}
          >
            I
          </span>
          <span className="text-base font-bold tracking-tight text-[#1C2B20]">
            ImmoYield
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-10 md:flex" aria-label="Principal">
          {[
            { href: '#como-funciona', label: 'Como funciona' },
            { href: '#funcionalidades', label: 'Funcionalidades' },
            { href: '#precos', label: 'Preços' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase transition-colors hover:text-[#1C2B20]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="/auth"
            className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7280] uppercase transition-colors hover:text-[#1C2B20]"
          >
            Entrar
          </Link>
          <Link
            href="/auth"
            className="px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-white uppercase transition-colors"
            style={{ backgroundColor: SAGE }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = SAGE_DIM)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = SAGE)}
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-[#1C2B20] md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-[#E2E0DA] bg-[#FAFAF8] md:hidden">
          <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4" aria-label="Mobile">
            <a href="#como-funciona" className="py-2 text-sm text-[#6B7280]">Como funciona</a>
            <a href="#funcionalidades" className="py-2 text-sm text-[#6B7280]">Funcionalidades</a>
            <a href="#precos" className="py-2 text-sm text-[#6B7280]">Preços</a>
            <Link href="/auth" className="py-2 text-sm text-[#6B7280]">Entrar</Link>
            <Link
              href="/auth"
              className="mt-2 py-2 text-center text-[11px] font-semibold tracking-[0.12em] text-white uppercase"
              style={{ backgroundColor: SAGE }}
            >
              Começar grátis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
