'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props
  extends Omit<
    React.ComponentProps<'input'>,
    'type' | 'value' | 'onChange' | 'prefix'
  > {
  value: number | '';
  onChange: (v: number | '') => void;
  /** Right-attached unit tab — e.g. "%", "m²", "Anos", "R$". */
  suffix?: React.ReactNode;
  /** Left-attached unit tab — e.g. "R$", "€". */
  prefix?: React.ReactNode;
  decimals?: number;
}

/**
 * Numeric input with optional left/right unit tabs (DealCheck "% / Per Year"
 * style). Emits raw numbers, not strings — empty string only when the field
 * is blank.
 */
export function NumberInput({
  value,
  onChange,
  suffix,
  prefix,
  decimals = 0,
  className,
  ...rest
}: Props) {
  const [text, setText] = React.useState(() =>
    value === '' ? '' : formatNumeric(value, decimals)
  );

  // Sync external value -> internal text on prop change.
  React.useEffect(() => {
    setText(value === '' ? '' : formatNumeric(value, decimals));
  }, [value, decimals]);

  return (
    <div className="flex items-stretch">
      {prefix && (
        <span className="flex shrink-0 items-center border border-r-0 border-[#E2E0DA] bg-[#F0EFEB] px-2.5 font-mono text-xs text-[#6B7280]">
          {prefix}
        </span>
      )}
      <Input
        {...rest}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw === '' || raw === '-') {
            onChange('');
            return;
          }
          // Accept pt-BR comma decimals
          const normalized = raw.replace(/\./g, '').replace(',', '.');
          const n = Number(normalized);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className={cn(
          'font-mono tabular-nums',
          prefix && 'rounded-l-none',
          suffix && 'rounded-r-none',
          className
        )}
      />
      {suffix && (
        <span className="flex shrink-0 items-center border border-l-0 border-[#E2E0DA] bg-[#F0EFEB] px-2.5 font-mono text-xs text-[#6B7280]">
          {suffix}
        </span>
      )}
    </div>
  );
}

function formatNumeric(v: number, decimals: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}
