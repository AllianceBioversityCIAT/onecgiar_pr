// @akili-spec bilateral/resubmit-followups (RSF-T-2, RSF-R-3)

import { mapResultHeader } from './result-header.mapper';

/**
 * `primary_science_program` is read from the role-1 ("Owner") entry of the bilateral GET's
 * `obj_results_toc_result`. Since RSF-T-2 `ResultRepository.getTocMappingsByResultId` returns only
 * ACTIVE role-1 rows, so the fixtures below are exactly what that query yields: a former (inactive)
 * owner never reaches the mapper.
 */
describe('mapResultHeader — primary_science_program (RSF-R-3)', () => {
  const toc = (name: string, initiative_role: string) => ({
    official_code: name,
    name,
    initiative_role,
    toc_mappings: [],
  });

  it('owner changed: the active owner (SP11) is the primary; the contributor is not', () => {
    const header = mapResultHeader({
      obj_results_toc_result: [
        toc('SP11', 'Owner'),
        toc('SP06', 'Contributor'),
      ],
    });

    expect(header.primary_science_program).toBe('SP11');
  });

  it('ownerless (no active role 1): no primary, and a contributor is NOT promoted', () => {
    const header = mapResultHeader({
      obj_results_toc_result: [toc('SP06', 'Contributor')],
    });

    expect(header.primary_science_program).toBeNull();
  });

  it('no mappings at all: no primary', () => {
    expect(
      mapResultHeader({ obj_results_toc_result: [] }).primary_science_program,
    ).toBeNull();
    expect(mapResultHeader({}).primary_science_program).toBeNull();
  });

  it('keeps the rest of the header untouched', () => {
    const header = mapResultHeader({
      obj_result_type: { name: 'Innovation development' },
      obj_version: { phase_name: 'Reporting 2026' },
      leading_result: { acronym: 'CIAT', name: 'Alliance' },
      obj_results_toc_result: [toc('SP11', 'Owner')],
    });

    expect(header).toEqual({
      type: 'Innovation development',
      reporting_phase: 'Reporting 2026',
      reporting_center: 'CIAT',
      primary_science_program: 'SP11',
    });
  });
});
