import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  /** One-line helper text under the breadcrumb. */
  helper?: React.ReactNode;
  /** Top-right outlined-pill action buttons. */
  actions?: React.ReactNode;
}

/**
 * Standard page header for every property workspace sub-page.
 * Title (large, primary color) + breadcrumb + optional helper + actions.
 */
export function PageHeader({ title, breadcrumb, helper, actions }: Props) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#4A7C59]">{title}</h1>
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Trilha" className="mt-1.5 flex flex-wrap items-center gap-1">
              {breadcrumb.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-[#D0CEC8]" />}
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="font-mono text-[11px] text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-mono text-[11px] text-[#6B7280]">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {helper && <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">{helper}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
