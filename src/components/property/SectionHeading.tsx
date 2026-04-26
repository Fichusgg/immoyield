import { cn } from '@/lib/utils';

interface Props {
  label: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Uppercase section label that sits OUTSIDE a card, with the FormCard
 * directly beneath it. Optional right-aligned slot for actions like
 * "Copiar" or "Ver tutorial".
 */
export function SectionHeading({ label, rightSlot, className }: Props) {
  return (
    <div className={cn('mb-2 flex items-center justify-between px-1', className)}>
      <h3 className="text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
        {label}
      </h3>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}
