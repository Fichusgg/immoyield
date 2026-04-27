import { cn } from '@/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Compact removes vertical padding for footer/total rows etc. */
  compact?: boolean;
}

/**
 * White card with thin row dividers between direct children.
 * Pair with <SectionHeading /> above it.
 */
export function FormCard({ children, className, compact, ...rest }: Props) {
  return (
    <div
      className={cn(
        'overflow-hidden border border-[#E2E0DA] bg-[#FAFAF8]',
        compact ? 'p-0' : '',
        className
      )}
      {...rest}
    >
      <div className="divide-y divide-[#F0EFEB]">{children}</div>
    </div>
  );
}
