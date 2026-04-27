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
