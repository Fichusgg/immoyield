'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function formatNumberBR(value: number, decimals: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function parseLocaleNumber(raw: string, decimals: number): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/[\d.,]/.test(trimmed)) return undefined;

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  const sepIndex = Math.max(lastComma, lastDot);

  let intPart: string;
  let decPart = '';
  if (sepIndex === -1) {
    intPart = trimmed.replace(/\D/g, '');
  } else {
    intPart = trimmed.slice(0, sepIndex).replace(/\D/g, '');
    decPart = trimmed.slice(sepIndex + 1).replace(/\D/g, '');
  }
  if (!intPart && !decPart) return undefined;

  if (decimals === 0) {
    const n = Number(intPart || '0');
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(`${intPart || '0'}.${decPart || '0'}`);
  return Number.isFinite(n) ? n : undefined;
}

export function CurrencyInput({
  value,
  onValueChange,
  decimals = 0,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  onWheel,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number;
  onValueChange: (value: number | undefined) => void;
  decimals?: number;
}) {
  const [display, setDisplay] = React.useState(() =>
    typeof value === 'number' && Number.isFinite(value)
      ? formatNumberBR(value, decimals)
      : ''
  );
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (focusedRef.current) return;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplay('');
      return;
    }
    setDisplay(formatNumberBR(value, decimals));
  }, [value, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Free typing — only digits, comma, dot, minus.
    const sanitized = e.target.value.replace(/[^\d.,\-]/g, '');
    setDisplay(sanitized);
  };

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onValueChange(undefined);
      setDisplay('');
      return;
    }
    const parsed = parseLocaleNumber(trimmed, decimals);
    if (parsed === undefined) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setDisplay(formatNumberBR(value, decimals));
      } else {
        setDisplay('');
        onValueChange(undefined);
      }
      return;
    }
    onValueChange(parsed);
    setDisplay(formatNumberBR(parsed, decimals));
  };

  return (
    <input
      {...props}
      value={display}
      onChange={handleChange}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        commit(e.target.value);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
        if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        onKeyDown?.(e);
      }}
      onWheel={(e) => {
        (e.target as HTMLInputElement).blur();
        onWheel?.(e);
      }}
      type="text"
      inputMode={props.inputMode ?? (decimals === 0 ? 'numeric' : 'decimal')}
      className={cn(className)}
      autoComplete={props.autoComplete ?? 'off'}
    />
  );
}
