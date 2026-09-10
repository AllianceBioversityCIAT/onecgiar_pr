// @akili-spec changes/results-aow-column-filter (RAC-T-1)

/**
 * One entry of `GET results-framework-reporting/results-scope` — a result's
 * scope bucket, computed by the same rule `getScopeBuckets` uses for the
 * Overview (design.md §4.1, §5, RAC-R-1).
 */
export interface ResultScopeDto {
  result_id: number;
  key: string;
  kind: 'aow' | 'outcome' | 'untagged';
  codes: string[];
}

/**
 * Raw per-result row produced by the shared `queryResultScopeRows` query
 * (RAC-DD-2) — the same `result_scope` CTE `getScopeBuckets` aggregates from.
 * Numeric columns arrive as `number | string` because the raw SQL driver
 * does not coerce them; `toResultScopeDto` normalizes.
 */
export interface ResultScopeRow {
  result_id: number | string;
  status_id: number | string;
  aow_acronym: string | null;
  has_intermediate: number | string | null;
  has_eoi: number | string | null;
  aow_codes: string | null;
}
