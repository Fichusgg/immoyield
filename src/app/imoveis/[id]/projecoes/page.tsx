import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { PlaceholderPage } from '@/components/property/PlaceholderPage';
import { loadDealForWorkspace } from '@/components/property/loadDeal';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjecoesPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'projecoes');

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
            title="Projeções"
            breadcrumb={[
              { label: 'Imóveis', href: '/propriedades' },
              { label: deal.title, href: `/imoveis/${deal.id}/analise` },
              { label: 'Projeções' },
            ]}
            helper="Projeções de longo prazo (1, 2, 3, 5, 10, 20, 30 anos) — patrimônio, fluxo, equity acumulada."
            description="A página de Projeções (Comprar e Manter) está em construção. Os parâmetros de longo prazo já podem ser ajustados na Planilha de Compra."
          />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
