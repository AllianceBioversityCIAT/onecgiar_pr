// @akili-spec changes/sp-overview-echarts/results-tab-filter-deeplink
/**
 * Query-param contract for the Results tab's URL ↔ filter bridge (RFD-DD-3). Plain names —
 * `phase`/`reviewResult`/`reviewResultId` already live on this route and none of these four
 * collide with them. Sibling #3 (Overview card links) imports this file rather than
 * hardcoding the param names, so the two features cannot drift apart.
 */
export const PROGRAMME_RESULTS_PHASE_QUERY_PARAM = 'phase';
export const PROGRAMME_RESULTS_STATUS_QUERY_PARAM = 'status';
export const PROGRAMME_RESULTS_CATEGORY_QUERY_PARAM = 'category';
export const PROGRAMME_RESULTS_ORIGIN_QUERY_PARAM = 'origin';
export const PROGRAMME_RESULTS_CENTER_QUERY_PARAM = 'center';
export const PROGRAMME_RESULTS_CREATED_BY_QUERY_PARAM = 'createdBy';
// @akili-spec changes/results-aow-column-filter (RAC-T-3)
// Same string as the Overview's `?scope=` (RAC-DD-3) — the bucket-key vocabulary is shared, so
// this deliberately is NOT namespaced to avoid colliding with it; `?section=` only ever appears
// on THIS route. Multi-value: a comma-separated list of bucket keys (RAC-R-3).
export const PROGRAMME_RESULTS_SECTION_QUERY_PARAM = 'section';

export type ProgrammeResultsQueryParamDimension = 'phase' | 'status' | 'category' | 'origin' | 'center' | 'createdBy' | 'section';

/** `dimension → param name`, in toolbar order. */
export const PROGRAMME_RESULTS_QUERY_PARAM_MAP: Record<ProgrammeResultsQueryParamDimension, string> = {
  phase: PROGRAMME_RESULTS_PHASE_QUERY_PARAM,
  status: PROGRAMME_RESULTS_STATUS_QUERY_PARAM,
  category: PROGRAMME_RESULTS_CATEGORY_QUERY_PARAM,
  origin: PROGRAMME_RESULTS_ORIGIN_QUERY_PARAM,
  center: PROGRAMME_RESULTS_CENTER_QUERY_PARAM,
  // @akili-spec result-framework-reporting/programme-results-created-by-filter
  createdBy: PROGRAMME_RESULTS_CREATED_BY_QUERY_PARAM,
  // @akili-spec changes/results-aow-column-filter (RAC-T-3)
  section: PROGRAMME_RESULTS_SECTION_QUERY_PARAM
};
