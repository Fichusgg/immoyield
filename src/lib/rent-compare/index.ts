/**
 * Rent Compare — public entry. Composes filter + score + summary into the
 * single result the UI/route consume.
 */

import { filterAndRelax } from './filter';
import { scoreComps, summarize } from './score';
import type {
  RentCompareResult,
  RentSubject,
  RentalListing,
} from './types';
import { DEFAULT_FILTERS } from './types';
import type { RentalAnalysisFilters, SavedDeal, RentalComp } from '@/lib/supabase/deals';

export * from './types';
export { filterAndRelax } from './filter';
export { scoreComps, summarize, computeConfidence } from './score';

/**
 * One-shot pipeline: filter (with relaxation) → score → summarize.
 * `excludedIds` pre-strips comps the user has manually unchecked.
 * `forceIncludedIds` bypasses the filter pipeline for specific listings — they
 * always end up in `kept`, even when they would otherwise be rejected.
 */
export function analyzeRentComps({
  subject,
  listings,
  filters = DEFAULT_FILTERS,
  excludedIds = [],
  forceIncludedIds = [],
}: {
  subject: RentSubject;
  listings: RentalListing[];
  filters?: RentalAnalysisFilters;
  excludedIds?: string[];
  forceIncludedIds?: string[];
}): RentCompareResult {
  const excluded = new Set(excludedIds);
  const forced = new Set(forceIncludedIds);
  const candidates = listings.filter((l) => !excluded.has(l.id) && !forced.has(l.id));
  const forceList = listings.filter((l) => forced.has(l.id) && !excluded.has(l.id));

  const filterResult = filterAndRelax({ subject, listings: candidates, filters });
  // Force-included listings are appended to `kept` and stripped from `excluded`
  // regardless of why they were originally rejected.
  const mergedKept = [...filterResult.kept, ...forceList];
  const mergedExcluded = filterResult.excluded.filter((e) => !forced.has(e.listing.id));

  const { score, scored } = scoreComps(
    subject,
    mergedKept,
    filterResult.relaxationLog.length,
  );
  const summary = summarize(subject, scored, score, filterResult.relaxationLog);

  return {
    filterResult: {
      ...filterResult,
      kept: mergedKept,
      excluded: mergedExcluded,
    },
    score,
    summary,
  };
}

// ── Helpers for translating between RentalListing and RentalComp ───────────
//
// The DB column `comps.rentals` stores RentalComp[]. The Rent Compare module
// works on RentalListing. These two converters keep the boundary clean.

export function listingToRentalComp(l: RentalListing): RentalComp {
  return {
    id: l.id,
    address: [l.street, l.neighborhood, l.city].filter(Boolean).join(', ') || undefined,
    monthlyRent: l.monthlyRent,
    squareMeters: l.area ?? 0,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    listingDate: l.listedAt?.slice(0, 10) ?? l.scrapedAt.slice(0, 10),
    sourceUrl: l.url,
    notes: l.status === 'leased' ? 'Alugado recentemente' : undefined,
    source: l.source,
    status: l.status,
    neighborhood: l.neighborhood,
    city: l.city,
    propertyType: l.propertyType,
    yearBuilt: l.yearBuilt,
    isFurnished: l.isFurnished,
    isShortTerm: l.isShortTerm,
    condoFee: l.condoFee,
    listedAt: l.listedAt,
    leasedAt: l.leasedAt,
  };
}

export function rentalCompToListing(c: RentalComp): RentalListing | null {
  // Manual entries without enough data can't be re-scored.
  if (!c.monthlyRent || !c.squareMeters) return null;

  // Bucket inference for manual comps (no propertyType): default 'apartment'.
  // We only call this when re-hydrating saved auto-imported comps, so the
  // propertyType is usually set; fallback covers the edge case.
  const bucket: 'apartment' | 'house' =
    c.propertyType && /casa|sobrado|chacara|chácara/i.test(c.propertyType)
      ? 'house'
      : 'apartment';

  return {
    id: c.id,
    source: c.source ?? 'manual',
    url: c.sourceUrl ?? '',
    scrapedAt: c.listedAt ?? new Date().toISOString(),
    street: c.address,
    neighborhood: c.neighborhood,
    city: c.city,
    propertyType: c.propertyType,
    bucket,
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    area: c.squareMeters,
    yearBuilt: c.yearBuilt,
    monthlyRent: c.monthlyRent,
    condoFee: c.condoFee,
    status: c.status ?? 'active',
    isFurnished: c.isFurnished,
    isShortTerm: c.isShortTerm,
    listedAt: c.listedAt,
    leasedAt: c.leasedAt,
  };
}

// ── Subject derivation from a SavedDeal ────────────────────────────────────
//
// Returns either a usable RentSubject or a list of which required fields
// are missing — the UI surfaces the missing list so users know exactly
// what to fill in instead of seeing a generic "preencha o imóvel" message.
export type SubjectMissingField = 'cidade' | 'bairro' | 'quartos' | 'área';

export function deriveSubject(
  deal: SavedDeal,
): { subject: RentSubject; missing: [] } | { subject: null; missing: SubjectMissingField[] } {
  const city = deal.city?.trim() || deal.inputs?.property?.address?.city?.trim();
  const neighborhood =
    deal.neighborhood?.trim() ||
    deal.inputs?.property?.address?.neighborhood?.trim();
  const bedrooms = deal.bedrooms ?? deal.inputs?.property?.bedrooms ?? null;
  const area = deal.area ?? deal.inputs?.property?.squareFootage ?? null;

  const missing: SubjectMissingField[] = [];
  if (!city) missing.push('cidade');
  if (!neighborhood) missing.push('bairro');
  if (bedrooms == null) missing.push('quartos');
  if (!area || area <= 0) missing.push('área');
  if (missing.length > 0) return { subject: null, missing };

  // Type → bucket. Treat null/unknown as apartment (the dominant BR case for
  // urban deals; the user can override by changing the deal type field).
  const rawType = (deal.type ?? '').toLowerCase();
  const bucket: 'apartment' | 'house' =
    rawType === 'house' || /casa|sobrado/.test(rawType) ? 'house' : 'apartment';

  return {
    subject: {
      city: city!,
      neighborhood: neighborhood!,
      state: deal.state ?? deal.inputs?.property?.address?.region ?? undefined,
      bucket,
      propertyType: deal.type ?? undefined,
      bedrooms: bedrooms!,
      bathrooms: deal.bathrooms ?? undefined,
      area: area!,
      yearBuilt: deal.inputs?.property?.yearBuilt ?? undefined,
      referenceValue: deal.market_value ?? deal.price ?? undefined,
    },
    missing: [],
  };
}
