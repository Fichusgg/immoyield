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

  // Timestamps
  created_at: string;
  updated_at: string;
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
