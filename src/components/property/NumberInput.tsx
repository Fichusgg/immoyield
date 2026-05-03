'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props
  extends Omit<
    React.ComponentProps<'input'>,
    'type' | 'value' | 'onChange' | 'prefix' | 'min' | 'max'
  > {
  value: number | '';
  onChange: (v: number | '') => void;
  /** Right-attached unit tab — e.g. "%", "m²", "Anos", "R$". */
  suffix?: React.ReactNode;
  /** Left-attached unit tab — e.g. "R$", "€". */
  prefix?: React.ReactNode;
  decimals?: number;
  /** Clamp value to 0..100. Implies decimals=2 unless overridden. */
  percent?: boolean;
  min?: number;
  max?: number;
}

/**
 * Numeric input with optional unit tabs.
 *
 * Behavior:
 * - Free typing while focused — only digits, comma, dot, minus accepted.
 * - Reformat on blur, never mid-typing (no caret jumping).
 * - Scroll wheel and ↑/↓ arrows never change the value.
 */
export function NumberInput({
  value,
  onChange,
  suffix,
  prefix,
  decimals,
  percent,
  min,
  max,
  className,
  onBlur,
  onFocus,
  onKeyDown,
  onWheel,
  ...rest
}: Props) {
  const effectiveDecimals = decimals ?? (percent ? 2 : 0);
  const effectiveMin = min ?? (percent ? 0 : undefined);
  const effectiveMax = max ?? (percent ? 100 : undefined);

  const [text, setText] = React.useState(() =>
    value === '' ? '' : formatNumeric(value, effectiveDecimals)
  );
  const focusedRef = React.useRef(false);

  // Sync external value -> internal text only when not focused (avoids caret jumps).
  React.useEffect(() => {
    if (focusedRef.current) return;
    setText(value === '' ? '' : formatNumeric(value, effectiveDecimals));
  }, [value, effectiveDecimals]);

  const commit = (raw: string) => {
    if (raw.trim() === '' || raw === '-') {
      onChange('');
      setText('');
      return;
    }
    let n = parseLocaleNumber(raw);
    if (n === undefined) {
      // Couldn't parse — restore last valid value
      setText(value === '' ? '' : formatNumeric(value, effectiveDecimals));
      return;
    }
    if (effectiveMin !== undefined && n < effectiveMin) n = effectiveMin;
    if (effectiveMax !== undefined && n > effectiveMax) n = effectiveMax;
    onChange(n);
    setText(formatNumeric(n, effectiveDecimals));
  };

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
        onFocus={(e) => {
          focusedRef.current = true;
          onFocus?.(e);
        }}
        onChange={(e) => {
          // Accept only: digits, dot, comma, minus. Block letters / 'e'.
          const sanitized = e.target.value.replace(/[^\d.,\-]/g, '');
          setText(sanitized);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit(e.target.value);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
          if (e.key === 'Enter') {
            commit((e.target as HTMLInputElement).value);
          }
          onKeyDown?.(e);
        }}
        onWheel={(e) => {
          // Defocus so wheel scrolls the page, not the value.
          (e.target as HTMLInputElement).blur();
          onWheel?.(e);
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

/**
 * Parse a pt-BR numeric string. Comma is the decimal separator; dots are
 * thousands separators (matching `Intl.NumberFormat('pt-BR')` output).
 *
 * Examples: "4.500" → 4500, "4,5" → 4.5, "1.234,56" → 1234.56
 */
function parseLocaleNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const negative = trimmed.startsWith('-');
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!/[\d.,]/.test(body)) return undefined;

  // Strip thousand-separator dots, then convert decimal comma to dot.
  const normalized = body.replace(/\./g, '').replace(',', '.');
  if (!/\d/.test(normalized)) return undefined;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  return negative ? -n : n;
}
