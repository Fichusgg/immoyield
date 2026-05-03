import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import { RentCompareContent } from '@/components/property/comps/RentCompareContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompsAluguelPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'comps-aluguel');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav userEmail={userEmail} />
      <main className="flex-1">
        <PropertyWorkspace deal={deal}>
          <RentCompareContent deal={deal} />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
