import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import FotosContent from './FotosContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FotosPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'fotos');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8F7F4]">
      <TopNav
        userEmail={userEmail}
      />
      <main className="min-h-0 flex-1">
        <PropertyWorkspace deal={deal}>
          <FotosContent deal={deal} />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
