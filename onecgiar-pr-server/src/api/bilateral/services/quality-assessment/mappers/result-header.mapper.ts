// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * `result` header block (`type`, `reporting_phase`, `reporting_center`,
 * `primary_science_program`) — docs/bilateral-module/integration-contracts.md
 * "Quality assessment (outbound)". Source: `BilateralService.findOne` (design.md §5 `DD-2`).
 */
export function mapResultHeader(
  detail: Record<string, any>,
): Record<string, unknown> {
  const leadingResult = detail?.leading_result ?? null;
  const reportingCenter = leadingResult?.acronym || leadingResult?.name || null;

  const tocRows: any[] = Array.isArray(detail?.obj_results_toc_result)
    ? detail.obj_results_toc_result
    : [];
  const ownerRow = tocRows.find((row) => row?.initiative_role === 'Owner');

  return {
    type: detail?.obj_result_type?.name ?? null,
    reporting_phase: detail?.obj_version?.phase_name ?? null,
    reporting_center: reportingCenter,
    primary_science_program: ownerRow?.name ?? null,
  };
}
