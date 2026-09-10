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

/** `result_type_id` for Knowledge product — the only category that branches the report form. */
export const KNOWLEDGE_PRODUCT_TYPE_ID = 6;
export const OTHER_OUTCOME_TYPE_ID = 4;
export const OTHER_OUTPUT_TYPE_ID = 8;

/** Indicator row, emerging picker card, or form body fragment — anything that might declare a category. */
export interface ReportResultTypeCandidate {
  result_type_id?: number | null;
  result_type_name?: string | null;
  type_name?: string | null;
  type_value?: string | null;
  /** Emerging-result picker uses `id` / `name` instead of `result_type_*`. */
  id?: number | null;
  name?: string | null;
}

const CANONICAL_RESULT_TYPE_NAMES: Record<number, string> = {
  1: 'Policy change',
  2: 'Innovation use',
  4: 'Other outcome',
  5: 'Capacity sharing for development',
  6: 'Knowledge product',
  7: 'Innovation development',
  8: 'Other output'
};

/** Normalizes catalog / ToC labels ("Other Output", "Other Outputs") for lookup. */
function normalizeResultTypeLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const RESULT_TYPE_LABEL_TO_ID: Record<string, number> = {
  'policy change': 1,
  'innovation use': 2,
  'other outcome': OTHER_OUTCOME_TYPE_ID,
  'other outcomes': OTHER_OUTCOME_TYPE_ID,
  'capacity sharing for development': 5,
  'knowledge product': KNOWLEDGE_PRODUCT_TYPE_ID,
  'knowledge products': KNOWLEDGE_PRODUCT_TYPE_ID,
  'number of knowledge products': KNOWLEDGE_PRODUCT_TYPE_ID,
  'innovation development': 7,
  'other output': OTHER_OUTPUT_TYPE_ID,
  'other outputs': OTHER_OUTPUT_TYPE_ID
};

function inferResultTypeIdFromLabel(value: string | null | undefined): number | null {
  const normalized = normalizeResultTypeLabel(value);
  return normalized ? (RESULT_TYPE_LABEL_TO_ID[normalized] ?? null) : null;
}

/** Mirrors `indicatorResultTypeCaseSql` so rows missing `result_type_id` still resolve on the client. */
function inferResultTypeIdFromTypology(typeValue: string | null | undefined): number | null {
  const typology = (typeValue ?? '').trim();
  if (!typology) return null;
  if (typology.includes('Number of Policy')) return 1;
  if (typology.includes('Innovation Use')) return 2;
  if (typology.includes('Number of people trained')) return 5;
  if (typology.includes('Number of knowledge products')) return KNOWLEDGE_PRODUCT_TYPE_ID;
  if (typology.includes('Number of innovations')) return 7;
  if (typology === 'Altmetric score') return OTHER_OUTCOME_TYPE_ID;
  return null;
}

/**
 * Resolve the PRMS result category for a reporting indicator.
 * Precedence: explicit id → `result_type_name` / emerging `name` → legacy `type_name` label → `type_value` typology.
 */
export function resolveReportResultTypeId(input: ReportResultTypeCandidate | null | undefined): number | null {
  if (!input) return null;

  const explicitId = input.result_type_id ?? input.id;
  if (explicitId != null && Number.isFinite(Number(explicitId))) return Number(explicitId);

  return (
    inferResultTypeIdFromLabel(input.result_type_name ?? input.name) ??
    inferResultTypeIdFromLabel(input.type_name) ??
    inferResultTypeIdFromTypology(input.type_value)
  );
}

/** Human-readable category for read-only chips — never the ToC metric name when a category is known. */
export function resolveReportResultTypeName(
  input: ReportResultTypeCandidate | null | undefined,
  resolvedTypeId: number | null = resolveReportResultTypeId(input)
): string {
  const declared = input?.result_type_name?.trim() || input?.name?.trim();
  if (declared) return declared;
  if (resolvedTypeId != null && CANONICAL_RESULT_TYPE_NAMES[resolvedTypeId]) {
    return CANONICAL_RESULT_TYPE_NAMES[resolvedTypeId];
  }
  return input?.type_name?.trim() ?? '';
}

/** Whether the indicator / picker selection should render the knowledge-product (CGSpace) flow. */
export function isKnowledgeProductResultType(input: ReportResultTypeCandidate | null | undefined): boolean {
  return resolveReportResultTypeId(input) === KNOWLEDGE_PRODUCT_TYPE_ID;
}

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
  /**
   * P2-3420 — answer to "Are you reporting the use of an innovation that has already been reported
   * and quality assessed?". Only ever set for an Innovation Use result from the 2026 phase onwards;
   * left undefined everywhere else so earlier phases post exactly the body they post today.
   */
  hasInnovationLink?: boolean | null;
  /** The single Innovation Development result picked when the answer is "Yes". */
  linkedResultId?: number | null;
}

/**
 * Resolve the result type. Precedence copied from the modal: an indicator that declares its own
 * category always wins over anything the user could have picked, because the picker is only shown
 * when the indicator declares none.
 */
function resolveResultTypeId(options: CreateResultPayloadOptions): number | null {
  return (
    resolveReportResultTypeId(options.indicator) ??
    resolveReportResultTypeId(options.emergingCategory) ??
    options.body.result_type_id ??
    null
  );
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

/**
 * Only spreads the two link keys when the caller actually asked the question. A form that never
 * shows it (any category but Innovation use, or any phase before 2026) posts the exact same body
 * it posts today — the epic's hard rule.
 */
function resolveInnovationLink(options: CreateResultPayloadOptions): Record<string, any> {
  if (options.hasInnovationLink == null) return {};
  const linked = options.hasInnovationLink === true && options.linkedResultId != null ? [Number(options.linkedResultId)] : [];
  return { has_innovation_link: options.hasInnovationLink === true, linked_results: linked };
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
      handler: resolveHandler(options, resultTypeId),
      // P2-3420 — the answer rides INSIDE the create. Chaining the innovation-use PATCH afterwards
      // does not work: it rejects a body without a valid `innovation_use_level_id`, which a result
      // created a moment ago does not have yet. The server stores it where Contributors and
      // partners already keeps it, so the user sees the answer ticked there.
      ...resolveInnovationLink(options)
    },
    number_target: indicator?.['number_target'],
    target_date: indicator?.['target_date'],
    contributing_indicator: resultTypeId === 6 ? 1 : options.body.contribution_to_indicator_target,
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
