import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center py-16 text-center', className)}>
      <span className="text-8xl font-bold tabular-nums text-[#E2E0DA]">0</span>
      <p className="mt-4 text-sm font-semibold text-[#1C2B20]">{title}</p>
      {description && <p className="mt-1 text-xs text-[#6B7480]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
