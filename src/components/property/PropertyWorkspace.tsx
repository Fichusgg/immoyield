import type { SavedDeal } from '@/lib/supabase/deals';
import { PropertySidebar } from './PropertySidebar';

interface Props {
  deal: SavedDeal;
  children: React.ReactNode;
}

/**
 * Two-column property workspace: independent scroll containers — sidebar
 * (~270px) on the left, page content on the right. Each scrolls on its own
 * within the viewport height available below the top nav.
 */
export function PropertyWorkspace({ deal, children }: Props) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] gap-6 px-6 py-6 lg:gap-8">
      <PropertySidebar deal={deal} />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
