/**
 * Shared pt-BR / BRL formatters used across the property workspace.
 * Keep number/currency rendering consistent — never inline new Intl calls.
 */

export const brl = (v: number, opts?: { compact?: boolean; sign?: boolean }) => {
  if (opts?.compact) {
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}mi`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  }
  const s = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Math.abs(v));
  if (opts?.sign && v > 0) return `+ ${s}`;
  if (v < 0) return `− ${s}`;
  return s;
};

export const pct = (v: number, fractionDigits = 2) =>
  `${v.toFixed(fractionDigits).replace('.', ',')}%`;

export const num = (v: number, fractionDigits = 0) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(v);

export const area = (v: number) => `${num(v)} m²`;

export const ymd = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

// ── Save-time normalizers ────────────────────────────────────────────────────
//
// The `deals.state` column is `char(2)` and `deals.type` has a CHECK
// constraint — values outside the allowed set reject the entire UPDATE.
// These helpers coerce common user input ("São Paulo", "Cobertura", …) into
// values the database will accept, so a small UI/data drift can't break save.

const BR_STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA',
  ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO',
  maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR',
  pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO',
  roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE',
  tocantins: 'TO',
};

export function normalizeState(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.length <= 2) return t.toUpperCase();
  const stripped = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return BR_STATE_NAME_TO_UF[stripped] ?? t.slice(0, 2).toUpperCase();
}

const TYPE_TO_DB: Record<string, 'apartment' | 'house' | 'commercial' | 'land' | 'other'> = {
  apartment: 'apartment',
  condo: 'apartment',       // Cobertura → apartamento
  house: 'house',
  townhouse: 'house',       // Sobrado → casa
  multifamily: 'house',     // Multifamiliar → casa (closest allowed)
  commercial: 'commercial',
  land: 'land',
  other: 'other',
};

export function normalizeType(raw: string): 'apartment' | 'house' | 'commercial' | 'land' | 'other' {
  return TYPE_TO_DB[raw] ?? 'other';
}
