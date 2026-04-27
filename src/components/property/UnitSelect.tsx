'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface UnitOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  options: UnitOption[];
  className?: string;
  ariaLabel?: string;
}

/**
 * Right-attached unit select — e.g. "Por Mês / Por Ano / % do Aluguel".
 * Designed to clip onto the right of a NumberInput; flatten the left
 * border so the two visually fuse.
 */
export function UnitSelect({
  value,
  onValueChange,
  options,
  className,
  ariaLabel,
}: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (typeof v === 'string') onValueChange(v);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-8 rounded-l-none border-l-0 bg-[#F0EFEB] font-mono text-xs text-[#6B7280] hover:text-[#1C2B20]',
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Standard cadence unit options used across the worksheet. */
export const PERIOD_OPTIONS: UnitOption[] = [
  { value: 'day', label: 'Por Dia' },
  { value: 'week', label: 'Por Semana' },
  { value: 'month', label: 'Por Mês' },
  { value: 'quarter', label: 'Por Trimestre' },
  { value: 'year', label: 'Por Ano' },
];

export const RENT_PERCENT_OPTIONS: UnitOption[] = [
  { value: 'year', label: 'Por Ano' },
  { value: 'month', label: 'Por Mês' },
  { value: 'pctRent', label: '% do Aluguel' },
];
