import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import ScoreContent from './ScoreContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScorePage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'score');

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F7F4]">
      <TopNav
        userEmail={userEmail}
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title },
        ]}
      />
      <main className="flex-1">
        <PropertyWorkspace deal={deal}>
          <ScoreContent deal={deal} />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
