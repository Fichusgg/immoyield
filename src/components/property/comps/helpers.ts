import type { SalesComp, RentalComp } from '@/lib/supabase/deals';

export type CompMode = 'sales' | 'rentals';

export interface CompCommon {
  id: string;
  address?: string;
  squareMeters: number;
  bedrooms?: number;
  bathrooms?: number;
  sourceUrl?: string;
  notes?: string;
  date?: string;
  /** Sale price OR monthly rent — depending on mode. */
  primaryValue: number;
}

/**
 * Normalize a sales/rental comp into a single shape so the table component
 * can render either kind without conditional plumbing.
 */
export function toCommon(c: SalesComp | RentalComp, mode: CompMode): CompCommon {
  if (mode === 'sales') {
    const s = c as SalesComp;
    return {
      id: s.id,
      address: s.address,
      squareMeters: s.squareMeters,
      bedrooms: s.bedrooms,
      bathrooms: s.bathrooms,
      sourceUrl: s.sourceUrl,
      notes: s.notes,
      date: s.saleDate,
      primaryValue: s.price,
    };
  }
  const r = c as RentalComp;
  return {
    id: r.id,
    address: r.address,
    squareMeters: r.squareMeters,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sourceUrl: r.sourceUrl,
    notes: r.notes,
    date: r.listingDate,
    primaryValue: r.monthlyRent,
  };
}

/** Reverse: rebuild a typed SalesComp / RentalComp from the common shape. */
export function fromCommon(c: CompCommon, mode: CompMode): SalesComp | RentalComp {
  const base = {
    id: c.id,
    address: c.address || undefined,
    squareMeters: c.squareMeters,
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    sourceUrl: c.sourceUrl || undefined,
    notes: c.notes || undefined,
  };
  if (mode === 'sales') {
    return { ...base, price: c.primaryValue, saleDate: c.date || undefined };
  }
  return { ...base, monthlyRent: c.primaryValue, listingDate: c.date || undefined };
}

/** Generate a stable ID — uses crypto.randomUUID when available. */
export function newCompId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Per-square-meter price/rent. Returns 0 if sqm is 0/missing. */
export function pricePerSqm(c: CompCommon): number {
  if (!c.squareMeters || c.squareMeters <= 0) return 0;
  return c.primaryValue / c.squareMeters;
}

/** Median of an array of positive numbers. Returns 0 for empty. */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export interface CompStats {
  count: number;
  /** Mean R$/m². */
  avgPpsm: number;
  /** Median R$/m². */
  medianPpsm: number;
  minPpsm: number;
  maxPpsm: number;
}

export function computeStats(comps: CompCommon[]): CompStats {
  const ppsm = comps
    .map((c) => pricePerSqm(c))
    .filter((v) => v > 0);

  return {
    count: comps.length,
    avgPpsm: avg(ppsm),
    medianPpsm: median(ppsm),
    minPpsm: ppsm.length ? Math.min(...ppsm) : 0,
    maxPpsm: ppsm.length ? Math.max(...ppsm) : 0,
  };
}

/** Suggested ARV / suggested rent based on the median price/m² × subject area. */
export function suggestedFromComps(
  comps: CompCommon[],
  subjectSquareMeters: number | null | undefined
): number {
  if (!subjectSquareMeters || subjectSquareMeters <= 0) return 0;
  const { medianPpsm } = computeStats(comps);
  return medianPpsm * subjectSquareMeters;
}
