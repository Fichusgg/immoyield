import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  /** Optional small line below the value — e.g. "vs CDI 10,75%". */
  sub?: string;
  /** Color the value sage / red for positive / negative metrics. */
  tone?: 'neutral' | 'positive' | 'negative';
  /** Optional fill bar from 0 to 100 — useful for benchmark comparison. */
  benchmarkPct?: number;
  className?: string;
}

/**
 * Single KPI tile — uppercase label + large mono value + optional bar.
 * Designed to live in a 4-up grid at the top of the analysis page.
 */
export function KpiCard({ label, value, sub, tone = 'neutral', benchmarkPct, className }: Props) {
  const valueColor =
    tone === 'positive'
      ? 'text-[#4A7C59]'
      : tone === 'negative'
        ? 'text-[#DC2626]'
        : 'text-[#1C2B20]';

  return (
    <div className={cn('border border-[#E2E0DA] bg-[#FAFAF8] p-5', className)}>
      <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
        {label}
      </p>
      <p className={cn('font-mono text-2xl leading-tight font-bold tabular-nums', valueColor)}>
        {value}
      </p>
      {benchmarkPct != null && (
        <div className="mt-3 h-0.5 w-full bg-[#E2E0DA]">
          <div
            className="h-0.5 bg-[#4A7C59] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, benchmarkPct))}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-2 font-mono text-[10px] text-[#9CA3AF]">{sub}</p>}
    </div>
  );
}
