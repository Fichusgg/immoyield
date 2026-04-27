import { PageHeader, type BreadcrumbItem } from './PageHeader';
import { ComingSoonPanel } from './ComingSoonPanel';

interface Props {
  title: string;
  breadcrumb: BreadcrumbItem[];
  description: React.ReactNode;
  /** Optional preview content rendered behind the "Em Breve" overlay. */
  preview?: React.ReactNode;
  helper?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Reused by Fotos, Mapa, Projeções, Comparáveis — all the property-workspace
 * sub-pages that are nav-targets but not yet built.
 */
export function PlaceholderPage({
  title,
  breadcrumb,
  description,
  preview,
  helper,
  actions,
}: Props) {
  return (
    <>
      <PageHeader title={title} breadcrumb={breadcrumb} helper={helper} actions={actions} />
      <ComingSoonPanel title={title} description={description} preview={preview} />
    </>
  );
}
