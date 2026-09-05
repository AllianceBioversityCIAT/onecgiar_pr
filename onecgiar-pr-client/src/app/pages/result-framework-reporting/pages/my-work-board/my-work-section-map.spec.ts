// @akili-spec changes/my-work-board (MWB-T-2, MWB-R-6)
import { firstMissingRoute, MY_WORK_DEFAULT_ROUTE, MY_WORK_SECTION_MAP, sectionLabel } from './my-work-section-map';

describe('my-work-section-map', () => {
  describe('MY_WORK_SECTION_MAP', () => {
    it('maps every design.md §5 section_name to a route + label, including both P22 and P25 keys', () => {
      const expected: Record<string, string> = {
        'general-information': 'general-information',
        'theory-of-change': 'theory-of-change',
        'geographic-location': 'geographic-location',
        partners: 'partners',
        'contributor-partners': 'contributor-partners',
        'links-to-results': 'links-to-results',
        evidences: 'evidences',
        'policy-change1-info': 'policy-change1-info',
        'innovation-use-info': 'innovation-use-info',
        'cap-dev-info': 'cap-dev-info',
        'knowledge-product-info': 'knowledge-product-info',
        'innovation-dev-info': 'innovation-dev-info'
      };

      for (const [name, route] of Object.entries(expected)) {
        expect(MY_WORK_SECTION_MAP[name]?.route).toBe(route);
      }
    });

    it('resolves both partners and contributor-partners (P22 + P25 coexist, MWB-TEST-3)', () => {
      expect(MY_WORK_SECTION_MAP['partners']).toEqual({ route: 'partners', label: 'Partners' });
      expect(MY_WORK_SECTION_MAP['contributor-partners']).toEqual({ route: 'contributor-partners', label: 'Contributing partners' });
    });

    it('is frozen', () => {
      expect(Object.isFrozen(MY_WORK_SECTION_MAP)).toBe(true);
    });
  });

  describe('firstMissingRoute()', () => {
    it('returns the first missing section mapped to a known route, in server order', () => {
      expect(firstMissingRoute(['geographic-location', 'contributor-partners', 'knowledge-product-info'])).toBe('geographic-location');
    });

    it('skips an unmapped entry and returns the next known one', () => {
      expect(firstMissingRoute(['not-a-real-section', 'evidences'])).toBe('evidences');
    });

    it("falls back to 'general-information' when nothing in the list is mapped", () => {
      expect(firstMissingRoute(['not-a-real-section', 'also-unknown'])).toBe(MY_WORK_DEFAULT_ROUTE);
    });

    it("falls back to 'general-information' for null, undefined and an empty list", () => {
      expect(firstMissingRoute(null)).toBe(MY_WORK_DEFAULT_ROUTE);
      expect(firstMissingRoute(undefined)).toBe(MY_WORK_DEFAULT_ROUTE);
      expect(firstMissingRoute([])).toBe(MY_WORK_DEFAULT_ROUTE);
    });
  });

  describe('sectionLabel()', () => {
    it('returns the display label for a known section', () => {
      expect(sectionLabel('contributor-partners')).toBe('Contributing partners');
      expect(sectionLabel('geographic-location')).toBe('Geographic location');
    });

    it('returns the name verbatim for an unknown section', () => {
      expect(sectionLabel('not-a-real-section')).toBe('not-a-real-section');
    });
  });
});
