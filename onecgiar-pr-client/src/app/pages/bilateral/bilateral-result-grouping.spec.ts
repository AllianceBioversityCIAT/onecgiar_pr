// @akili-spec changes/center-results-kpi-chips (CRK-T-3, CRK-R-1, CRK-R-2, CRK-R-4, CRK-DD-3)
import { BilateralCenterResult } from './services/bilateral-center-result.interface';
import { groupCenterResults, isReplicatedRow } from './bilateral-result-grouping';

function row(overrides: Partial<BilateralCenterResult>): BilateralCenterResult {
  return {
    id: 1,
    result_code: '1',
    title: 'T',
    result_type: 'Knowledge Product',
    status_id: 1,
    status_name: 'Editing',
    created_date: '2026-01-01',
    version_id: 1,
    source: 'API',
    is_leading_result: 1,
    is_replicated: false,
    ...overrides,
  };
}

describe('groupCenterResults', () => {
  it('groups by result_code, newest version first, group fields from the newest version, input order kept', () => {
    const v2025 = row({ id: 1, result_code: '9878', version_id: 2025, title: 'Old title' });
    const other = row({ id: 2, result_code: '9877', version_id: 2026, title: 'Other' });
    const v2026 = row({ id: 3, result_code: '9878', version_id: 2026, title: 'New title' });

    const groups = groupCenterResults([v2025, other, v2026]);

    expect(groups.length).toBe(2);
    expect(groups[0].result_code).toBe('9878');
    expect(groups[1].result_code).toBe('9877');
    expect(groups[0].versions.map(v => v.version_id)).toEqual([2026, 2025]);
    expect(groups[0].title).toBe('New title');
    expect(groups[0].id).toBe(3);
  });

  it('treats string and numeric result_code as the same group', () => {
    const groups = groupCenterResults([
      row({ id: 1, result_code: '9878', version_id: 1 }),
      row({ id: 2, result_code: 9878 as unknown as string, version_id: 2 }),
    ]);
    expect(groups.length).toBe(1);
    expect(groups[0].versions.length).toBe(2);
  });

  it('single-version row yields one version and fields equal the row', () => {
    const r = row({ id: 7, result_code: '55', title: 'Solo' });
    const [g] = groupCenterResults([r]);
    expect(g.versions).toEqual([r]);
    expect(g).toEqual({ ...r, versions: [r] });
  });

  it('does not merge different codes and returns [] for empty input', () => {
    expect(groupCenterResults([row({ result_code: 'A' }), row({ result_code: 'B' })]).length).toBe(2);
    expect(groupCenterResults([])).toEqual([]);
  });

  it('sorts version_id numerically even when it arrives as a string', () => {
    const [g] = groupCenterResults([
      row({ id: 1, result_code: 'X', version_id: '9' as unknown as number }),
      row({ id: 2, result_code: 'X', version_id: '10' as unknown as number }),
    ]);
    expect(g.versions.map(v => v.id)).toEqual([2, 1]);
  });
});

describe('isReplicatedRow', () => {
  it.each([[1], ['1'], [true]])('%p is replicated', value => {
    expect(isReplicatedRow({ is_replicated: value as unknown as boolean })).toBe(true);
  });
  it.each([[0], ['0'], [null], [undefined], [false]])('%p is not replicated', value => {
    expect(isReplicatedRow({ is_replicated: value as unknown as boolean })).toBe(false);
  });
});
