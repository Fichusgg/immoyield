import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import { ComparablesContent } from '@/components/property/comps/ComparablesContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompsVendasPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'comps-vendas');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav
        userEmail={userEmail}
      />
      <main className="flex-1">
        <PropertyWorkspace deal={deal}>
          <ComparablesContent deal={deal} mode="sales" />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
