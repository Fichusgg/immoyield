import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { PlaceholderPage } from '@/components/property/PlaceholderPage';
import { loadDealForWorkspace } from '@/components/property/loadDeal';

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
        breadcrumb={[
          { label: 'Imóveis', href: '/propriedades' },
          { label: deal.title },
        ]}
      />
      <main className="flex-1">
        <PropertyWorkspace deal={deal}>
          <PlaceholderPage
            title="Comparáveis de Venda"
            breadcrumb={[
              { label: 'Imóveis', href: '/propriedades' },
              { label: deal.title, href: `/imoveis/${deal.id}/analise` },
              { label: 'Comparáveis de Venda' },
            ]}
            helper="Encontre vendas recentes de imóveis similares para validar o ARV."
            description="A busca por comparáveis de venda (ARV) está em construção. Será integrada com bases públicas de cartórios e portais."
          />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
