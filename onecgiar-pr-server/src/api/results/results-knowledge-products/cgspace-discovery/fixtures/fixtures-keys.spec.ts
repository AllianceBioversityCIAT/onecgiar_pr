import * as fs from 'fs';
import * as path from 'path';

/**
 * Pins the metadata/facet field names captured live for the melspace and worldfish
 * Discovery hosts (task KPM-T-1), against the design.md §3.3 adapter table.
 * Loads the raw fixtures only — no repository-specific mapper exists yet (KPM-T-2/T-3).
 */

interface DspaceMetadataValue {
  value: string;
  [key: string]: unknown;
}

type DspaceMetadata = Record<string, DspaceMetadataValue[]>;

function loadFixture(fileName: string): any {
  const fixturePath = path.resolve(__dirname, fileName);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function getSearchItems(halResponse: any): DspaceMetadata[] {
  const objects =
    halResponse?._embedded?.searchResult?._embedded?.objects || [];
  return objects.map(
    (obj: any) => obj?._embedded?.indexableObject?.metadata || {},
  );
}

function getSearchPage(halResponse: any): { totalElements: number } {
  return halResponse?._embedded?.searchResult?.page || { totalElements: 0 };
}

/**
 * A key is "present" for this gate when at least one item in the fixture carries it
 * as a non-empty metadata array (mirrors how the adapter would read it: absent on
 * some items, e.g. DOI, is expected and must not fail the gate).
 */
function keyPresentOnAtLeastOneItem(
  items: DspaceMetadata[],
  key: string,
): boolean {
  return items.some(
    (metadata) => Array.isArray(metadata[key]) && metadata[key].length > 0,
  );
}

function getFacetNames(facetsIndex: any): string[] {
  const facets = facetsIndex?._embedded?.facets || [];
  return facets.map((f: any) => f?.name).filter(Boolean);
}

function getFacetValueLabels(facetPage: any): string[] {
  const values = facetPage?._embedded?.values || [];
  return values.map((v: any) => v?.label).filter(Boolean);
}

describe('cgspace-discovery fixtures — MELSpace and WorldFish key contract (KPM-T-1)', () => {
  describe('search fixtures', () => {
    it('loads the melspace search fixture with at least 2 items and the confirmed adapter keys', () => {
      const fixture = loadFixture('melspace-search.hal.json');
      const page = getSearchPage(fixture);
      const items = getSearchItems(fixture);

      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(page.totalElements).toBeGreaterThan(0);

      expect(keyPresentOnAtLeastOneItem(items, 'dc.title')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.type')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dcterms.available')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.creator')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'cg.identifier.doi')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.identifier.uri')).toBe(true);
      // Captured affiliation key for melspace (design.md §3.3): cg.contributor.center
      expect(keyPresentOnAtLeastOneItem(items, 'cg.contributor.center')).toBe(
        true,
      );
    });

    it('loads the worldfish search fixture with at least 2 items and the confirmed adapter keys', () => {
      const fixture = loadFixture('worldfish-search.hal.json');
      const page = getSearchPage(fixture);
      const items = getSearchItems(fixture);

      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(page.totalElements).toBeGreaterThan(0);

      expect(keyPresentOnAtLeastOneItem(items, 'dc.title')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.type')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.date.issued')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.creator')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.identifier.doi')).toBe(true);
      expect(keyPresentOnAtLeastOneItem(items, 'dc.identifier.uri')).toBe(true);
      // Captured affiliation key for worldfish (design.md §3.3): cg.contributor.affiliation
      expect(
        keyPresentOnAtLeastOneItem(items, 'cg.contributor.affiliation'),
      ).toBe(true);
    });
  });

  describe('facet fixtures', () => {
    it('pins the melspace facet index and the type/center facet names', () => {
      const fixture = loadFixture('melspace-facets.json');

      const facetNames = getFacetNames(fixture.facetsIndex);
      expect(facetNames).toEqual(
        expect.arrayContaining(['itemtype', 'institute', 'dateIssued']),
      );

      expect(getFacetValueLabels(fixture.itemtypeFacet).length).toBeGreaterThan(
        0,
      );
      expect(
        getFacetValueLabels(fixture.instituteFacet).length,
      ).toBeGreaterThan(0);
    });

    it('pins the worldfish facet index and the type/center facet names', () => {
      const fixture = loadFixture('worldfish-facets.json');

      const facetNames = getFacetNames(fixture.facetsIndex);
      expect(facetNames).toEqual(
        expect.arrayContaining(['itemtype', 'institute', 'dateIssued']),
      );

      expect(getFacetValueLabels(fixture.itemtypeFacet).length).toBeGreaterThan(
        0,
      );
      expect(
        getFacetValueLabels(fixture.instituteFacet).length,
      ).toBeGreaterThan(0);
    });
  });
});
