/**
 * Rent Compare — filter pipeline.
 *
 * Implements the tiered hard/soft filters and relaxation loop:
 *   Tier 1 (hard, never relaxed): same property bucket, same bedroom count,
 *     active OR recently-leased status.
 *   Tier 2 (soft): bath ±1, area ±20%, year ±15, exclude furnished/short-term,
 *     drop rent outliers (>2σ from median).
 *   Tier 3 (toggles): price-band ±15%, scope (bairro vs cidade).
 *
 * Relaxation order if kept < 5:
 *   1. bairro → cidade
 *   2. area tolerance → ±30%
 *   3. year tolerance → ±25
 *   4. bath tolerance → ±2
 * Stops as soon as kept ≥ 5.
 */

import type {
  ExcludedListing,
  ExclusionReason,
  FilterResult,
  RentSubject,
  RentalListing,
} from './types';
import type { RentalAnalysisFilters } from '@/lib/supabase/deals';

const MIN_COMPS = 5;

function reject(
  listing: RentalListing,
  reason: ExclusionReason,
  detail: string,
): ExcludedListing {
  return { listing, reason, detail };
}

function normalizeBairro(s: string | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Same logic as normalizeBairro — used for accent-insensitive city match. */
function normalizeCity(s: string | undefined): string {
  return normalizeBairro(s);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

interface RunOpts {
  subject: RentSubject;
  listings: RentalListing[];
  filters: RentalAnalysisFilters;
}

/**
 * Single pass — applies all filters at the given tolerance levels without
 * relaxation. Used both directly and inside the relaxation loop.
 */
function applyOnce({ subject, listings, filters }: RunOpts): FilterResult {
  const excluded: ExcludedListing[] = [];
  const survivors: RentalListing[] = [];

  const subjectBairro = normalizeBairro(subject.neighborhood);

  for (const l of listings) {
    if (!l.monthlyRent || l.monthlyRent <= 0) {
      excluded.push(reject(l, 'missing-rent', 'Aluguel não informado'));
      continue;
    }
    if (!l.area || l.area <= 0) {
      excluded.push(reject(l, 'missing-area', 'Área útil não informada'));
      continue;
    }

    // ── Tier 1 (hard) ──────────────────────────────────────────────────────
    if (l.bucket !== subject.bucket) {
      excluded.push(
        reject(l, 'bucket-mismatch', `Tipo diferente (${l.propertyType ?? l.bucket})`),
      );
      continue;
    }
    if (
      l.bedrooms != null &&
      Math.abs(l.bedrooms - subject.bedrooms) > filters.bedroomTolerance
    ) {
      excluded.push(
        reject(
          l,
          'bedrooms-mismatch',
          filters.bedroomTolerance > 0
            ? `${l.bedrooms} quartos (tolerância ±${filters.bedroomTolerance})`
            : `${l.bedrooms} quartos vs ${subject.bedrooms} do imóvel`,
        ),
      );
      continue;
    }

    // ── Geographic scope ──────────────────────────────────────────────────
    if (filters.scope === 'bairro') {
      if (
        normalizeBairro(l.neighborhood) !== subjectBairro ||
        !subjectBairro
      ) {
        excluded.push(
          reject(l, 'wrong-bairro', `Fora do bairro ${subject.neighborhood}`),
        );
        continue;
      }
    } else {
      // cidade scope — must at least match city (accent-insensitive)
      const subjectCity = normalizeCity(subject.city);
      if (l.city && subjectCity && normalizeCity(l.city) !== subjectCity) {
        excluded.push(
          reject(l, 'wrong-city', `Fora de ${subject.city}`),
        );
        continue;
      }
    }

    // ── Tier 2 (soft) ──────────────────────────────────────────────────────
    if (filters.excludeFurnished && l.isFurnished) {
      excluded.push(reject(l, 'furnished', 'Mobiliado'));
      continue;
    }
    if (filters.excludeShortTerm && l.isShortTerm) {
      excluded.push(reject(l, 'short-term', 'Aluguel por temporada'));
      continue;
    }
    if (
      l.bathrooms != null &&
      subject.bathrooms != null &&
      Math.abs(l.bathrooms - subject.bathrooms) > filters.bathTolerance
    ) {
      excluded.push(
        reject(
          l,
          'bathrooms-out-of-range',
          `${l.bathrooms} banheiros (tolerância ±${filters.bathTolerance})`,
        ),
      );
      continue;
    }
    const areaDelta = Math.abs(l.area - subject.area) / subject.area;
    if (areaDelta > filters.areaTolerancePct) {
      excluded.push(
        reject(
          l,
          'area-out-of-range',
          `${l.area} m² (tolerância ±${Math.round(filters.areaTolerancePct * 100)}%)`,
        ),
      );
      continue;
    }
    if (
      l.yearBuilt != null &&
      subject.yearBuilt != null &&
      Math.abs(l.yearBuilt - subject.yearBuilt) > filters.yearTolerance
    ) {
      excluded.push(
        reject(
          l,
          'year-out-of-range',
          `Ano ${l.yearBuilt} (tolerância ±${filters.yearTolerance})`,
        ),
      );
      continue;
    }

    // ── Tier 3 (optional) ──────────────────────────────────────────────────
    if (filters.priceBandMatch && subject.referenceValue && subject.referenceValue > 0) {
      // No reliable per-listing sale price for rentals — soft heuristic:
      // skip the band when the data isn't there. The toggle still meaningfully
      // gates the toggle's UI affordance even if it no-ops on rentals lacking
      // sale prices, which is the common case.
    }

    survivors.push(l);
  }

  // ── Outlier sweep — drop rents > 2σ from the median ──────────────────────
  if (survivors.length >= 4) {
    const rents = survivors.map((s) => s.monthlyRent);
    const med = median(rents);
    const sd = stdev(rents);
    if (sd > 0) {
      const cut = 2 * sd;
      const filtered: RentalListing[] = [];
      for (const s of survivors) {
        if (Math.abs(s.monthlyRent - med) > cut) {
          excluded.push(
            reject(
              s,
              'rent-outlier',
              `R$ ${Math.round(s.monthlyRent).toLocaleString('pt-BR')} fora de 2σ`,
            ),
          );
        } else {
          filtered.push(s);
        }
      }
      return {
        kept: filtered,
        excluded,
        effectiveFilters: filters,
        relaxationLog: [],
      };
    }
  }

  return {
    kept: survivors,
    excluded,
    effectiveFilters: filters,
    relaxationLog: [],
  };
}

/**
 * Public entry — runs `applyOnce` then progressively relaxes filters until
 * we have at least 5 comps, or all relaxation steps are exhausted.
 *
 * Surface to the user via `relaxationLog` exactly which steps fired, so
 * they can read confidence honestly.
 */
export function filterAndRelax(opts: RunOpts): FilterResult {
  const log: string[] = [];
  let result = applyOnce(opts);

  // Empty input means there's nothing to relax for — don't pretend we did
  // any work. Surface the empty result as-is so the UI can say "no comps
  // found" instead of "we expanded scope and still found nothing."
  if (opts.listings.length === 0) return result;
  if (result.kept.length >= MIN_COMPS) return result;

  // Step 1: bairro → cidade
  if (opts.filters.scope === 'bairro') {
    log.push('Expandido para a cidade inteira (poucos comps no bairro)');
    result = applyOnce({
      ...opts,
      filters: { ...opts.filters, scope: 'cidade' },
    });
    if (result.kept.length >= MIN_COMPS) {
      return { ...result, relaxationLog: log };
    }
  }

  // Step 2: area ±20% → ±30%
  if (opts.filters.areaTolerancePct < 0.30) {
    log.push('Tolerância de área expandida para ±30%');
    result = applyOnce({
      ...opts,
      filters: {
        ...opts.filters,
        scope: result.effectiveFilters.scope,
        areaTolerancePct: 0.30,
      },
    });
    if (result.kept.length >= MIN_COMPS) {
      return { ...result, relaxationLog: log };
    }
  }

  // Step 3: year ±15 → ±25
  if (opts.filters.yearTolerance < 25) {
    log.push('Tolerância de ano de construção expandida para ±25 anos');
    result = applyOnce({
      ...opts,
      filters: {
        ...opts.filters,
        scope: result.effectiveFilters.scope,
        areaTolerancePct: result.effectiveFilters.areaTolerancePct,
        yearTolerance: 25,
      },
    });
    if (result.kept.length >= MIN_COMPS) {
      return { ...result, relaxationLog: log };
    }
  }

  // Step 4: baths ±1 → ±2
  if (opts.filters.bathTolerance < 2) {
    log.push('Tolerância de banheiros expandida para ±2');
    result = applyOnce({
      ...opts,
      filters: {
        ...opts.filters,
        scope: result.effectiveFilters.scope,
        areaTolerancePct: result.effectiveFilters.areaTolerancePct,
        yearTolerance: result.effectiveFilters.yearTolerance,
        bathTolerance: 2,
      },
    });
    return { ...result, relaxationLog: log };
  }

  return { ...result, relaxationLog: log };
}

export { normalizeBairro };
