import type { ResultScopeDto, ResultScopeRow } from './results-scope.dto';

/**
 * Pure row → DTO mapper for `GET results-framework-reporting/results-scope`
 * (RAC-R-1, design.md §5). `key` mirrors `getScopeBuckets`' bucket rule
 * exactly, over the same per-result row shape: the row's `aow_acronym`
 * (already the deterministic `MIN(UPPER(acronym))` tie-break computed by the
 * shared `result_scope` CTE) wins as `kind: 'aow'`; else `INTERMEDIATE` /
 * `EOI_2030` from the residual flags as `kind: 'outcome'`; else `UNTAGGED`
 * (`kind: 'untagged'`) — a result present in the population with no
 * `result_scope` row at all (RAC-R-1.1).
 *
 * `codes` lists every AoW acronym the result touches (`aow_codes`,
 * `GROUP_CONCAT(... ORDER BY UPPER(acronym))`), so for an `aow` bucket
 * `key === codes[0]` always holds — `aow_acronym` is `MIN()` over the same
 * sorted set `aow_codes` lists.
 */
// @akili-spec changes/results-aow-column-filter (RAC-T-1)
export function toResultScopeDto(row: ResultScopeRow): ResultScopeDto {
  const resultId = Number(row.result_id);
  const aowAcronym = row.aow_acronym
    ? String(row.aow_acronym).toUpperCase()
    : null;

  const codes = row.aow_codes
    ? String(row.aow_codes)
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean)
    : [];

  if (aowAcronym) {
    return { result_id: resultId, key: aowAcronym, kind: 'aow', codes };
  }

  if (Number(row.has_intermediate) === 1) {
    return {
      result_id: resultId,
      key: 'INTERMEDIATE',
      kind: 'outcome',
      codes: [],
    };
  }

  if (Number(row.has_eoi) === 1) {
    return { result_id: resultId, key: 'EOI_2030', kind: 'outcome', codes: [] };
  }

  return { result_id: resultId, key: 'UNTAGGED', kind: 'untagged', codes: [] };
}
