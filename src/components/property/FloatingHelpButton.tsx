'use client';

import { MessageCircleQuestion } from 'lucide-react';

interface Props {
  unreadCount?: number;
  onClick?: () => void;
}

/**
 * Floating help bubble — bottom-right of the viewport on every property page.
 * No-op onClick by default; can be wired to open Intercom/Crisp/etc later.
 */
export function FloatingHelpButton({ unreadCount = 0, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label="Ajuda"
      onClick={onClick}
      className="fixed right-6 bottom-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#4A7C59] text-white shadow-lg transition-all hover:bg-[#3D6B4F] focus-visible:ring-2 focus-visible:ring-[#4A7C59]/40 focus-visible:outline-none"
      style={{ boxShadow: '0 6px 20px rgba(28,43,32,0.18)' }}
    >
      <MessageCircleQuestion size={22} />
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} mensagens não lidas`}
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
