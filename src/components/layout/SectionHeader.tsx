import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  align?: 'left' | 'center';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
  align = 'left',
}: SectionHeaderProps) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow && (
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.12em] text-[#6B7480] uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-[#1C2B20]">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{description}</p>}
    </div>
  );
}
