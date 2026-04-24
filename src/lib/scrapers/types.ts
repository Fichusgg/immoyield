// ─── Shared types for all scrapers ────────────────────────────────────────────

export type ListingType = 'sale' | 'rent';
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'other';
export type SupportedSite = 'zapimoveis' | 'vivareal' | 'quintoandar' | 'generic';
export type ExtractionMethod =
  | 'next_data'
  | 'schema_org'
  | 'css_selectors'
  | 'opengraph'
  | 'heuristic'
  | 'browser';

export interface PropertyAddress {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fullText?: string;
}

export interface ScrapedProperty {
  // Identity
  listingId?: string;
  sourceUrl: string;
  sourceSite: SupportedSite;
  scrapedAt: string;

  // Listing meta
  title?: string;
  type?: PropertyType;
  listingType?: ListingType;

  // Financials
  price?: number; // sale price OR monthly rent in BRL
  condoFee?: number; // condomínio (monthly, BRL)
  iptu?: number; // IPTU (yearly or monthly — check iptuPeriod)
  iptuPeriod?: 'monthly' | 'yearly';

  // Specs
  area?: number; // usable area in m²
  totalArea?: number; // total area in m²
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  suites?: number;

  // Location
  address?: PropertyAddress;

  // Media & agent
  photos?: string[];
  agentName?: string;

  // Additional details
  description?: string; // full listing description text
  zipCode?: string; // CEP / postal code

  // Price analysis (from ZAP / VivaReal "Análise de preço")
  pricePerSqm?: number; // listed price ÷ area (m²)
  marketValue?: number; // site's estimated market value
  marketPricePerSqm?: number; // median market price per m² in the area

  // Amenities & features
  amenities?: string[]; // normalized lowercase: ["pool", "gym", "balcony", ...]

  // Contact
  contactPhone?: string; // advertiser/agent phone (may be masked by site)

  // Temporal
  datePosted?: string; // ISO 8601 — when listing was first published
  dateUpdated?: string; // ISO 8601 — last update/refresh

  // Extraction metadata (helps debugging)
  _extractionMethod?: ExtractionMethod;
  _confidence?: 'high' | 'medium' | 'low';
}

export interface ParseListingRequest {
  url: string;
}

export interface ParseListingResponse {
  ok: boolean;
  source?: SupportedSite;
  extractionMethod?: ExtractionMethod;
  data?: ScrapedProperty;
  error?: ParseError;
  message?: string;
  retryAfter?: number;
}

export type ParseError =
  | 'UNSUPPORTED_SITE'
  | 'BLOCKED'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'CAPTCHA'
  | 'INVALID_URL'
  | 'NETWORK_ERROR';
