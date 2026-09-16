import {
  REVIEW_RESULT_ID_QUERY_PARAM,
  REVIEW_RESULT_QUERY_PARAM
} from '../../pages/result-framework-reporting/pages/bilateral-review/services/bilateral-results.service';

/** Where a W3/Bilateral list row should open when the user activates it. */
export type BilateralOpenRouteKind = 'center-editor' | 'review-drawer' | 'result-detail';

/** Normalized slice both Programme Results and Results Center can supply. */
export interface BilateralOpenRouteInput {
  sourceOrOrigin?: string | null;
  statusId?: number | string | null;
  statusName?: string | null;
  leadCenter?: string | null;
  resultCode?: string | number | null;
  versionId?: string | number | null;
  submitterCode?: string | null;
  resultId?: number | string | null;
  /** Programme official code when submitter is missing (review-drawer route). */
  programmeCodeFallback?: string | null;
}

export interface BilateralOpenRouteResult {
  kind: BilateralOpenRouteKind;
  commands: unknown[];
  queryParams: Record<string, unknown>;
}

const EDITING_STATUS_ID = 1;
const DRAFT_STATUS_ID = 8;

export function isW3BilateralsAvisa(input: Pick<BilateralOpenRouteInput, 'sourceOrOrigin' | 'submitterCode'>): boolean {
  if (input.sourceOrOrigin !== 'W3/Bilaterals') return false;
  const code = input.submitterCode ?? '';
  return code === 'SGP-02' || code === 'SGP02';
}

export function isW3BilateralRow(input: Pick<BilateralOpenRouteInput, 'sourceOrOrigin'>): boolean {
  return input.sourceOrOrigin === 'W3/Bilaterals';
}

/** Editing or Draft — center submitter still filling the bilateral result. */
export function isBilateralCenterEditorStatus(input: Pick<BilateralOpenRouteInput, 'statusId' | 'statusName'>): boolean {
  const id = input.statusId != null && input.statusId !== '' ? Number(input.statusId) : NaN;
  if (!Number.isNaN(id)) {
    return id === EDITING_STATUS_ID || id === DRAFT_STATUS_ID;
  }
  const name = input.statusName ?? '';
  return name === 'Editing' || name === 'Draft';
}

/**
 * Whether "Update result" should use bilateral carry-forward rules (lead centre + Approved).
 * Broader than review-drawer routing — matches pre-fix `usesBilateralReviewFlow` semantics.
 */
export function isW3BilateralForUpdate(input: BilateralOpenRouteInput): boolean {
  if (!isW3BilateralRow(input) || isW3BilateralsAvisa(input)) return false;
  return input.statusName !== 'Approved';
}

/** True when the row opens in the programme bilateral review drawer. */
export function usesBilateralReviewFlow(input: BilateralOpenRouteInput): boolean {
  return classifyBilateralOpenRoute(input) === 'review-drawer';
}

export function classifyBilateralOpenRoute(input: BilateralOpenRouteInput): BilateralOpenRouteKind {
  if (!isW3BilateralRow(input) || isW3BilateralsAvisa(input) || input.statusName === 'Approved') {
    return 'result-detail';
  }

  const leadCenter = (input.leadCenter ?? '').trim();
  if (isBilateralCenterEditorStatus(input) && leadCenter) {
    return 'center-editor';
  }

  if (isBilateralCenterEditorStatus(input) && !leadCenter) {
    return 'result-detail';
  }

  return 'review-drawer';
}

export function resolveBilateralResultOpenRoute(input: BilateralOpenRouteInput): BilateralOpenRouteResult {
  const kind = classifyBilateralOpenRoute(input);
  const phase = input.versionId ?? '';
  const code = input.resultCode ?? '';

  if (kind === 'center-editor') {
    return {
      kind,
      commands: ['/bilateral', input.leadCenter, 'result', code],
      queryParams: { phase }
    };
  }

  if (kind === 'review-drawer') {
    const programmeCode = input.submitterCode || input.programmeCodeFallback || '';
    return {
      kind,
      commands: ['/result-framework-reporting', 'entity-details', programmeCode, 'bilateral-review'],
      queryParams: {
        [REVIEW_RESULT_QUERY_PARAM]: code,
        [REVIEW_RESULT_ID_QUERY_PARAM]: input.resultId
      }
    };
  }

  return {
    kind,
    commands: ['/result', 'result-detail', code, 'general-information'],
    queryParams: { phase }
  };
}
