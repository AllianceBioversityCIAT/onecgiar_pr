import { stripReportingDisplayKeys } from '../../pages/dashboard-lab/components/reporting-aow-table/report-modal-context.util';

/**
 * CANONICAL create-result payload.
 *
 * Extracted from `aow-hlo-create-modal.createResult()` — the shape production has been POSTing —
 * so the aside, the legacy modal and guided creation stop drifting apart. It is a PURE function:
 * no signals, no injection, no HTTP. Everything it needs arrives in `options`.
 *
 * Why an options OBJECT and not positional arguments: the bilateral work (P2-3352 / P2-3341)
 * adds keys to this body. An object lets a caller add one without every existing call site
 * changing signature.
 */

/** Sentinel row that reveals the second "Other(s) CGIAR Centers" dropdown. Never travels. */
export const OTHER_CENTERS_CODE = '__OTHER_CENTERS__';
/** Sentinel row that reveals the second "Other(s) Science Programs" dropdown. Never travels. */
export const OTHER_SP_ID = -999;

/** The four fields the user actually types/picks in the form. */
export interface ReportResultFormBody {
  handler: string;
  result_name: string;
  result_type_id: number | null;
  contribution_to_indicator_target: number | null;
}

export interface CreateResultPayloadOptions {
  /** The single ToC indicator being reported against. Null for an emerging result. */
  indicator: Record<string, any> | null;
  /** The HLO group holding the indicator. Null for an emerging result. */
  tocNode: Record<string, any> | null;
  /** Owning Science Program (clarisa initiative id). */
  initiativeId: number;
  body: ReportResultFormBody;
  /** Set only in emerging mode, where the category is fixed by the entry card. */
  emergingCategory?: { id: number; name: string; levelId: number } | null;
  /** Metadata retrieved from the repository. Only ever set for a knowledge product. */
  mqapJson?: any | null;
  /** Dropdown 1 — centers derived from the ToC. May still contain the sentinel. */
  tocCentersSelected?: any[];
  /** Dropdown 2 — centers the user added on top. */
  otherCentersSelected?: any[];
  /** Dropdown 1 — science programs derived from the ToC. May still contain the sentinel. */
  tocScienceSelected?: any[];
  /** Dropdown 2 — science programs the user added on top. */
  otherScienceSelected?: any[];
  bilateralProjects?: any[];
}

/**
 * Resolve the result type. Precedence copied from the modal: an indicator that declares its own
 * category always wins over anything the user could have picked, because the picker is only shown
 * when the indicator declares none.
 */
function resolveResultTypeId(options: CreateResultPayloadOptions): number | null {
  return options.indicator?.['result_type_id'] ?? options.emergingCategory?.id ?? options.body.result_type_id ?? null;
}

/** The level is never chosen by the user: it comes from the indicator, then the node. */
function resolveResultLevelId(options: CreateResultPayloadOptions): number | null {
  return options.indicator?.['result_level_id'] || options.tocNode?.['result_level_id'] || options.emergingCategory?.levelId || null;
}

/**
 * Knowledge-product metadata only belongs in the body when the result IS a knowledge product.
 *
 * Guard against a real, reproducible sequence: pick "Knowledge product" in the category dropdown,
 * sync a handle, then change the category to something else. The retrieved metadata used to stay
 * in the payload; the server branches on `result_type_id === 6`, so it silently dropped it and
 * created a result of the new type carrying a knowledge product's title.
 */
function resolveKnowledgeProduct(options: CreateResultPayloadOptions, resultTypeId: number | null): any | null {
  return resultTypeId === 6 ? (options.mqapJson ?? null) : null;
}

/** Same rule as above for the repository link. */
function resolveHandler(options: CreateResultPayloadOptions, resultTypeId: number | null): string {
  return resultTypeId === 6 ? (options.body.handler ?? '') : '';
}

/**
 * Merge dropdown 1 (ToC, `from_toc: true`) with dropdown 2 (added, `from_toc: false`), dropping the
 * sentinel row. The flag is what the server reads to tag ToC-derived contributors, and what the
 * Contributors & Partners form reads to bucket them on redirect (P2-3114).
 */
function mergeContributors<T extends Record<string, any>>(fromToc: T[], added: T[], isSentinel: (item: T) => boolean): T[] {
  return [...(fromToc ?? []).filter(item => !isSentinel(item)).map(item => ({ ...item, from_toc: true })), ...(added ?? []).map(item => ({ ...item, from_toc: false }))];
}

export function buildCreateResultPayload(options: CreateResultPayloadOptions): Record<string, any> {
  const resultTypeId = resolveResultTypeId(options);
  const indicator = options.indicator;

  return {
    result: {
      result_type_id: resultTypeId,
      result_level_id: resolveResultLevelId(options),
      initiative_id: options.initiativeId,
      result_name: options.body.result_name,
      handler: resolveHandler(options, resultTypeId)
    },
    number_target: indicator?.['number_target'],
    target_date: indicator?.['target_date'],
    contributing_indicator: options.body.contribution_to_indicator_target,
    contributing_center: mergeContributors(options.tocCentersSelected ?? [], options.otherCentersSelected ?? [], center => center?.code === OTHER_CENTERS_CODE),
    knowledge_product: resolveKnowledgeProduct(options, resultTypeId),
    toc_result_id: options.tocNode?.['toc_result_id'],
    // The legacy modal always sends an empty string here: it has no narrative field, and neither
    // does the aside. Kept so the body shape does not change under the server.
    toc_progressive_narrative: '',
    // `stripReportingDisplayKeys` is defence in depth. The Reporting table bolts `__hloNode` — the
    // WHOLE HLO group, every sibling indicator included — onto each row, and this entry point
    // receives rows that never passed through `buildReportModalNode`.
    indicators: indicator ? stripReportingDisplayKeys(indicator) : [],
    contributors_result_toc_result: mergeContributors(options.tocScienceSelected ?? [], options.otherScienceSelected ?? [], sp => sp?.id === OTHER_SP_ID),
    bilateral_project: options.bilateralProjects ?? []
  };
}
