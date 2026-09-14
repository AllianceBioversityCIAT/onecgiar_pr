// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-R-13, COV-R-3 A, COV-R-7 AND, COV-DD-3)
import { BilateralCenterResult } from './services/bilateral-center-result.interface';
import { BilateralQueryParams, STATUS_KEY_TO_ID } from './bilateral-query-params';

/**
 * `filterCenterResults` is the ONE predicate every center tab applies (`COV-R-13`'s reconciliation
 * scenario, `COV-DD-3`): it applies exactly what `params` says — a `null` role/source/method means
 * both pass — and never merges in the Results tab's own defaults (that is
 * `applyResultsTabDefaults`'s job, in `bilateral-query-params.ts`, invoked by the caller before
 * this function ever sees the params).
 */
export function filterCenterResults(
  rows: readonly BilateralCenterResult[],
  params: BilateralQueryParams,
): BilateralCenterResult[] {
  const statusIds = params.status.length ? new Set(params.status.map(key => STATUS_KEY_TO_ID[key])) : null;
  const projectIds = params.project.length ? new Set(params.project) : null;
  const programCodes = params.program.length ? new Set(params.program) : null;
  const typeIds = params.type.length ? new Set(params.type) : null;
  const tokens = normalizeBilateralSearchText(params.search).trim().split(/\s+/).filter(Boolean);

  return rows.filter(row => {
    if (statusIds && !statusIds.has(Number(row.status_id))) return false;

    if (projectIds) {
      if (row.project_id === null || row.project_id === undefined) return false;
      if (!projectIds.has(Number(row.project_id))) return false;
    }

    if (programCodes && !(row.submitter != null && programCodes.has(row.submitter))) return false;

    if (typeIds && !typeIds.has(Number(row.result_type_id))) return false;

    if (params.role === 'lead' && Number(row.is_leading_result) !== 1) return false;
    if (params.role === 'contributing' && Number(row.is_leading_result) !== 0) return false;

    if (params.source === 'w3' && row.source !== 'API') return false;
    if (params.source === 'w1w2' && row.source !== 'Result') return false;

    if (params.method === 'ai' && !isAiResult(row)) return false;
    if (params.method === 'manual' && isAiResult(row)) return false;

    if (tokens.length) {
      const haystack = searchHaystack(row); // built once per row, not once per token
      if (!tokens.every(token => haystack.includes(token))) return false;
    }

    return true;
  });
}

/** `true` when a result was AI-assisted: `creation_method === 'AI'` OR `Number(is_ai_generated)
 *  === 1` — the wire delivers the flag as a boolean, a number or a numeric string. */
export function isAiResult(row: BilateralCenterResult): boolean {
  return row.creation_method === 'AI' || Number(row.is_ai_generated) === 1;
}

/**
 * Re-expresses the Results tab's existing token-search haystack EXACTLY
 * (`bilateral-results-list.component.ts` ~L205-232): result code, title, result type name, and a
 * literal "W3 bilateral" / "W1 W2" source hint.
 */
function searchHaystack(row: BilateralCenterResult): string {
  return normalizeBilateralSearchText(
    `${row.result_code} ${row.title} ${row.result_type} ${row.source === 'API' ? 'W3 bilateral' : 'W1 W2'}`,
  );
}

/**
 * The Results tab's `normalise()` helper (~L585-595), exported so the Results tab (`COV-T-7`) and
 * this module share one implementation instead of two copies drifting apart.
 */
export function normalizeBilateralSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
