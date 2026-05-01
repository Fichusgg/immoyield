import type { SavedDeal } from '@/lib/supabase/deals';
import { PropertySidebar } from './PropertySidebar';

interface Props {
  deal: SavedDeal;
  children: React.ReactNode;
}

/**
 * Two-column property workspace: sticky property sidebar (~270px) on the
 * left, scrollable page content on the right.
 */
export function PropertyWorkspace({ deal, children }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-6 py-6 lg:gap-8">
      <PropertySidebar deal={deal} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
