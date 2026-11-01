// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-1, design §4)

/** E2 `GET study-types` item. */
export interface ImpactStudyType {
  id: number;
  name: string;
  definition: string;
}

/** A previously reported result linked from an impact result. */
export interface ImpactPreviousResult {
  result_id: number;
  result_code: number;
  title: string;
  result_type_name: string;
  phase_name: string;
  portfolio_acronym: string;
  status_name: string;
}

/** E3 `GET get/result/:resultId` and E4 response. */
export interface ImpactLevelInfo {
  impact_study_type_id: number | null;
  cgiar_contribution: string | null;
  previously_reported: boolean | null;
  previous_results: ImpactPreviousResult[];
}

/** E4 `PATCH save/result/:resultId` body: all four fields always sent. */
export interface SaveImpactLevelBody {
  impact_study_type_id: number | null;
  cgiar_contribution: string | null;
  previously_reported: boolean | null;
  previous_result_ids: number[];
}

/** E5 query params. */
export interface ImpactPreviousResultsSearchParams {
  q?: string | null;
  versionId?: number | string | null;
  portfolioId?: number | string | null;
  typeIds?: Array<number | string> | null;
  excludeResultId?: number | string | null;
  page?: number | null;
  limit?: number | null;
}

/** E5 response. */
export interface ImpactPreviousResultsSearchResponse {
  items: ImpactPreviousResult[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
