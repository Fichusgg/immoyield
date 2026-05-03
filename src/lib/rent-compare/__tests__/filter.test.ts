import { describe, it, expect } from 'vitest';
import { filterAndRelax } from '../filter';
import { DEFAULT_FILTERS } from '../types';
import type { RentSubject, RentalListing } from '../types';

const subject: RentSubject = {
  city: 'São Paulo',
  neighborhood: 'Vila Madalena',
  state: 'SP',
  bucket: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  area: 80,
  yearBuilt: 2010,
};

function makeListing(overrides: Partial<RentalListing> = {}): RentalListing {
  return {
    id: overrides.id ?? `comp-${Math.random()}`,
    source: 'vivareal',
    url: 'https://example.com',
    scrapedAt: '2026-05-01T00:00:00Z',
    neighborhood: 'Vila Madalena',
    city: 'São Paulo',
    bucket: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 80,
    monthlyRent: 4500,
    status: 'active',
    ...overrides,
  };
}

/**
 * Five valid baseline comps so the relaxation loop doesn't fire when a
 * test wants to assert that a specific comp was rejected by Tier 1/2.
 * Without this, single-listing rejection tests get masked: the loop
 * relaxes and the "rejected" comp ends up kept.
 */
function baseline(count = 5): RentalListing[] {
  return Array.from({ length: count }, (_, i) =>
    makeListing({ id: `baseline-${i}`, monthlyRent: 4500 + i * 10 }),
  );
}

describe('filterAndRelax — Tier 1 hard filters', () => {
  it('keeps comps that match bucket, beds, and bairro exactly', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing(), makeListing(), makeListing()],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(3);
  });

  it('rejects bucket mismatch (apartment subject vs house comp)', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ bucket: 'house' })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(0);
    expect(r.excluded[0].reason).toBe('bucket-mismatch');
  });

  it('rejects bedroom mismatch (2Q subject vs 3Q comp)', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ bedrooms: 3 })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(0);
    expect(r.excluded[0].reason).toBe('bedrooms-mismatch');
  });

  it('rejects different bairro when scope=bairro', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        ...baseline(),
        makeListing({ id: 'far', neighborhood: 'Pinheiros' }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'far')?.reason).toBe('wrong-bairro');
  });

  it('treats accents and casing as equivalent for bairro match', () => {
    const r = filterAndRelax({
      subject: { ...subject, neighborhood: 'Higienópolis' },
      listings: [
        makeListing({ neighborhood: 'higienopolis' }),
        makeListing({ neighborhood: 'HIGIENOPOLIS' }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(2);
  });
});

describe('filterAndRelax — Tier 2 soft filters', () => {
  it('rejects area outside ±20%', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        ...baseline(),
        makeListing({ id: 'big', area: 110 }),
        makeListing({ id: 'small', area: 60 }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'big')?.reason).toBe('area-out-of-range');
    expect(r.excluded.find((e) => e.listing.id === 'small')?.reason).toBe('area-out-of-range');
  });

  it('keeps area exactly at ±20% boundary', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ area: 96 }), makeListing({ area: 64 })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(2);
  });

  it('rejects bath delta beyond tolerance', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        ...baseline(),
        makeListing({ id: 'bb', bathrooms: 4 }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'bb')?.reason).toBe('bathrooms-out-of-range');
  });

  it('rejects year delta beyond tolerance', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        ...baseline(),
        makeListing({ id: 'old', yearBuilt: 1980 }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'old')?.reason).toBe('year-out-of-range');
  });

  it('skips year filter when subject yearBuilt is unknown', () => {
    const r = filterAndRelax({
      subject: { ...subject, yearBuilt: undefined },
      listings: [makeListing({ yearBuilt: 1950 })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(1);
  });

  it('excludes furnished comps when toggle is on', () => {
    const r = filterAndRelax({
      subject,
      listings: [...baseline(), makeListing({ id: 'mob', isFurnished: true })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'mob')?.reason).toBe('furnished');
  });

  it('keeps furnished comps when toggle is off', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ isFurnished: true })],
      filters: { ...DEFAULT_FILTERS, excludeFurnished: false },
    });
    expect(r.kept).toHaveLength(1);
  });

  it('excludes short-term/temporada comps', () => {
    const r = filterAndRelax({
      subject,
      listings: [...baseline(), makeListing({ id: 'st', isShortTerm: true })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
    expect(r.excluded.find((e) => e.listing.id === 'st')?.reason).toBe('short-term');
  });

  it('drops outliers more than 2σ from the median rent', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        makeListing({ id: 'a', monthlyRent: 4500 }),
        makeListing({ id: 'b', monthlyRent: 4600 }),
        makeListing({ id: 'c', monthlyRent: 4400 }),
        makeListing({ id: 'd', monthlyRent: 4550 }),
        makeListing({ id: 'e', monthlyRent: 12000 }), // outlier
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(4);
    expect(r.excluded.find((e) => e.listing.id === 'e')?.reason).toBe('rent-outlier');
  });
});

describe('filterAndRelax — relaxation loop', () => {
  it('expands bairro → cidade when fewer than 5 comps in-bairro', () => {
    const r = filterAndRelax({
      subject,
      listings: [
        // Only 2 comps in Vila Madalena
        makeListing({ id: 'a' }),
        makeListing({ id: 'b' }),
        // 5 in Pinheiros (same city)
        makeListing({ id: 'c', neighborhood: 'Pinheiros' }),
        makeListing({ id: 'd', neighborhood: 'Pinheiros' }),
        makeListing({ id: 'e', neighborhood: 'Pinheiros' }),
        makeListing({ id: 'f', neighborhood: 'Pinheiros' }),
        makeListing({ id: 'g', neighborhood: 'Pinheiros' }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept.length).toBeGreaterThanOrEqual(5);
    expect(r.relaxationLog[0]).toMatch(/cidade/i);
  });

  it('does not relax when bairro already has 5+ comps', () => {
    const r = filterAndRelax({
      subject,
      listings: Array.from({ length: 6 }, (_, i) => makeListing({ id: `m-${i}` })),
      filters: DEFAULT_FILTERS,
    });
    expect(r.relaxationLog).toEqual([]);
  });

  it('expands area tolerance after city expansion fails', () => {
    const r = filterAndRelax({
      subject,
      // Only 5 comps total, all out of bairro AND with area outside ±20%
      // (108 m² is +35%) — relaxation should hit step 2 (area ±30%)... but
      // 108 is still outside ±30%, so this remains <5 even after relaxation.
      // We use 100 m² (+25%) which fits ±30%.
      listings: [
        makeListing({ id: 'a', neighborhood: 'Pinheiros', area: 100 }),
        makeListing({ id: 'b', neighborhood: 'Pinheiros', area: 100 }),
        makeListing({ id: 'c', neighborhood: 'Pinheiros', area: 100 }),
        makeListing({ id: 'd', neighborhood: 'Pinheiros', area: 100 }),
        makeListing({ id: 'e', neighborhood: 'Pinheiros', area: 100 }),
      ],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(5);
    expect(r.relaxationLog).toEqual(
      expect.arrayContaining([expect.stringMatching(/cidade/i), expect.stringMatching(/área.*30/i)]),
    );
  });
});

describe('filterAndRelax — data quality guards', () => {
  it('rejects comps with missing rent', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ monthlyRent: 0 })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(0);
    expect(r.excluded[0].reason).toBe('missing-rent');
  });

  it('rejects comps with missing area', () => {
    const r = filterAndRelax({
      subject,
      listings: [makeListing({ area: undefined })],
      filters: DEFAULT_FILTERS,
    });
    expect(r.kept).toHaveLength(0);
    expect(r.excluded[0].reason).toBe('missing-area');
  });
});
