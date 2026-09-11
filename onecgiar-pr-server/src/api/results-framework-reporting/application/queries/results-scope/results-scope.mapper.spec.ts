import { toResultScopeDto } from './results-scope.mapper';
import type { ResultScopeRow } from './results-scope.dto';

// @akili-spec changes/results-aow-column-filter (RAC-T-1)
describe('results-scope.mapper', () => {
  describe('toResultScopeDto', () => {
    it('maps a result linked in AOW02 and AOW01 to key AOW01 (tie-break) with both codes, and key === codes[0]', () => {
      // RAC-R-1 scenario fixture: result #9006, linked to AOW02 and AOW01.
      // `aow_acronym` is the CTE's own `MIN(UPPER(acronym))` — the first of
      // the alphabetically sorted `aow_codes` list.
      const row: ResultScopeRow = {
        result_id: 9006,
        status_id: 1,
        aow_acronym: 'AOW01',
        has_intermediate: 0,
        has_eoi: 0,
        aow_codes: 'AOW01,AOW02',
      };

      const dto = toResultScopeDto(row);

      expect(dto).toEqual({
        result_id: 9006,
        key: 'AOW01',
        kind: 'aow',
        codes: ['AOW01', 'AOW02'],
      });
      // Disqualifier guard (RAC-T-1): an inconsistent fixture (aow_acronym
      // not the first of aow_codes) must make this assertion fail.
      expect(dto.key).toBe(dto.codes[0]);
    });

    it('maps a result linked only to a program-level Intermediate outcome node to INTERMEDIATE with no codes', () => {
      // RAC-R-1 scenario fixture: result #8871.
      const row: ResultScopeRow = {
        result_id: 8871,
        status_id: 1,
        aow_acronym: null,
        has_intermediate: 1,
        has_eoi: 0,
        aow_codes: null,
      };

      expect(toResultScopeDto(row)).toEqual({
        result_id: 8871,
        key: 'INTERMEDIATE',
        kind: 'outcome',
        codes: [],
      });
    });

    it('maps a result linked only to an EOI 2030 outcome node to EOI_2030 with no codes', () => {
      const row: ResultScopeRow = {
        result_id: 7100,
        status_id: 3,
        aow_acronym: null,
        has_intermediate: 0,
        has_eoi: 1,
        aow_codes: null,
      };

      expect(toResultScopeDto(row)).toEqual({
        result_id: 7100,
        key: 'EOI_2030',
        kind: 'outcome',
        codes: [],
      });
    });

    it('maps a result with no ToC link at all (unlinked) to UNTAGGED with no codes', () => {
      // RAC-R-1.1 / RAC-R-1 scenario fixture: result #8702.
      const row: ResultScopeRow = {
        result_id: 8702,
        status_id: 1,
        aow_acronym: null,
        has_intermediate: 0,
        has_eoi: 0,
        aow_codes: null,
      };

      expect(toResultScopeDto(row)).toEqual({
        result_id: 8702,
        key: 'UNTAGGED',
        kind: 'untagged',
        codes: [],
      });
    });
  });
});
