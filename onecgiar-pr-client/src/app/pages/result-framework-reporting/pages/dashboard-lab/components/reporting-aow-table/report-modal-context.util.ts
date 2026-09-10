/**
 * Adapter between a Reporting-table row and the ToC node shape the LEGACY report modal
 * (`app-aow-hlo-create-modal`) reads off `EntityAowService.currentResultToReport`.
 *
 * Parity contract: `aow-hlo-table.openReportResultModal(item, indicatorId, centerId)` hands the
 * modal `{ ...node, indicators: [the ONE clicked indicator] }`. The modal then forwards
 * `indicators[0]` VERBATIM into the create payload, so the narrowing is not cosmetic — it decides
 * what gets POSTed. Reproducing it here keeps the new entry point byte-compatible with the old one
 * instead of inventing a second shape.
 */

/**
 * Display-only keys the Reporting table bolts onto every indicator row (`indicatorsByAow` /
 * `flattenBucketIndicators`). They must never reach the payload: `__hloNode` is the ENTIRE HLO
 * group — every sibling indicator, targets and all — so forwarding a raw row would bloat the
 * request body with data the server neither expects nor ignores gracefully.
 */
const REPORTING_DISPLAY_KEYS = ['__aowCode', '__aowName', '__hlo', '__tier', '__hloNode'] as const;

/** Copy of the row without the table's display extras. */
export function stripReportingDisplayKeys(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...(row ?? {}) };
  for (const key of REPORTING_DISPLAY_KEYS) delete clean[key];
  return clean;
}

/**
 * Build the `currentResultToReport` node for the clicked row.
 *
 * The row is a spread copy of one of `node.indicators`, so the filter below normally re-selects
 * that exact entry (by `indicator_id`, disambiguated by `center_id` when the indicator is split per
 * center — same two-key match the old call site used). The fallbacks only fire on rows that reached
 * the table through a path that lost the group, and they keep the modal openable rather than
 * letting it read `indicators[0]` of an empty array.
 */
export function buildReportModalNode(
  node: Record<string, unknown> | null | undefined,
  row: Record<string, unknown>
): Record<string, unknown> {
  const cleanRow = stripReportingDisplayKeys(row);

  if (!node) {
    // No group in hand: the modal still needs the ToC id (existing-results panel) and a title.
    return {
      toc_result_id: row?.['toc_result_id'],
      result_title: row?.['__hlo'] ?? '',
      indicators: [cleanRow]
    };
  }

  const indicators = Array.isArray(node['indicators']) ? (node['indicators'] as Record<string, unknown>[]) : [];
  const rowCenterId = row?.['center_id'];
  const matches = indicators.filter(
    indicator =>
      indicator?.['indicator_id'] === row?.['indicator_id'] &&
      (rowCenterId == null || indicator?.['center_id'] === rowCenterId)
  );

  return { ...node, indicators: matches.length ? matches : [cleanRow] };
}
