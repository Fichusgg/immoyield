import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  variant?: 'marketing' | 'app';
  className?: string;
}

export function PageContainer({ children, variant = 'marketing', className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 md:px-6',
        variant === 'marketing' ? 'max-w-[64rem]' : 'max-w-[72rem]',
        className
      )}
    >
      {children}
    </div>
  );
}
