'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  label: React.ReactNode;
  /** Tooltip body shown when the user hovers the ? icon next to the label. */
  help?: React.ReactNode;
  /** Right-side content (input, select, toggle, computed value …). */
  children: React.ReactNode;
  /** Render label/children stacked instead of side-by-side. */
  stacked?: boolean;
  className?: string;
}

/**
 * 30 / 70 label / input split. Switches to single-column under sm.
 * Optional ? icon before the label for inline help tooltips.
 */
export function FormRow({ label, help, children, stacked, className }: Props) {
  return (
    <div
      className={cn(
        'grid items-center gap-3 px-5 py-3.5',
        stacked ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[30%_1fr]',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
        {help && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Ajuda"
                  className="text-[#D0CEC8] transition-colors hover:text-[#6B7280]"
                >
                  <HelpCircle size={13} />
                </button>
              }
            />
            <TooltipContent>{help}</TooltipContent>
          </Tooltip>
        )}
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
