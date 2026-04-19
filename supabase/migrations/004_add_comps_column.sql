-- Migration 004: Add comps column for manually entered sales/rental comparables
-- and neighborhood/parking_spots columns for expanded DealInputs.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS comps jsonb DEFAULT '{"sales": [], "rentals": []}';

-- Index for querying comps (jsonb GIN index)
CREATE INDEX IF NOT EXISTS idx_deals_comps ON deals USING gin(comps);
