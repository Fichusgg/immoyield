/**
 * Search-layer types for rental comp discovery.
 * Distinct from the per-listing scraper shapes (`ScrapedProperty`) — search
 * scrapers return arrays of compact `RentalListing`s and don't deep-extract
 * each ad.
 */

import type { RentalListing } from '@/lib/rent-compare/types';

export interface RentalSearchQuery {
  city: string;
  neighborhood: string;
  state?: string;
  /** Number of bedrooms — exact match. */
  bedrooms: number;
  /** 'apartment' or 'house' bucket. */
  bucket: 'apartment' | 'house';
}

export interface RentalSearchResult {
  source: 'vivareal' | 'quintoandar' | 'zap';
  listings: RentalListing[];
  /** Empty when scraper returned nothing OR errored. `error` populated on failure. */
  error?: string;
  /** Original search URL — useful for debugging. */
  searchUrl?: string;
}
