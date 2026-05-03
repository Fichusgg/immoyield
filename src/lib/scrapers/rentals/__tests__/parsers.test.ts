import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseVivarealSearchHtml } from '../vivareal-search';
import { parseQuintoAndarSearchHtml } from '../quintoandar-search';
import { analyzeRentComps, DEFAULT_FILTERS } from '../../../rent-compare';

/**
 * Integration tests for the rental search parsers using real HTML fixtures
 * captured from a live `?bairros=Vila+Madalena&quartos=2` query.
 *
 * If the portals change their markup these tests will catch the regression.
 * Re-capture fixtures with:
 *   npx tsx --env-file=.env.local scripts/debug-rent-compare.ts \
 *     "São Paulo" "Vila Madalena" SP 2 apartment
 *   cp tmp/rc-vivareal.html src/lib/scrapers/rentals/__tests__/fixtures/
 *   cp tmp/rc-quintoandar.html src/lib/scrapers/rentals/__tests__/fixtures/
 */

const FIXTURES = resolve(__dirname, 'fixtures');

describe('parseVivarealSearchHtml — real Vivareal search HTML', () => {
  const html = readFileSync(`${FIXTURES}/vivareal-search.html`, 'utf8');
  const listings = parseVivarealSearchHtml(html);

  it('extracts a full page of listings (typically ~30)', () => {
    expect(listings.length).toBeGreaterThanOrEqual(25);
  });

  it('every listing has a non-zero monthlyRent', () => {
    for (const l of listings) {
      expect(l.monthlyRent).toBeGreaterThan(0);
    }
  });

  it('every listing has a parseable URL pointing at vivareal', () => {
    for (const l of listings) {
      expect(l.url).toMatch(/^https:\/\/www\.vivareal\.com\.br\/imovel\//);
    }
  });

  it('extracts neighborhood from the schema.org name string', () => {
    const withBairro = listings.filter((l) => l.neighborhood);
    expect(withBairro.length).toBeGreaterThan(20); // most should resolve
  });

  it('every listing carries city + state', () => {
    for (const l of listings) {
      expect(l.city).toBeTruthy();
      expect(l.state).toBeTruthy();
    }
  });

  it('all listings are tagged source=vivareal status=active', () => {
    for (const l of listings) {
      expect(l.source).toBe('vivareal');
      expect(l.status).toBe('active');
    }
  });

  it('extracts area in m² for the majority of listings', () => {
    const withArea = listings.filter((l) => typeof l.area === 'number' && l.area! > 0);
    expect(withArea.length).toBeGreaterThan(20);
  });

  it('IDs are stably namespaced as "vivareal:<id>"', () => {
    for (const l of listings) {
      expect(l.id).toMatch(/^vivareal:/);
    }
  });
});

describe('parseQuintoAndarSearchHtml — real QA search HTML', () => {
  const html = readFileSync(`${FIXTURES}/quintoandar-search.html`, 'utf8');
  const listings = parseQuintoAndarSearchHtml(html);

  it('extracts at least 10 listings from page 0', () => {
    expect(listings.length).toBeGreaterThanOrEqual(10);
  });

  it('every listing has a positive monthlyRent', () => {
    for (const l of listings) {
      expect(l.monthlyRent).toBeGreaterThan(0);
    }
  });

  it('all listings include neighbourhood (QA always emits it)', () => {
    for (const l of listings) {
      expect(l.neighborhood).toBeTruthy();
    }
  });

  it('property URLs point at /imovel/<id>', () => {
    for (const l of listings) {
      expect(l.url).toMatch(/^https:\/\/www\.quintoandar\.com\.br\/imovel\/\d+/);
    }
  });

  it('IDs are namespaced as "quintoandar:<id>"', () => {
    for (const l of listings) {
      expect(l.id).toMatch(/^quintoandar:\d+/);
    }
  });

  it('bucket is correctly inferred from the propertyType label', () => {
    for (const l of listings) {
      if (l.propertyType && /casa|sobrado/i.test(l.propertyType)) {
        expect(l.bucket).toBe('house');
      } else {
        expect(l.bucket).toBe('apartment');
      }
    }
  });

  it('captures condoFee (combined condo+IPTU on QA)', () => {
    const withCondo = listings.filter((l) => l.condoFee != null);
    expect(withCondo.length).toBeGreaterThan(0);
  });
});

describe('integration — full pipeline against captured fixtures', () => {
  it('produces a sensible score from real Vila Madalena 2Q data', () => {
    const vrHtml = readFileSync(`${FIXTURES}/vivareal-search.html`, 'utf8');
    const qaHtml = readFileSync(`${FIXTURES}/quintoandar-search.html`, 'utf8');
    const listings = [
      ...parseVivarealSearchHtml(vrHtml),
      ...parseQuintoAndarSearchHtml(qaHtml),
    ];
    const result = analyzeRentComps({
      subject: {
        city: 'São Paulo',
        neighborhood: 'Vila Madalena',
        state: 'SP',
        bucket: 'apartment',
        bedrooms: 2,
        area: 80,
      },
      listings,
      filters: DEFAULT_FILTERS,
    });

    // Real-world sanity: a 2Q in/around Vila Madalena should land in a
    // plausible band. We use loose bounds so this doesn't break on small
    // market drift over time — the goal is to detect total-failure regressions.
    expect(result.score.count).toBeGreaterThanOrEqual(3);
    expect(result.score.suggestedRent).toBeGreaterThan(1500);
    expect(result.score.suggestedRent).toBeLessThan(15000);
    expect(result.score.iqrLow).toBeLessThanOrEqual(result.score.suggestedRent);
    expect(result.score.iqrHigh).toBeGreaterThanOrEqual(result.score.suggestedRent);
  });
});
