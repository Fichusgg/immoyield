'use client';

import { cn } from '@/lib/utils';

interface Props {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Optional label rendered to the LEFT of the switch (with a description below it). */
  label?: React.ReactNode;
  description?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Sage-green pill switch. When `label` is provided, renders a full row with
 * label + description on the left and the switch on the right (DealCheck's
 * "Use Financing" style). Without `label`, renders just the switch.
 */
export function Toggle({ on, onChange, label, description, ariaLabel, disabled }: Props) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:ring-2 focus-visible:ring-[#4A7C59]/40 focus-visible:outline-none',
        on ? 'bg-[#4A7C59]' : 'bg-[#D0CEC8]',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          on ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );

  if (!label) return switchEl;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#1C2B20]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[#9CA3AF]">{description}</p>
        )}
      </div>
      {switchEl}
    </div>
  );
}
