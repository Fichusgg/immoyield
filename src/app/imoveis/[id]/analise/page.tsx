import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import AnaliseContent from './AnaliseContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnalisePage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'analise');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav
        userEmail={userEmail}
      />
      <main className="flex-1">
        <PropertyWorkspace deal={deal}>
          <AnaliseContent deal={deal} />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
