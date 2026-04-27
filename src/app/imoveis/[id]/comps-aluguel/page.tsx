import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { PlaceholderPage } from '@/components/property/PlaceholderPage';
import { loadDealForWorkspace } from '@/components/property/loadDeal';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompsAluguelPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'comps-aluguel');

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
          <PlaceholderPage
            title="Comparáveis de Aluguel"
            breadcrumb={[
              { label: 'Imóveis', href: '/propriedades' },
              { label: deal.title, href: `/imoveis/${deal.id}/analise` },
              { label: 'Comparáveis de Aluguel' },
            ]}
            helper="Encontre aluguéis de imóveis similares na vizinhança para precificar."
            description="A busca por comparáveis de aluguel está em construção. Será integrada com QuintoAndar, Zap, VivaReal e outros portais."
          />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
