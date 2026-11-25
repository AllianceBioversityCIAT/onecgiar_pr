import {
  isCurrentUseNarrativeAnswered,
  isCurrentUseNarrativeComplete,
  previousUseByCategory,
  totalsByCategory,
  previousUsePhaseYear
} from './current-use-update.util';

/** P2-3985 — the Current Use Update rules shared by the W1/W2 and the W3/bilateral forms. */
describe('current-use-update util', () => {
  const previous = { total_actors: 500, phase_year: 2025 };

  it('reads the previous phase year, tolerating missing data', () => {
    expect(previousUsePhaseYear(previous)).toBe(2025);
    expect(previousUsePhaseYear({ phase_year: null })).toBeNull();
    expect(previousUsePhaseYear({ phase_year: 0 })).toBeNull();
  });


  /** IU26-R-4 */
  describe('previousUseByCategory', () => {
    it('All categories: actors as one total, organizations, one line per unit', () => {
      const result = previousUseByCategory({
        phase_year: 2025,
        total_actors: 2600,
        total_organizations: 9,
        measures: [
          { unit: 'Hectares', quantity: 4100 },
          { unit: 'Trees planted', quantity: 500 }
        ]
      });
      expect(result).toEqual({
        actors: 2600,
        organizations: 9,
        measures: [
          { unit: 'Hectares', quantity: 4100 },
          { unit: 'Trees planted', quantity: 500 }
        ]
      });
    });

    it('omits a category with no data (null, 0, empty) and tolerates a missing previous', () => {
      expect(previousUseByCategory({ total_actors: 0, total_organizations: null, measures: [{ unit: 'Hectares', quantity: 0 }] })).toEqual({
        actors: null,
        organizations: null,
        measures: []
      });
      expect(previousUseByCategory(null)).toEqual({ actors: null, organizations: null, measures: [] });
      expect(previousUseByCategory({ total_actors: 12 })).toEqual({ actors: 12, organizations: null, measures: [] });
    });
  });

  /** IU26-R-7 */
  describe('totalsByCategory', () => {
    it('Mixed actors: households and individuals are never added together', () => {
      const totals = totalsByCategory(
        [{ how_many: 1200, count_unit: 'households' }, { how_many: 1800, count_unit: 'individuals' }, { how_many: 45 }],
        [],
        []
      );
      expect(totals.actorsIndividuals).toBe(1845);
      expect(totals.households).toBe(1200);
    });

    it('Units never mixed: trimmed, case-insensitive match, first spelling labels the line', () => {
      const totals = totalsByCategory(
        [],
        [],
        [
          { unit_of_measure: 'Hectares', quantity: 5400 },
          { unit_of_measure: ' hectares ', quantity: 100 },
          { unit_of_measure: 'Trees planted', quantity: 2000 }
        ]
      );
      expect(totals.measures).toEqual([
        { unit: 'Hectares', quantity: 5500 },
        { unit: 'Trees planted', quantity: 2000 }
      ]);
    });

    it('sums organizations, ignores inactive rows and gives no tile to a category without rows', () => {
      const totals = totalsByCategory(
        [{ how_many: 99, is_active: false }],
        [{ how_many: 3 }, { how_many: '4' }, { how_many: 50, is_active: false }],
        [{ unit_of_measure: '  ', quantity: 7 }]
      );
      expect(totals).toEqual({ actorsIndividuals: null, households: null, organizations: 7, measures: [] });
    });

    it('a row with no number yet counts as 0 but still gives its category a tile', () => {
      expect(totalsByCategory([{ how_many: null }], null, undefined).actorsIndividuals).toBe(0);
    });
  });

  /** IU26-R-5 */
  describe('narrative-only completeness', () => {
    it('is answered when the narrative has text, regardless of any new-users figure', () => {
      expect(isCurrentUseNarrativeAnswered('2026 use grew')).toBe(true);
      expect(isCurrentUseNarrativeAnswered('   ')).toBe(false);
      expect(isCurrentUseNarrativeAnswered(null)).toBe(false);
    });

    it('is complete only within the 100-word limit', () => {
      const words = (n: number) => Array.from({ length: n }, () => 'w').join(' ');
      expect(isCurrentUseNarrativeComplete(words(100))).toBe(true);
      expect(isCurrentUseNarrativeComplete(words(101))).toBe(false);
      expect(isCurrentUseNarrativeComplete('')).toBe(false);
    });
  });
});
