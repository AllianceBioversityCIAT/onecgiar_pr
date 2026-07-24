import {
  comparePlannedSearchEvaluation,
  comparePlannedSearchRank,
  highlightPlannedSearch,
  parsePlannedSearch,
  plannedSearchEvaluate,
  plannedSearchMatches,
  plannedSearchRank,
  stringSimilarity
} from './planned-search.util';

describe('planned-search.util', () => {
  describe('parsePlannedSearch', () => {
    it('normalizes spaces and splits tokens', () => {
      expect(parsePlannedSearch('  Intelligence   Ma  ')).toEqual({
        phrase: 'intelligence ma',
        tokens: ['intelligence', 'ma']
      });
    });
  });

  describe('plannedSearchRank', () => {
    it('ranks 1 phrase, 2 unordered tokens, 3 fuzzy typos', () => {
      const parsed = parsePlannedSearch('market intelligence');
      expect(plannedSearchRank('AOW01 Market Intelligence', parsed)).toBe(1);
      expect(plannedSearchRank('Intelligence about market segments', parsed)).toBe(2);
      expect(plannedSearchRank('Markett Inteligence program', parsePlannedSearch('market intelligence'))).toBe(3);
      expect(plannedSearchRank('Breeding only', parsed)).toBe(0);
    });

    it('treats a single word as a phrase hit', () => {
      expect(plannedSearchRank('Market Intelligence', parsePlannedSearch('market'))).toBe(1);
    });
  });

  describe('plannedSearchEvaluate', () => {
    it('scores fuzzy hits by average similarity', () => {
      const exact = plannedSearchEvaluate('Market Intelligence', parsePlannedSearch('market intelligence'));
      const typo = plannedSearchEvaluate('Markett Inteligence', parsePlannedSearch('market intelligence'));
      expect(exact.rank).toBe(1);
      expect(typo.rank).toBe(3);
      expect(typo.score).toBeGreaterThan(0.7);
      expect(typo.score).toBeLessThan(1);
    });
  });

  describe('plannedSearchMatches', () => {
    it('matches when every token is present', () => {
      const parsed = parsePlannedSearch('intelligence ma');
      expect(plannedSearchMatches('Market Intelligence', parsed)).toBe(true);
      expect(plannedSearchMatches('Intelligence only', parsed)).toBe(false);
    });

    it('matches typos via similarity', () => {
      expect(plannedSearchMatches('Market Intelligence', parsePlannedSearch('inteligence'))).toBe(true);
    });
  });

  describe('comparePlannedSearchRank', () => {
    it('orders phrase → tokens → fuzzy', () => {
      expect(comparePlannedSearchRank(1, 2)).toBeLessThan(0);
      expect(comparePlannedSearchRank(2, 3)).toBeLessThan(0);
      expect(comparePlannedSearchRank(3, 1)).toBeGreaterThan(0);
    });
  });

  describe('comparePlannedSearchEvaluation', () => {
    it('breaks ties by higher score', () => {
      expect(
        comparePlannedSearchEvaluation({ rank: 3, score: 0.9, similarWords: [] }, { rank: 3, score: 0.75, similarWords: [] })
      ).toBeLessThan(0);
    });
  });

  describe('stringSimilarity', () => {
    it('is high for near typos', () => {
      expect(stringSimilarity('intelligence', 'inteligence')).toBeGreaterThan(0.8);
      expect(stringSimilarity('market', 'xyzabc')).toBeLessThan(0.3);
    });
  });

  describe('highlightPlannedSearch', () => {
    it('highlights the phrase and leftover tokens without nesting marks', () => {
      const html = highlightPlannedSearch('Market Intelligence', 'intelligence ma');
      expect(html).toContain('<mark class="planned-search-hit">Ma</mark>');
      expect(html).toContain('<mark class="planned-search-hit">Intelligence</mark>');
      expect(html).not.toContain('<mark class="planned-search-hit"><mark');
    });

    it('highlights fuzzy counterpart words for typos', () => {
      const html = highlightPlannedSearch('Market Intelligence', 'inteligence');
      expect(html.toLowerCase()).toContain('<mark class="planned-search-hit">intelligence</mark>');
    });
  });
});
