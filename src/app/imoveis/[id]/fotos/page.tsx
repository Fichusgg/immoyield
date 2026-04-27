import TopNav from '@/components/layout/TopNav';
import { PropertyWorkspace } from '@/components/property/PropertyWorkspace';
import { PlaceholderPage } from '@/components/property/PlaceholderPage';
import { loadDealForWorkspace } from '@/components/property/loadDeal';
import { ImagePlus, Pencil } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FotosPage({ params }: Props) {
  const { id } = await params;
  const { deal, userEmail } = await loadDealForWorkspace(id, 'fotos');

  // Render existing imported photos behind the overlay so users see what's there.
  const photos = deal.photos ?? [];

  const preview =
    photos.length > 0 ? (
      <div className="grid grid-cols-2 gap-2 p-6 sm:grid-cols-3 lg:grid-cols-4">
        {photos.slice(0, 8).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="aspect-square w-full rounded-md object-cover"
          />
        ))}
      </div>
    ) : null;

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
            title="Fotos"
            breadcrumb={[
              { label: 'Imóveis', href: '/propriedades' },
              { label: deal.title, href: `/imoveis/${deal.id}/analise` },
              { label: 'Fotos' },
            ]}
            helper="Gerencie fotos do imóvel — galeria, capa e upload."
            actions={
              <>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#9CA3AF] disabled:cursor-not-allowed"
                >
                  <Pencil size={12} />
                  Editar Fotos
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E0DA] bg-[#FAFAF8] px-3.5 py-1.5 text-xs font-medium text-[#9CA3AF] disabled:cursor-not-allowed"
                >
                  <ImagePlus size={12} />
                  Adicionar Fotos
                </button>
              </>
            }
            description={
              <>
                A galeria de fotos com upload, capa e zoom será habilitada quando os
                buckets do Supabase Storage estiverem provisionados.
                {photos.length > 0 && (
                  <span className="mt-2 block text-[#4A7C59]">
                    {photos.length} foto{photos.length === 1 ? '' : 's'} importada
                    {photos.length === 1 ? '' : 's'} do anúncio original.
                  </span>
                )}
              </>
            }
            preview={preview}
          />
        </PropertyWorkspace>
      </main>
    </div>
  );
}
