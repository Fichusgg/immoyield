import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Default property route → Análise.
 * The full property workspace lives in nested sub-routes
 * (descricao, planilha, fotos, mapa, analise, projecoes,
 *  comps-aluguel) — see src/components/property/sidebar-nav.ts.
 */
export default async function ImoveisIndexPage({ params }: Props) {
  const { id } = await params;
  redirect(`/imoveis/${id}/analise`);
}
