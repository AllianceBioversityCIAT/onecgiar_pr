// @akili-spec quality-assurance/qa-results-feed
import {
  EligibleBreakdown,
  EligibleResultRow,
  IneligibleReason,
} from '../qa-results.repository';

/**
 * QRF-R-5 / R-6: body of `GET /api/qa/results`. Keys are the agreed contract, additive-only
 * (ADR-004); no table or column name may appear here (QRF-R-9).
 */
export type QaResultsListItem = EligibleResultRow;
export type QaResultsBreakdown = EligibleBreakdown;

export interface QaResultsListResponse {
  phase: number;
  page: number;
  page_size: number;
  /** Count of the FILTERED eligible set, independent of `page` (QRF-R-4). */
  total: number;
  breakdown: QaResultsBreakdown;
  items: QaResultsListItem[];
}

/**
 * QRF-R-7 / R-8: body of `POST /api/qa/results/details`. `values` is keyed by catalog field key, nested by subfield key; `labels` is the per-result
 * label dictionary of the option ids in `values` (QVL-R-1); the `reason` set is the closed `IneligibleReason` list. Additive-only (ADR-004).
 */
export interface QaResultsDetailsItem {
  result_id: number;
  result_code: number;
  result_type_key: string;
  values: Record<string, unknown>;
  /**
   * QVL-R-1 / R-2: `{ control list: { option id (a string): label | null } }` for every option id held in THIS result's returned
   * `values`, at any depth; `{}` (never absent) when it holds none. `null` is an id with no row. Person-bearing lists (`users`,
   * `directory_users`) appear only when a returned person-bearing field holds the id (QVL-R-6). Additive-only (ADR-004).
   */
  labels: Record<string, Record<string, string | null>>;
}

export interface QaResultsNotEligible {
  result_id: number;
  reason: IneligibleReason;
}

export interface QaResultsDetailsResponse {
  phase: number;
  catalog_version: string;
  results: QaResultsDetailsItem[];
  not_eligible: QaResultsNotEligible[];
}
