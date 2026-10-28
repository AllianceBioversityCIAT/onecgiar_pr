// @akili-spec quality-assurance/qa-results-feed
import { EligibleBreakdown, EligibleResultRow } from '../qa-results.repository';

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
