import {
  Home,
  Pencil,
  Image as ImageIcon,
  MapPin,
  BarChart2,
  TrendingUp,
  Award,
  Sliders,
  DollarSign,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';

export interface PropertyNavItem {
  /** URL slug appended to /imoveis/[id]/. */
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Optional group heading shown above this item. */
  group?: string;
  /** True if not yet built — renders as "Em Breve". */
  comingSoon?: boolean;
}

/**
 * Single source of truth for the per-property left sidebar nav.
 * Order matters — render in this exact sequence.
 */
export const PROPERTY_NAV: PropertyNavItem[] = [
  { slug: 'descricao', label: 'Descrição', icon: Home },
  { slug: 'planilha', label: 'Planilha de Compra', icon: Pencil },
  { slug: 'fotos', label: 'Fotos', icon: ImageIcon },
  { slug: 'mapa', label: 'Mapa', icon: MapPin, comingSoon: true },

  { slug: 'analise', label: 'Análise', icon: BarChart2, group: 'ANÁLISE' },
  { slug: 'simulador', label: 'Simulador', icon: Sliders },
  { slug: 'projecoes', label: 'Projeções', icon: TrendingUp },
  { slug: 'score', label: 'ImmoScore', icon: Award },

  {
    slug: 'comps-vendas',
    label: 'Comparáveis de Venda',
    icon: DollarSign,
    group: 'PESQUISA',
  },
  {
    slug: 'comps-aluguel',
    label: 'Comparáveis de Aluguel',
    icon: Thermometer,
  },
];

export const DEFAULT_PROPERTY_SECTION = 'analise';
