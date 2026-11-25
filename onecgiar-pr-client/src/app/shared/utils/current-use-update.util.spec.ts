import {
  hasAnyPreviousFigure,
  isCurrentUseNarrativeAnswered,
  isCurrentUseNarrativeComplete,
  previousUseByCategory,
  totalsByCategory,
  previousUsePhaseYear,
  actorRowTotal,
  newUsersByCategory,
  newUsersExceedsMessage,
  newUsersExceedsTotal,
  newUsersValue
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

  describe('IU26-T-12 - of which NEW', () => {
    it('newUsersExceedsTotal: 150 over 120 is invalid; blank, 0 and equal are valid', () => {
      expect(newUsersExceedsTotal(150, 120)).toBe(true);
      expect(newUsersExceedsTotal(121, 120)).toBe(true);
      expect(newUsersExceedsTotal(120, 120)).toBe(false);
      expect(newUsersExceedsTotal(0, 0)).toBe(false);
      expect(newUsersExceedsTotal(null, 120)).toBe(false);
      expect(newUsersExceedsTotal(undefined, 120)).toBe(false);
      expect(newUsersExceedsTotal('', 120)).toBe(false);
    });

    it('newUsersValue reads blanks as null and numbers as numbers', () => {
      expect(newUsersValue('')).toBeNull();
      expect(newUsersValue('7')).toBe(7);
      expect(newUsersValue('abc')).toBeNull();
    });

    it('the message is "New users (N) cannot be higher than the total (M)."', () => {
      expect(newUsersExceedsMessage(150, 120)).toBe('New users (150) cannot be higher than the total (120).');
    });

    it('actorRowTotal mirrors the server: single total uses how_many; otherwise women + men, falling back to how_many', () => {
      expect(actorRowTotal({ sex_and_age_disaggregation: true, how_many: 30, women: 5, men: 5 })).toBe(30);
      expect(actorRowTotal({ sex_and_age_disaggregation: false, women: 70, men: 50, how_many: 1 })).toBe(120);
      expect(actorRowTotal({ women: null, men: null, how_many: 9 })).toBe(9);
      expect(actorRowTotal({ women: 0, men: null, how_many: 9 })).toBe(0);
    });

    it('newUsersByCategory sums answered NEW per category; a category with no NEW is null', () => {
      const result = newUsersByCategory(
        [{ new_users: 10, how_many: 50 }, { new_users: 5, count_unit: 'households' }, { new_users: 7, is_active: false }],
        [{ how_many: 3 }],
        [{ unit_of_measure: 'Hectares', new_users: 4 }, { unit_of_measure: ' hectares ', new_users: 6 }, { unit_of_measure: 'Projects' }]
      );
      expect(result.actorsIndividuals).toBe(10);
      expect(result.households).toBe(5);
      expect(result.organizations).toBeNull();
      expect(result.measures).toEqual([
        { unit: 'Hectares', newUsers: 10 },
        { unit: 'Projects', newUsers: null }
      ]);
    });
  });
});

describe('hasAnyPreviousFigure (IU26 follow-up)', () => {
  it('is false for null and for all-zero / blank figures', () => {
    expect(hasAnyPreviousFigure(null)).toBe(false);
    expect(hasAnyPreviousFigure({ total_actors: 0, total_organizations: '0', measures: [{ unit: 'Hectares', quantity: 0 }, { unit: ' ', quantity: 5 }] })).toBe(false);
  });

  it('is true when actors, organizations or a measure line has data', () => {
    expect(hasAnyPreviousFigure({ total_actors: 3 })).toBe(true);
    expect(hasAnyPreviousFigure({ total_organizations: 1 })).toBe(true);
    expect(hasAnyPreviousFigure({ measures: [{ unit: 'Hectares', quantity: 2 }] })).toBe(true);
  });
});
