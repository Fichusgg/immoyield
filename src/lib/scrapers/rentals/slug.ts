/**
 * URL slug helpers for BR portal search routes.
 * VivaReal, ZAP, and Quinto Andar all use lowercased, accent-stripped,
 * dash-separated tokens for city / bairro / state.
 *
 *   "São Paulo" → "sao-paulo"
 *   "Vila Madalena" → "vila-madalena"
 *   "Higienópolis" → "higienopolis"
 */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BR_STATE_NAME_TO_UF: Record<string, string> = {
  'acre': 'ac',
  'alagoas': 'al',
  'amapa': 'ap',
  'amazonas': 'am',
  'bahia': 'ba',
  'ceara': 'ce',
  'distrito federal': 'df',
  'espirito santo': 'es',
  'goias': 'go',
  'maranhao': 'ma',
  'mato grosso': 'mt',
  'mato grosso do sul': 'ms',
  'minas gerais': 'mg',
  'para': 'pa',
  'paraiba': 'pb',
  'parana': 'pr',
  'pernambuco': 'pe',
  'piaui': 'pi',
  'rio de janeiro': 'rj',
  'rio grande do norte': 'rn',
  'rio grande do sul': 'rs',
  'rondonia': 'ro',
  'roraima': 'rr',
  'santa catarina': 'sc',
  'sao paulo': 'sp',
  'sergipe': 'se',
  'tocantins': 'to',
};

/** Normalize either a UF code or a full state name to a 2-letter UF (lowercased). */
export function toUf(state: string | undefined): string | undefined {
  if (!state) return undefined;
  const t = state.trim().toLowerCase();
  if (t.length === 2) return t;
  const stripped = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return BR_STATE_NAME_TO_UF[stripped] ?? undefined;
}

const UF_TO_STATE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(BR_STATE_NAME_TO_UF).map(([name, uf]) => [uf, name]),
);

/**
 * Returns the full state-name slug for a UF (e.g. "sc" → "santa-catarina").
 * Vivareal uses this form in URLs for most states; only SP and RJ accept
 * the bare UF. Falls back to the UF itself if the mapping is missing.
 */
export function toStateNameSlug(state: string | undefined): string | undefined {
  const uf = toUf(state);
  if (!uf) return undefined;
  const name = UF_TO_STATE_NAME[uf];
  return name ? slugify(name) : uf;
}
