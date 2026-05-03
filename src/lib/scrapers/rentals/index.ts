/**
 * Rental search dispatcher.
 *
 * Fans out to the per-portal scrapers in parallel, dedupes overlap by
 * (rough address + area + rent) fingerprint, and returns a flat
 * RentalListing[] plus per-source telemetry.
 */

import { searchVivarealRentals } from './vivareal-search';
import { searchQuintoAndarRentals } from './quintoandar-search';
import type { RentalListing } from '@/lib/rent-compare/types';
import type { RentalSearchQuery, RentalSearchResult } from './types';

export type { RentalSearchQuery, RentalSearchResult };

interface AggregateResult {
  listings: RentalListing[];
  perSource: RentalSearchResult[];
  /** Sources that returned at least one listing. */
  sourcesUsed: string[];
}

function fingerprint(l: RentalListing): string {
  const street = (l.street ?? '').toLowerCase().trim();
  const bairro = (l.neighborhood ?? '').toLowerCase().trim();
  return `${street}|${bairro}|${l.area ?? '?'}|${l.bedrooms ?? '?'}|${Math.round(l.monthlyRent / 50) * 50}`;
}

export async function searchRentals(
  query: RentalSearchQuery,
): Promise<AggregateResult> {
  const [vr, qa] = await Promise.allSettled([
    searchVivarealRentals(query),
    searchQuintoAndarRentals(query),
  ]);

  const perSource: RentalSearchResult[] = [];
  if (vr.status === 'fulfilled') perSource.push(vr.value);
  else perSource.push({ source: 'vivareal', listings: [], error: String(vr.reason) });
  if (qa.status === 'fulfilled') perSource.push(qa.value);
  else perSource.push({ source: 'quintoandar', listings: [], error: String(qa.reason) });

  // Dedupe — prefer 'leased' over 'active' on a tie (more informative).
  const map = new Map<string, RentalListing>();
  for (const r of perSource) {
    for (const l of r.listings) {
      const key = fingerprint(l);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, l);
        continue;
      }
      if (existing.status === 'active' && l.status === 'leased') {
        map.set(key, l);
      }
    }
  }

  const listings = [...map.values()];
  const sourcesUsed = perSource.filter((r) => r.listings.length > 0).map((r) => r.source);
  return { listings, perSource, sourcesUsed };
}
