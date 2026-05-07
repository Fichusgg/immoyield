import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import { RentCompareContent } from '@/components/property/comps/RentCompareContent';
import { CompareRentLocked } from '@/components/billing/CompareRentLocked';
import { createClient } from '@/lib/supabase/server';
import { canAccessCompareRent, getUserEntitlement } from '@/lib/entitlements';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompsAluguelPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'comps-aluguel');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entitlement = user ? await getUserEntitlement(supabase, user.id) : null;
  const unlocked = entitlement ? canAccessCompareRent(entitlement) : false;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8F7F4]">
      <TopNav userEmail={userEmail} />
      <main className="min-h-0 flex-1">
        <PropertyWorkspace deal={deal}>
          {unlocked ? (
            <RentCompareContent deal={deal} />
          ) : (
            <div className="px-4 py-10">
              <CompareRentLocked />
            </div>
          )}
        </PropertyWorkspace>
      </main>
    </div>
  );
}
