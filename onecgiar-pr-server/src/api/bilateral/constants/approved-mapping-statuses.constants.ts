/**
 * `clarisa_project_mappings.status` values that mean "approved" (P2-3313). Shared by the
 * in-memory rule in `BilateralProjectsService` and the SQL restatement in
 * `ClarisaProjectsRepository.getPortfolioProjectFacts`.
 */
export const APPROVED_MAPPING_STATUSES: ReadonlySet<string> = new Set([
  'Confirmed',
]);
