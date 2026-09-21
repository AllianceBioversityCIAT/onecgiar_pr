// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-R-13, COV-R-14, COV-R-3 A, COV-R-7 AND, COV-DD-3)
import { convertToParamMap } from '@angular/router';
import { BilateralCenterResult } from './services/bilateral-center-result.interface';
import { applyResultsTabDefaults, BilateralQueryParams, parseBilateralQueryParams } from './bilateral-query-params';
import { filterCenterResults, isAiResult, normalizeBilateralSearchText } from './bilateral-result-filter';

// Derived from the parser's own "no contract param" output (COV-T-2 review follow-up) rather than
// a hand-written literal, so this fixture can never drift from what parseBilateralQueryParams
// actually defaults to.
const DEFAULT_PARAMS: BilateralQueryParams = parseBilateralQueryParams(convertToParamMap({})).params;

function withParams(overrides: Partial<BilateralQueryParams>): BilateralQueryParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}

/** Fixture: 12 rows covering string ids (D1), null `project_id` (W1/W2 + unlinked), discontinued
 *  status, AI vs manual creation, and lead/contributing on both sources. */
const rows: BilateralCenterResult[] = [
  {
    id: 1,
    result_code: 'R-001',
    title: 'Cocoa yield synthesis report',
    project_name: 'Cocoa Value Chain',
    project_id: 118,
    result_type: 'Knowledge Product',
    result_type_id: 6,
    submitter: 'SP03',
    status_id: '5' as unknown as number, // D1 — wire sometimes sends status_id as a string
    status_name: 'Pending review',
    created_date: '2026-01-10',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
    created_by_name: 'Angel Jarrin',
  },
  {
    id: 2,
    result_code: 'R-002',
    title: 'Maize seed variety trial',
    project_name: 'Cocoa Value Chain',
    project_id: 118,
    result_type: 'Knowledge Product',
    result_type_id: 6,
    submitter: 'SP03',
    status_id: 6,
    status_name: 'Approved',
    created_date: '2026-01-11',
    version_id: 35,
    source: 'API',
    creation_method: 'AI',
    is_ai_generated: 1,
    is_leading_result: 0,
    created_by_name: 'Santiago Sanchez',
  },
  {
    id: 3,
    result_code: 'R-003',
    title: 'Policy brief on water use',
    project_name: 'Water Futures',
    project_id: 42,
    result_type: 'Policy Change',
    result_type_id: 1,
    submitter: 'SP11',
    status_id: 7,
    status_name: 'Rejected',
    created_date: '2026-01-12',
    version_id: 35,
    source: 'Result',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
  },
  {
    id: 4,
    result_code: 'R-004',
    title: 'Discontinued field trial',
    project_name: null,
    project_id: null,
    result_type: 'Other output',
    result_type_id: 8,
    submitter: null,
    status_id: 4,
    status_name: 'Discontinued',
    created_date: '2026-01-13',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
  },
  {
    id: 5,
    result_code: 'R-005',
    title: 'Knowledge product draft note',
    project_name: 'Cocoa Value Chain',
    project_id: 118,
    result_type: 'Knowledge Product',
    result_type_id: 6,
    submitter: 'SP03',
    status_id: '1' as unknown as number,
    status_name: 'Editing',
    created_date: '2026-01-14',
    version_id: 35,
    source: 'Result',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 0,
  },
  {
    id: 6,
    result_code: 'R-006',
    title: 'Training capacity note',
    project_name: 'Skills Hub',
    project_id: 99,
    result_type: 'Capacity Sharing for Development',
    result_type_id: 7,
    submitter: 'SP99',
    status_id: 2,
    status_name: 'QA',
    created_date: '2026-01-15',
    version_id: 35,
    source: 'API',
    creation_method: 'AI',
    is_ai_generated: 1,
    is_leading_result: 1,
  },
  {
    id: 7,
    result_code: 'R-007',
    title: 'Innovation use case summary',
    project_name: 'Skills Hub',
    project_id: 99,
    result_type: 'Innovation use',
    result_type_id: 2,
    submitter: 'SP99',
    status_id: 3,
    status_name: 'Submitted',
    created_date: '2026-01-16',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 0,
  },
  {
    id: 8,
    result_code: 'R-008',
    title: 'Unlinked outcome note',
    project_name: null,
    project_id: null,
    result_type: 'Other outcome',
    result_type_id: 9,
    submitter: null,
    status_id: 5,
    status_name: 'Pending review',
    created_date: '2026-01-17',
    version_id: 35,
    source: 'Result',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
  },
  {
    id: 9,
    result_code: 'R-009',
    title: 'Zebra fish trial results',
    project_name: 'Water Futures',
    project_id: 42,
    result_type: 'Policy Change',
    result_type_id: 1,
    submitter: 'SP11',
    status_id: '6' as unknown as number,
    status_name: 'Approved',
    created_date: '2026-01-18',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 0,
  },
  {
    id: 10,
    result_code: 'R-010',
    title: 'Bilateral drylands assessment',
    project_name: 'Drylands Program',
    project_id: 7,
    result_type: 'Innovation development',
    result_type_id: 5,
    submitter: 'SP07',
    status_id: 5,
    status_name: 'Pending review',
    created_date: '2026-01-19',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
  },
  {
    id: 11,
    result_code: 'R-011',
    title: 'Contributing seed multiplication',
    project_name: 'Drylands Program',
    project_id: 7,
    result_type: 'Innovation development',
    result_type_id: 5,
    submitter: 'SP07',
    status_id: 5,
    status_name: 'Pending review',
    created_date: '2026-01-20',
    version_id: 35,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 0,
  },
  {
    id: 12,
    result_code: 'R-012',
    title: 'W1W2 unlinked pending review',
    project_name: null,
    project_id: null,
    result_type: 'Other outcome',
    result_type_id: 9,
    submitter: null,
    status_id: 5,
    status_name: 'Pending review',
    created_date: '2026-01-21',
    version_id: 35,
    source: 'Result',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
  },
];

function ids(result: BilateralCenterResult[]): number[] {
  return result.map(r => r.id);
}

describe('filterCenterResults', () => {
  it('returns every row when params are all-default', () => {
    expect(ids(filterCenterResults(rows, DEFAULT_PARAMS))).toEqual(rows.map(r => r.id));
  });

  it('filters by status, comparing Number(status_id) — including string ids (D1)', () => {
    const result = filterCenterResults(rows, withParams({ status: ['pending'] }));
    expect(ids(result)).toEqual([1, 8, 10, 11, 12]);
  });

  it('filters by project, comparing Number(project_id) — a null project_id never matches', () => {
    const result = filterCenterResults(rows, withParams({ project: [118] }));
    expect(ids(result)).toEqual([1, 2, 5]);
  });

  it('filters by program, matching the row submitter', () => {
    const result = filterCenterResults(rows, withParams({ program: ['SP11'] }));
    expect(ids(result)).toEqual([3, 9]);
  });

  it('filters by type, comparing Number(result_type_id)', () => {
    const result = filterCenterResults(rows, withParams({ type: [5] }));
    expect(ids(result)).toEqual([10, 11]);
  });

  it('filters by role: lead → is_leading_result === 1', () => {
    const result = filterCenterResults(rows, withParams({ role: 'lead' }));
    expect(ids(result)).toEqual([1, 3, 4, 6, 8, 10, 12]);
  });

  it('filters by role: contributing → is_leading_result === 0', () => {
    const result = filterCenterResults(rows, withParams({ role: 'contributing' }));
    expect(ids(result)).toEqual([2, 5, 7, 9, 11]);
  });

  it('filters by source: w3 → API rows only', () => {
    const result = filterCenterResults(rows, withParams({ source: 'w3' }));
    expect(ids(result)).toEqual([1, 2, 4, 6, 7, 9, 10, 11]);
  });

  it('filters by source: w1w2 → Result rows only', () => {
    const result = filterCenterResults(rows, withParams({ source: 'w1w2' }));
    expect(ids(result)).toEqual([3, 5, 8, 12]);
  });

  it('filters by method: ai → creation_method "AI" or Number(is_ai_generated) === 1', () => {
    const result = filterCenterResults(rows, withParams({ method: 'ai' }));
    expect(ids(result)).toEqual([2, 6]);
  });

  it('filters by method: manual → the complement of ai', () => {
    const result = filterCenterResults(rows, withParams({ method: 'manual' }));
    expect(ids(result)).toEqual([1, 3, 4, 5, 7, 8, 9, 10, 11, 12]);
  });

  it('filters by search, matching a single token against the Results tab haystack', () => {
    const result = filterCenterResults(rows, withParams({ search: 'zebra' }));
    expect(ids(result)).toEqual([9]);
  });

  it('filters by search, requiring every whitespace-separated token to match', () => {
    const result = filterCenterResults(rows, withParams({ search: 'seed multiplication' }));
    expect(ids(result)).toEqual([11]);
  });

  it('combines multiple dimensions with AND semantics', () => {
    const result = filterCenterResults(rows, withParams({ project: [118], role: 'lead' }));
    expect(ids(result)).toEqual([1]);
  });

  it('filters by createdBy display name with OR semantics inside the multiselect', () => {
    const one = filterCenterResults(rows, withParams({ createdBy: ['Angel Jarrin'] }));
    expect(ids(one)).toEqual([1]);

    const both = filterCenterResults(rows, withParams({ createdBy: ['Angel Jarrin', 'Santiago Sanchez'] }));
    expect(ids(both)).toEqual([1, 2]);
  });

  it('applyResultsTabDefaults(parse(emptyMap)) reproduces the Results tab no-param default (W3 + Lead)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({}));
    const result = filterCenterResults(rows, applyResultsTabDefaults(parsed).params);
    expect(ids(result)).toEqual([1, 4, 6, 10]);
  });

  it('`?phase=36` alone still gets the W3 + Lead default — phase is shell context, not a filter key (COV-DD-2/3 amendment)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ phase: '36' }));
    const result = filterCenterResults(rows, applyResultsTabDefaults(parsed).params);
    expect(ids(result)).toEqual([1, 4, 6, 10]);
  });

  it('does NOT default role/source when `?phase=36&role=all&source=all` is present (the Overview hero-link shape)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ phase: '36', role: 'all', source: 'all' }));
    const result = filterCenterResults(rows, applyResultsTabDefaults(parsed).params);
    // role/source stayed null (not defaulted) — every row passes, proving this is NOT the
    // W3+Lead-only default set.
    expect(ids(result)).toEqual(rows.map(r => r.id));
  });
});

describe('isAiResult', () => {
  it('is true when creation_method is "AI"', () => {
    expect(isAiResult(rows[1])).toBe(true); // id 2
  });

  it('is true when is_ai_generated normalizes to 1, regardless of creation_method', () => {
    expect(isAiResult({ ...rows[0], creation_method: 'Manual', is_ai_generated: '1' as unknown as number })).toBe(
      true,
    );
  });

  it('is false for a manual, non-AI-generated row', () => {
    expect(isAiResult(rows[0])).toBe(false); // id 1
  });
});

describe('normalizeBilateralSearchText', () => {
  it('lowercases, strips diacritics and collapses punctuation to spaces', () => {
    expect(normalizeBilateralSearchText('Café-Cacao Report!')).toBe('cafe cacao report ');
  });
});
