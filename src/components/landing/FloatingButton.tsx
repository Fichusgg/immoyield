'use client';

import Link from 'next/link';

const SAGE = '#4A7C59';
const SAGE_DIM = '#3D6B4F';

export default function FloatingButton() {
  return (
    <Link
      href="/auth"
      aria-label="Nova análise"
      className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full text-white transition-colors"
      style={{ backgroundColor: SAGE, boxShadow: '0 10px 30px rgba(28,43,32,0.18)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = SAGE_DIM)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = SAGE)}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
