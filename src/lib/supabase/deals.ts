import { createClient } from '@/lib/supabase/client';
import type { DealInput } from '@/lib/validations/deal';
import type { AnalysisResult } from '@/components/deals/ResultsScreen';

// ── SavedDeal ─────────────────────────────────────────────────────────────────
// Mirrors the actual deals table columns that the app reads.
// Columns added per migration history:
//   001 — title, type, listing_type, price, condo_fee, iptu, area, bedrooms,
//          bathrooms, suites, parking_spots, street, neighborhood, city, state,
//          photos, agent_name, source_url, notes, status, created_at, updated_at
//   002 — zip_code, description, market_value, price_per_sqm
//   003 — property_type, inputs, results_cache

export interface SavedDeal {
  // Identity
  id: string;
  user_id: string;

  // Display / search — canonical name field in the DB
  title: string;

  // Investment strategy (wizard flow: residential | airbnb | flip | …)
  property_type: string | null;

  // Physical structure (import flow: apartment | house | commercial | land | other)
  type: string | null;

  // Listing meta
  listing_type: string | null;
  status: string;

  // Financials
  price: number | null;
  condo_fee: number | null;
  iptu: number | null;
  price_per_sqm: number | null;
  market_value: number | null;

  // Property specs
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suites: number | null;
  parking_spots: number | null;

  // Location
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;

  // Media / agent
  photos: string[] | null;
  agent_name: string | null;
  source_url: string | null;
  description: string | null;
  notes: string | null;

  // Wizard analysis snapshot (null for listing-imported deals)
  inputs: DealInput | null;
  results_cache: AnalysisResult | null;

  // Manually-entered + auto-imported sales / rental comparables (migration 004)
  comps: {
    sales?: SalesComp[];
    rentals?: RentalComp[];
    rentalAnalysis?: RentalAnalysisSnapshot;
  } | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ── Comp shapes — see migration 004 ──────────────────────────────────────────

export interface SalesComp {
  id: string;
  address?: string;
  /** Sale price (or asking price for active listings). */
  price: number;
  squareMeters: number;
  bedrooms?: number;
  bathrooms?: number;
  /** YYYY-MM-DD */
  saleDate?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface RentalComp {
  id: string;
  address?: string;
  monthlyRent: number;
  squareMeters: number;
  bedrooms?: number;
  bathrooms?: number;
  /** YYYY-MM-DD */
  listingDate?: string;
  sourceUrl?: string;
  notes?: string;

  // ── Auto-imported metadata (Rent Compare) — optional, undefined for manual entries
  /** Where the comp came from. 'manual' = user-entered. */
  source?: 'manual' | 'vivareal' | 'quintoandar' | 'zap';
  /** Active listing vs. recently leased (Quinto Andar surfaces leased data). */
  status?: 'active' | 'leased';
  /** Bairro from the source listing — used for filtering/grouping. */
  neighborhood?: string;
  city?: string;
  /** BR property kind, granular: apartamento / casa / sobrado / studio / kitnet / cobertura. */
  propertyType?: string;
  yearBuilt?: number;
  isFurnished?: boolean;
  /** Short-term / temporada / Airbnb. Excluded from market-rent calc. */
  isShortTerm?: boolean;
  /** Monthly condomínio fee (BRL). Shown for context, not added to rent. */
  condoFee?: number;
  /** ISO date — when the listing went live. */
  listedAt?: string;
  /** ISO date — when it leased (Quinto Andar only). */
  leasedAt?: string;
  /** Days the listing has been active (for active comps). */
  daysOnMarket?: number;
  /** Days since the unit leased (for leased comps). */
  daysSinceLeased?: number;
}

// ── Rent Compare analysis snapshot ──────────────────────────────────────────
// Persisted alongside `rentals` so re-opening the tab restores the last run
// without re-scraping.
export interface RentalAnalysisFilters {
  scope: 'bairro' | 'cidade';
  areaTolerancePct: number;        // e.g. 0.20 for ±20%
  bedroomTolerance: number;        // e.g. 0 for exact, 1 for ±1
  bathTolerance: number;           // e.g. 1 for ±1
  yearTolerance: number;           // e.g. 15 for ±15 years
  priceBandMatch: boolean;         // Tier 3 toggle
  excludeFurnished: boolean;
  excludeShortTerm: boolean;
}

export interface RentalAnalysisSnapshot {
  /** ISO timestamp of the last run. */
  runAt: string;
  /** Sources actually queried (e.g. ['vivareal','quintoandar']). */
  sources: string[];
  /** Whether the search results came from Upstash cache. */
  cacheHit: boolean;
  /** Weighted-median market rent in BRL/month, applied to subject area. */
  suggestedRent: number;
  /** 25th percentile of weighted comp distribution (BRL/month). */
  iqrLow: number;
  /** 75th percentile. */
  iqrHigh: number;
  /** Median R$/m² across kept comps. */
  pricePerM2Median: number;
  confidence: 'alta' | 'media' | 'baixa';
  /** One-line PT-BR rationale for the confidence level. */
  confidenceReason: string;
  /** PT-BR plain-language summary line shown to the user. */
  summary: string;
  /** Comp ids the user manually excluded (still in `rentals`, just not counted). */
  excludedIds: string[];
  /** Comp ids the user forced into the analysis despite filter rejection. */
  forceIncludedIds?: string[];
  filters: RentalAnalysisFilters;
  /** Ordered log of relaxation steps actually applied during the last run. */
  relaxationLog: string[];
}

// ── saveDeal ──────────────────────────────────────────────────────────────────
// Called by ResultsScreen after a successful wizard calculation.
// Maps DealInput → DB columns correctly (title, property_type, inputs, results_cache).

export async function saveDeal(inputs: DealInput, results: AnalysisResult): Promise<SavedDeal> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: user.id,
      title: inputs.name,                    // ← was `name` (invalid column)
      property_type: inputs.propertyType,    // ← new column (migration 003)
      inputs,                                // ← new column (migration 003)
      results_cache: results,                // ← new column (migration 003)
      // Flatten key financial fields for fast querying / display
      price: inputs.purchasePrice,
      area: inputs.property?.squareFootage ?? null,
      bedrooms: inputs.property?.bedrooms ?? null,
      bathrooms: inputs.property?.bathrooms ?? null,
      street: inputs.property?.address?.streetAddress ?? null,
      neighborhood: inputs.property?.address?.neighborhood ?? null,
      city: inputs.property?.address?.city ?? null,
      state: inputs.property?.address?.region ?? null,
      zip_code: inputs.property?.address?.postalCode ?? null,
      condo_fee: inputs.expenses?.condo ?? null,
      iptu: inputs.expenses?.iptu ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedDeal;
}

// ── getDeals ──────────────────────────────────────────────────────────────────

export async function getDeals(): Promise<SavedDeal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedDeal[];
}

// ── deleteDeal ────────────────────────────────────────────────────────────────

export async function deleteDeal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw error;
}
