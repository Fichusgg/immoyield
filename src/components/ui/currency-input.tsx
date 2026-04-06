'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function formatNumberBR(value: number, decimals: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function parseCurrencyLike(raw: string, decimals: number): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (decimals === 0) {
    // pt-BR: '.' thousands, ',' decimals — ignore anything after ',' (cents).
    const beforeDecimal = trimmed.split(',')[0] ?? '';
    const digits = beforeDecimal.replace(/\D/g, '');
    if (!digits) return undefined;
    const n = Number(digits);
    return Number.isFinite(n) ? n : undefined;
  }

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  const sepIndex = Math.max(lastComma, lastDot);

  if (sepIndex === -1) {
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return undefined;
    const n = Number(digits);
    return Number.isFinite(n) ? n / 10 ** decimals : undefined;
  }

  const intDigits = trimmed.slice(0, sepIndex).replace(/\D/g, '');
  const decDigitsRaw = trimmed.slice(sepIndex + 1).replace(/\D/g, '');
  const decDigits = decDigitsRaw.padEnd(decimals, '0').slice(0, decimals);
  const allDigits = `${intDigits || '0'}${decDigits}`;
  const n = Number(allDigits);
  return Number.isFinite(n) ? n / 10 ** decimals : undefined;
}

export function CurrencyInput({
  value,
  onValueChange,
  decimals = 0,
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value?: number;
  onValueChange: (value: number | undefined) => void;
  decimals?: number;
}) {
  const [display, setDisplay] = React.useState('');

  React.useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplay('');
      return;
    }
    setDisplay(formatNumberBR(value, decimals));
  }, [value, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const nextValue = parseCurrencyLike(raw, decimals);
    onValueChange(nextValue);

    if (nextValue === undefined) {
      setDisplay(raw.replace(/[^\d.,]/g, ''));
      return;
    }

    setDisplay(formatNumberBR(nextValue, decimals));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    props.onBlur?.(e);
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    setDisplay(formatNumberBR(value, decimals));
  };

  return (
    <input
      {...props}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      type="text"
      inputMode={props.inputMode ?? (decimals === 0 ? 'numeric' : 'decimal')}
      className={cn(className)}
      autoComplete={props.autoComplete ?? 'off'}
    />
  );
}
