/**
 * Rent Compare — types shared by the search, filter, score, and UI layers.
 *
 * Glossary:
 *   - subject: the property the user is analyzing (from SavedDeal).
 *   - listing: a raw rental returned by a scraper (active ad or recently-leased).
 *   - comp: a listing that passed the filters and counts toward the market rent.
 *
 * All money in BRL/month. All area in m². No coordinates — geographic matching
 * is bairro/cidade only because BR portals rarely expose precise lat/long.
 */

import type { RentalAnalysisFilters } from '@/lib/supabase/deals';

export type RentalSource = 'vivareal' | 'quintoandar' | 'zap' | 'manual';
export type RentalStatus = 'active' | 'leased';

/**
 * Two-bucket BR property type for cross-bucket guard.
 * apartment-like: apartamento, cobertura, studio, kitnet, flat
 * house-like: casa, sobrado
 */
export type PropertyBucket = 'apartment' | 'house';

export interface RentalListing {
  /** Stable id — usually source + listingId, fallback URL hash. */
  id: string;
  source: RentalSource;
  url: string;
  /** ISO timestamp when the scraper extracted the data. */
  scrapedAt: string;

  // Location
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // Specs
  /** Granular BR type label as advertised. */
  propertyType?: string;
  bucket: PropertyBucket;
  bedrooms?: number;
  bathrooms?: number;
  /** Usable area in m². */
  area?: number;
  yearBuilt?: number;

  // Financials
  monthlyRent: number;
  /** Condomínio fee. Shown but NOT added to rent for comparison. */
  condoFee?: number;

  // Listing meta
  status: RentalStatus;
  isFurnished?: boolean;
  isShortTerm?: boolean;
  /** ISO date the ad went live. */
  listedAt?: string;
  /** ISO date the unit leased — only present for leased comps. */
  leasedAt?: string;
}

/** Subject property normalized for the matcher. */
export interface RentSubject {
  city: string;
  /** Bairro name as stored on the deal. */
  neighborhood: string;
  state?: string;
  bucket: PropertyBucket;
  /** Granular type — used only for display, not matching. */
  propertyType?: string;
  bedrooms: number;
  bathrooms?: number;
  /** m² */
  area: number;
  yearBuilt?: number;
  /** Purchase price or estimated value — used by the optional Tier 3 price-band toggle. */
  referenceValue?: number;
}

export interface ExcludedListing {
  listing: RentalListing;
  /** Tag for the reason the filter pipeline rejected it. */
  reason: ExclusionReason;
  /** PT-BR human-readable detail. */
  detail: string;
}

export type ExclusionReason =
  | 'bucket-mismatch'
  | 'bedrooms-mismatch'
  | 'bathrooms-out-of-range'
  | 'area-out-of-range'
  | 'year-out-of-range'
  | 'furnished'
  | 'short-term'
  | 'rent-outlier'
  | 'price-band-mismatch'
  | 'wrong-bairro'
  | 'wrong-city'
  | 'missing-rent'
  | 'missing-area';

export interface FilterResult {
  /** Comps that passed all enabled filters. */
  kept: RentalListing[];
  /** Listings rejected by the filter pipeline, with reasons. */
  excluded: ExcludedListing[];
  /** Effective filters used after relaxation. */
  effectiveFilters: RentalAnalysisFilters;
  /** Ordered log of relaxation steps that were actually applied. */
  relaxationLog: string[];
}

export interface ScoredComp {
  listing: RentalListing;
  /** R$/m² for this comp. */
  pricePerM2: number;
  /** Rent estimated for the SUBJECT, derived as pricePerM2 × subject.area. */
  estimatedRentForSubject: number;
  /** Weight used in median/percentile calc (1.0 leased, 0.7 active). */
  weight: number;
}

export interface RentScore {
  count: number;
  /** Weighted median rent for the subject (BRL/month). */
  suggestedRent: number;
  iqrLow: number;
  iqrHigh: number;
  /** Median R$/m² across kept comps. */
  pricePerM2Median: number;
  confidence: 'alta' | 'media' | 'baixa';
  confidenceReason: string;
  /** Ratio of leased comps in the set. */
  leasedShare: number;
  /** IQR / median — tightness indicator. */
  iqrRatio: number;
}

export interface RentCompareResult {
  filterResult: FilterResult;
  score: RentScore;
  /** Plain PT-BR summary sentence. */
  summary: string;
}

export const DEFAULT_FILTERS: RentalAnalysisFilters = {
  scope: 'bairro',
  areaTolerancePct: 0.20,
  bedroomTolerance: 0,
  bathTolerance: 1,
  yearTolerance: 15,
  priceBandMatch: false,
  excludeFurnished: true,
  excludeShortTerm: true,
};
