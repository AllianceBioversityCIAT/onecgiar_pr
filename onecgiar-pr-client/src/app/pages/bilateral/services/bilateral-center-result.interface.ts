// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-DD-11, COV-R-16)
/**
 * Single home for `BilateralCenterResult` (`COV-DD-11`) — previously declared in
 * `bilateral-results-list.component.ts`, which now re-exports it for existing imports. Both the
 * Results tab and the pure Overview/filter modules (`bilateral-result-filter.ts`,
 * `bilateral-overview.aggregate.ts`) import the row shape from here.
 */
export interface BilateralCenterResult {
  id: number;
  result_code: string;
  title: string;
  /** P2-3152 AC6 — result description, listed next to the title on the centre dashboard. */
  description?: string | null;
  /** P2-3152 AC6 — name of the W3/Bilateral project the result was reported under. */
  project_name?: string | null;
  /**
   * COV-R-16 — the lead bilateral project's CLARISA project id, same selection rule as
   * `project_name` (`is_lead` subquery); `null` when the result has no linked bilateral project
   * (W1/W2 rows or unlinked results). Used to join a result to a project card without relying on
   * display names (`COV-R-9` Scenario B).
   */
  project_id?: number | null;
  result_type: string;
  /**
   * P2-3653 — `ResultTypeEnum` id. The display name above cannot gate "Update result": the rule
   * is shared with the Results Center list, which compares ids.
   */
  result_type_id?: number;
  /**
   * P2-3653 — official code of the result's primary Science Program (role 1), under the key the
   * change-phase modal reads (`scienceProgram` getter). Same name the Results Center list uses.
   */
  submitter?: string | null;
  status_id: number;
  status_name: string;
  created_date: string;
  version_id: number;
  source: 'API' | 'Result';
  creation_method?: string;
  is_ai_generated?: boolean | number;
  is_leading_result: 0 | 1;
}
