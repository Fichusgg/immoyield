/**
 * Maps a ScrapedProperty (from /api/parse-listing) to a partial DealInput
 * suitable for seeding the Zustand store before the wizard mounts.
 *
 * Returns both the data to merge into the store and the list of field keys
 * that were populated — used for the visual "pre-filled" indicator.
 */

import type { ScrapedProperty } from './types';
import type { DealInput } from '@/lib/validations/deal';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface MappedWizardForm {
  formData: DeepPartial<DealInput>;
  prefilledFields: string[];
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

  // ── Address ───────────────────────────────────────────────────────────────
  const address: DeepPartial<NonNullable<NonNullable<DealInput['property']>['address']>> = {};

  if (scraped.address?.street) {
    address.streetAddress = scraped.address.street;
    mark('property.address.streetAddress');
  }

  if (scraped.address?.city) {
    address.city = scraped.address.city;
    mark('property.address.city');
  }

  if (scraped.address?.state) {
    address.region = scraped.address.state;
    mark('property.address.region');
  }

  const postalCode = scraped.address?.zipCode ?? scraped.zipCode;
  if (postalCode) {
    address.postalCode = postalCode;
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

  if (scraped.condoFee != null) {
    expenses.condo = Math.round(scraped.condoFee); // always monthly
    mark('expenses.condo');
  }

  if (scraped.iptu != null) {
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
