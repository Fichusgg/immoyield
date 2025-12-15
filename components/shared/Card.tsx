import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div
      className={`
        rounded-xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        shadow-sm
        ${paddings[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

