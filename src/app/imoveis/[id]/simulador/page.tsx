import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import SimuladorContent from './SimuladorContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SimuladorPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'simulador');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8F7F4]">
      <TopNav userEmail={userEmail} />
      <main className="min-h-0 flex-1">
        <PropertyWorkspace deal={deal}>
          <SimuladorContent deal={deal} />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
