import {
  comparePlannedSearchEvaluation,
  comparePlannedSearchRank,
  escapeHtml,
  highlightPlannedSearch,
  indicatorSearchHaystack,
  parsePlannedSearch,
  plannedSearchEvaluate,
  plannedSearchMatches,
  plannedSearchRank,
  PLANNED_SEARCH_SIMILARITY_THRESHOLD,
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

    it('returns an empty parse for null, undefined and blank input', () => {
      const empty = { phrase: '', tokens: [] };
      expect(parsePlannedSearch(null)).toEqual(empty);
      expect(parsePlannedSearch(undefined)).toEqual(empty);
      expect(parsePlannedSearch('')).toEqual(empty);
      expect(parsePlannedSearch('    ')).toEqual(empty);
    });
  });

  describe('indicatorSearchHaystack', () => {
    it('joins every searchable field of the indicator', () => {
      const hay = indicatorSearchHaystack({
        indicator_description: 'Adoption rate',
        type_name: 'Outcome',
        __hlo: 'HLO 1',
        __aowCode: 'AOW01',
        center_acronym: 'CIAT'
      });
      expect(hay).toBe('Adoption rate Outcome HLO 1 AOW01 CIAT');
    });

    it('falls back to empty strings for missing fields and a missing indicator', () => {
      expect(indicatorSearchHaystack({}).trim()).toBe('');
      expect(indicatorSearchHaystack(null).trim()).toBe('');
      expect(indicatorSearchHaystack(undefined).trim()).toBe('');
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

    it('treats an empty query as a full match of everything', () => {
      expect(plannedSearchEvaluate('anything', parsePlannedSearch(''))).toEqual({ rank: 1, score: 1, similarWords: [] });
      expect(plannedSearchEvaluate('', parsePlannedSearch(null))).toEqual({ rank: 1, score: 1, similarWords: [] });
    });

    it('ranks unordered tokens at 2 with a fixed score', () => {
      const result = plannedSearchEvaluate('Intelligence about market segments', parsePlannedSearch('market intelligence'));
      expect(result).toEqual({ rank: 2, score: 0.95, similarWords: [] });
    });

    it('returns no match below the similarity threshold', () => {
      const result = plannedSearchEvaluate('Breeding programme', parsePlannedSearch('market intelligence'));
      expect(result).toEqual({ rank: 0, score: 0, similarWords: [] });
    });

    it('collects the fuzzy counterparts it matched', () => {
      const result = plannedSearchEvaluate('Market Intelligence', parsePlannedSearch('inteligence'));
      expect(result.rank).toBe(3);
      expect(result.similarWords).toEqual(['intelligence']);
      expect(result.score).toBeGreaterThanOrEqual(PLANNED_SEARCH_SIMILARITY_THRESHOLD);
    });

    it('requires an exact substring for very short tokens', () => {
      // "ma" is shorter than the fuzzy minimum: it counts only if it literally appears.
      expect(plannedSearchEvaluate('Market Intelligence', parsePlannedSearch('ma zz')).rank).toBe(0);
      expect(plannedSearchEvaluate('Market Intelligence', parsePlannedSearch('ma inteligence')).rank).toBe(3);
    });

    it('scores nothing when the haystack has no words at all', () => {
      expect(plannedSearchEvaluate('---', parsePlannedSearch('market')).rank).toBe(0);
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

    it('pushes the non-matches to the end', () => {
      expect(comparePlannedSearchRank(0, 3)).toBeGreaterThan(0);
      expect(comparePlannedSearchRank(1, 0)).toBeLessThan(0);
      expect(comparePlannedSearchRank(0, 0)).toBe(0);
      expect(comparePlannedSearchRank(2, 2)).toBe(0);
    });

    it('sorts a mixed list the way the UI expects', () => {
      expect([3, 0, 2, 1].sort(comparePlannedSearchRank as any)).toEqual([1, 2, 3, 0]);
    });
  });

  describe('comparePlannedSearchEvaluation', () => {
    it('breaks ties by higher score', () => {
      expect(
        comparePlannedSearchEvaluation({ rank: 3, score: 0.9, similarWords: [] }, { rank: 3, score: 0.75, similarWords: [] })
      ).toBeLessThan(0);
    });

    it('prefers the better rank over the better score', () => {
      expect(
        comparePlannedSearchEvaluation({ rank: 1, score: 0.1, similarWords: [] }, { rank: 3, score: 1, similarWords: [] })
      ).toBeLessThan(0);
    });

    it('is stable for two identical evaluations', () => {
      expect(
        comparePlannedSearchEvaluation({ rank: 2, score: 0.95, similarWords: [] }, { rank: 2, score: 0.95, similarWords: [] })
      ).toBe(0);
    });
  });

  describe('stringSimilarity', () => {
    it('is high for near typos', () => {
      expect(stringSimilarity('intelligence', 'inteligence')).toBeGreaterThan(0.8);
      expect(stringSimilarity('market', 'xyzabc')).toBeLessThan(0.3);
    });

    it('treats two empty strings as identical', () => {
      expect(stringSimilarity('', '')).toBe(1);
    });

    it('returns 0 when only one side is empty', () => {
      expect(stringSimilarity('market', '')).toBe(0);
      expect(stringSimilarity('', 'market')).toBe(0);
    });

    it('returns 1 for identical strings', () => {
      expect(stringSimilarity('market', 'market')).toBe(1);
    });

    it('uses the length ratio when one string contains the other', () => {
      expect(stringSimilarity('market', 'mark')).toBeCloseTo(4 / 6);
      expect(stringSimilarity('mark', 'market')).toBeCloseTo(4 / 6);
    });
  });

  describe('escapeHtml', () => {
    it('escapes every dangerous character', () => {
      expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    });

    it('leaves plain text untouched', () => {
      expect(escapeHtml('Market Intelligence')).toBe('Market Intelligence');
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

    it('returns an empty string for empty, null or undefined text', () => {
      expect(highlightPlannedSearch('', 'market')).toBe('');
      expect(highlightPlannedSearch(null as any, 'market')).toBe('');
      expect(highlightPlannedSearch(undefined as any, 'market')).toBe('');
    });

    it('escapes without highlighting when there is no query', () => {
      expect(highlightPlannedSearch('<b>Market</b>', '')).toBe('&lt;b&gt;Market&lt;/b&gt;');
      expect(highlightPlannedSearch('<b>Market</b>', null)).toBe('&lt;b&gt;Market&lt;/b&gt;');
    });

    it('escapes without highlighting when nothing matches', () => {
      expect(highlightPlannedSearch('<b>Market</b>', 'zzzz')).toBe('&lt;b&gt;Market&lt;/b&gt;');
    });

    it('keeps the text after the last hit', () => {
      const html = highlightPlannedSearch('Market intelligence programme', 'market');
      expect(html).toBe('<mark class="planned-search-hit">Market</mark> intelligence programme');
    });

    it('keeps the text before the first hit', () => {
      const html = highlightPlannedSearch('The market', 'market');
      expect(html).toBe('The <mark class="planned-search-hit">market</mark>');
    });

    it('highlights every occurrence of the same needle', () => {
      const html = highlightPlannedSearch('market and market', 'market');
      expect(html.match(/<mark/g)).toHaveLength(2);
    });

    it('merges adjacent and overlapping ranges into one mark', () => {
      const html = highlightPlannedSearch('Intelligence', 'intel intelligence');
      expect(html).toBe('<mark class="planned-search-hit">Intelligence</mark>');
    });

    it('escapes the highlighted fragment itself', () => {
      const html = highlightPlannedSearch('a <b> c', '<b>');
      expect(html).toBe('a <mark class="planned-search-hit">&lt;b&gt;</mark> c');
    });

    it('coerces a non-string value before highlighting', () => {
      expect(highlightPlannedSearch(2026 as any, '20')).toBe('<mark class="planned-search-hit">20</mark>26');
    });
  });
});
