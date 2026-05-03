/**
 * Maps a ScrapedProperty (from /api/parse-listing) to a partial DealInput
 * suitable for seeding the Zustand store before the wizard mounts.
 *
 * Returns both the data to merge into the store and the list of field keys
 * that were populated — used for the visual "pre-filled" indicator.
 */

import type { ScrapedProperty, PropertyType as ScrapedPropertyType } from './types';
import type { DealInput, PropertyType as DealPropertyType } from '@/lib/validations/deal';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface MappedWizardForm {
  formData: DeepPartial<DealInput>;
  prefilledFields: string[];
}

// Translate the scraper's structural property type (apartment/house/...) to
// the deal-strategy enum used by the form (residential/airbnb/flip/...).
// We can only auto-pick a strategy for clearly commercial listings — most
// residential listings can be either rental or airbnb depending on intent,
// so we leave them on the user's category choice.
function mapPropertyTypeToStrategy(
  type: ScrapedPropertyType | undefined
): DealPropertyType | undefined {
  if (type === 'commercial') return 'commercial';
  return undefined;
}

// ZAP/VivaReal amenity codes that imply a parking arrangement.
const PARKING_AMENITY_CODES = new Set([
  'garage',
  'private_garage',
  'covered_parking',
  'parking',
  'covered_garage',
  'garagem',
]);

function inferParkingKind(scraped: ScrapedProperty): 'garage' | 'street' | 'none' | undefined {
  if (scraped.parkingSpots != null) {
    if (scraped.parkingSpots === 0) return 'none';
    // Any covered/private indicator → garagem; otherwise default to garagem
    // since virtually all Brazilian condo listings with vagas mean indoor.
    return 'garage';
  }
  if (scraped.amenities?.some((a) => PARKING_AMENITY_CODES.has(a))) return 'garage';
  return undefined;
}

// Build the "Tags e Etiquetas" field from amenity codes + listing flags.
// Translates back to short Portuguese tokens that match what users would write.
const AMENITY_LABELS: Record<string, string> = {
  pool: 'piscina',
  gym: 'academia',
  balcony: 'varanda',
  grill: 'churrasqueira',
  elevator: 'elevador',
  doorman: 'portaria 24h',
  security: 'segurança',
  sauna: 'sauna',
  playground: 'playground',
  sports_court: 'quadra',
  party_room: 'salão de festas',
  pet_friendly: 'pet friendly',
  furnished: 'mobiliado',
  air_conditioning: 'ar condicionado',
  laundry: 'lavanderia',
  storage: 'depósito',
  garden: 'jardim',
  solar_panels: 'energia solar',
};

function buildTags(scraped: ScrapedProperty): string | undefined {
  const tags: string[] = [];
  for (const a of scraped.amenities ?? []) {
    const label = AMENITY_LABELS[a];
    if (label) tags.push(label);
  }
  if (scraped.suites && scraped.suites > 0) tags.push(`${scraped.suites} suíte${scraped.suites > 1 ? 's' : ''}`);
  if (!tags.length) return undefined;
  return tags.slice(0, 12).join(', ');
}

export function mapToWizardForm(scraped: ScrapedProperty): MappedWizardForm {
  const formData: DeepPartial<DealInput> = {};
  const prefilledFields: string[] = [];

  const mark = (key: string) => prefilledFields.push(key);

  // ── Identity / name ───────────────────────────────────────────────────────
  if (scraped.title) {
    formData.name = scraped.title;
    mark('name');
  }

  // ── Strategy (commercial only — see comment on mapPropertyTypeToStrategy) ─
  const strategy = mapPropertyTypeToStrategy(scraped.type);
  if (strategy) {
    formData.propertyType = strategy;
    mark('propertyType');
  }

  // ── Purchase price (sale listings only) ──────────────────────────────────
  if (scraped.price != null && scraped.listingType !== 'rent') {
    formData.purchasePrice = scraped.price;
    mark('purchasePrice');
  }

  // ── Property sub-object ───────────────────────────────────────────────────
  const property: DeepPartial<NonNullable<DealInput['property']>> = {};

  if (scraped.description) {
    property.shortDescription = scraped.description.slice(0, 1000);
    mark('property.shortDescription');
  }

  if (scraped.bedrooms != null) {
    property.bedrooms = Math.round(scraped.bedrooms);
    mark('property.bedrooms');
  }

  if (scraped.bathrooms != null) {
    property.bathrooms = Math.round(scraped.bathrooms);
    mark('property.bathrooms');
  }

  if (scraped.area != null) {
    property.squareFootage = Math.round(scraped.area);
    mark('property.squareFootage');
  }

  if (scraped.totalArea != null && scraped.totalArea !== scraped.area) {
    property.lotSizeSquareFeet = Math.round(scraped.totalArea);
    mark('property.lotSizeSquareFeet');
  }

  const parking = inferParkingKind(scraped);
  if (parking) {
    property.parking = parking;
    mark('property.parking');
  }

  if (scraped.listingId) {
    property.mlsNumber = scraped.listingId;
    mark('property.mlsNumber');
  }

  const tags = buildTags(scraped);
  if (tags) {
    property.tagsAndLabels = tags;
    mark('property.tagsAndLabels');
  }

  // ── Address ───────────────────────────────────────────────────────────────
  const address: DeepPartial<NonNullable<NonNullable<DealInput['property']>['address']>> = {};

  // Prefer the structured street; fall back to the formatted single-line
  // address if the structured field is missing.
  if (scraped.address?.street) {
    address.streetAddress = scraped.address.street;
    mark('property.address.streetAddress');
  } else if (scraped.address?.fullText) {
    address.streetAddress = scraped.address.fullText;
    mark('property.address.streetAddress');
  }

  if (scraped.address?.neighborhood) {
    address.neighborhood = scraped.address.neighborhood;
    mark('property.address.neighborhood');
  }

  if (scraped.address?.city) {
    address.city = scraped.address.city;
    mark('property.address.city');
  }

  if (scraped.address?.state) {
    address.region = scraped.address.state;
    mark('property.address.region');
  }

  // Format CEP: ZAP returns "88063300", users expect "88063-300".
  const rawZip = scraped.address?.zipCode ?? scraped.zipCode;
  if (rawZip) {
    const digits = rawZip.replace(/\D/g, '');
    address.postalCode = digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : rawZip;
    mark('property.address.postalCode');
  }

  if (Object.keys(address).length > 0) {
    property.address = address;
  }

  if (Object.keys(property).length > 0) {
    formData.property = property;
  }

  // ── Expenses ──────────────────────────────────────────────────────────────
  const expenses: DeepPartial<DealInput['expenses']> = {};

  if (scraped.condoFee != null && scraped.condoFee > 0) {
    expenses.condo = Math.round(scraped.condoFee);
    mark('expenses.condo');
  }

  if (scraped.iptu != null && scraped.iptu > 0) {
    // Some scrapers return yearly IPTU — normalise to monthly
    const monthlyIptu =
      scraped.iptuPeriod === 'yearly' ? scraped.iptu / 12 : scraped.iptu;
    expenses.iptu = Math.round(monthlyIptu);
    mark('expenses.iptu');
  }

  if (Object.keys(expenses).length > 0) {
    formData.expenses = expenses;
  }

  // ── Revenue — monthly rent for rental listings ────────────────────────────
  if (scraped.price != null && scraped.listingType === 'rent') {
    formData.revenue = { monthlyRent: scraped.price };
    mark('revenue.monthlyRent');
  }

  return { formData, prefilledFields };
}
