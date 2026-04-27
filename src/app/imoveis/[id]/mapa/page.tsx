import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { PlaceholderPage } from '@/components/property/PlaceholderPage';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import { Navigation, ExternalLink } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MapaPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'mapa');

  const address = [deal.street, deal.neighborhood, deal.city, deal.state, deal.zip_code]
    .filter(Boolean)
    .join(', ');
  const directionsHref = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null;

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
            title="Mapa"
            breadcrumb={[
              { label: 'Imóveis', href: '/propriedades' },
              { label: deal.title, href: `/imoveis/${deal.id}/analise` },
              { label: 'Mapa' },
            ]}
            helper={
              address
                ? `Endereço cadastrado: ${address}`
                : 'Adicione um endereço completo na Descrição para habilitar o mapa.'
            }
            actions={
              <>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#9CA3AF] disabled:cursor-not-allowed"
                >
                  <Navigation size={12} />
                  Minha Localização
                </button>
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#1C2B20] transition-colors hover:border-[#4A7C59] hover:text-[#4A7C59]"
                  >
                    <ExternalLink size={12} />
                    Como Chegar
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#9CA3AF] disabled:cursor-not-allowed"
                  >
                    <ExternalLink size={12} />
                    Como Chegar
                  </button>
                )}
              </>
            }
            description={
              <>
                O mapa interativo será habilitado quando uma chave do Google Maps (ou
                Mapbox) estiver configurada. Por enquanto, use o botão{' '}
                <strong>Como Chegar</strong> acima para abrir o endereço no Google Maps.
              </>
            }
          />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
