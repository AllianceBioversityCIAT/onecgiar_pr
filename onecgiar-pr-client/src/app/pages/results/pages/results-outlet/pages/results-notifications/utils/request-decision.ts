/**
 * BELL-T-1 (`notifications/bell-quick-inbox`, `BELL-DD-2`) — the request-decision helper.
 *
 * Pure functions extracted from `notification-item.component.ts` so the bell (a future task,
 * `BELL-T-2`/`BELL-T-3`) can share the exact same decision body and eligibility rules the inbox row
 * already uses, instead of risking drift by re-implementing them. `notification-item`'s
 * `acceptOrReject()` and `invalidateRequest()` now delegate to these — see that file's own
 * docstrings for the parts that stay component-owned (the busy flags, the ToC-mapping payload,
 * which needs component state the row seeds interactively).
 *
 * Every function here takes a plain row object (and, where needed, a small context object) and
 * returns a value — no HTTP calls, no component state, no mutation of the inputs.
 */

import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../internationalization/contribution-request-drawer.copy';

/** BELL-P-5 / `notification-item.component.ts::isIpsrNotification`: result type ids 10/11 are IPSR. */
function isIpsrNotification(row: any): boolean {
  const typeId = row?.obj_result?.obj_result_type?.id;
  return typeId === 10 || typeId === 11;
}

/** `notification-item.component.ts::get isQAed()`, verbatim. */
function isQAedRow(row: any): boolean {
  return row?.obj_result?.status_id == 2 && row?.request_status_id == 1;
}

/**
 * `notification-item.component.ts::isUpdateSource`, verbatim: true for a row tagged by
 * `buildUnifiedList()` as coming from the Updates stream.
 */
function isUpdateSourceRow(row: any): boolean {
  return row?.source === 'update';
}

/**
 * `notification-item.component.ts::get isPrimaryRequest()`, verbatim: never true for an
 * `isUpdateSource` row (those have no `request_type` at all).
 */
function isPrimaryRequestRow(row: any): boolean {
  return !isUpdateSourceRow(row) && row?.request_type === 'primary';
}

/**
 * BELL-T-11: `notification-item.component.ts::get isBilateralContributorRequest()` on a row: a W3/Bilaterals
 * result whose request is not primary (update-source exclusion comes from `isPrimaryRequestRow`).
 */
function isBilateralContributorRow(row: any): boolean {
  return row?.obj_result?.source_name === 'W3/Bilaterals' && !isPrimaryRequestRow(row);
}

/**
 * BELL-T-11: the ONE Accept label per row kind. The inbox row (`drawerAcceptLabel()`, which also feeds
 * its drawer and the inbox Accept button) and the bell card both read it, so they cannot drift.
 *   primary -> "Review result" (PRA-R-3) · bilateral contributor -> "Accept" · otherwise "Accept contribution".
 */
export function acceptLabelFor(row: any): string {
  const footer = CONTRIBUTION_REQUEST_DRAWER_COPY.footer;
  if (isPrimaryRequestRow(row)) return footer.reviewResult;
  if (isBilateralContributorRow(row)) return footer.accept;
  return footer.acceptContribution;
}

/**
 * `notifications/primary-review-not-accept` PRA-R-3 / design §8.1: where a primary row's "Review result"
 * leads once the accept PATCH settles. A result in Pending Review (`status_id` 5) opens the SP's review
 * drawer; anything else (Editing) has no drawer that can show it yet, so the SP is only told it will be notified.
 */
export function primaryReviewTarget(row: any): 'review-drawer' | 'notify-later' {
  return row?.obj_result?.status_id == 5 ? 'review-drawer' : 'notify-later';
}

/** Whether the row is a primary Science Program request (inbox row, drawer and bell share it). */
export function isPrimaryRequest(row: any): boolean {
  return isPrimaryRequestRow(row);
}

/** BELL-P-4: `notification-item.component.ts::get isP25Request()`, verbatim. */
export function isP25(row: any): boolean {
  return row?.obj_result?.obj_version?.obj_portfolio?.acronym === 'P25';
}

/**
 * BELL-DD-2: the non-busy part of `invalidateRequest()` — `requestingAccept`/`requestingReject`
 * stay component-local (they are in-flight UI state, not a row/context property). `ctx` carries the
 * two phase ids `invalidateRequest()` picks between via `isIpsrNotification`, plus the role/platform
 * flags.
 *
 * Returns `true` when the row CAN be decided — the inverse of the blocking predicate
 * `invalidateRequest()` used to return directly, so callers read `isDecidable(...)` the way the
 * name reads, instead of double-negating `!invalidateRequest()`.
 */
export function isDecidable(
  row: any,
  ctx: { isAdmin: boolean; platformIsClosed: boolean; currentPhaseId: unknown; ipsrCurrentPhaseId: unknown }
): boolean {
  const currentPhaseId = isIpsrNotification(row) ? ctx.ipsrCurrentPhaseId : ctx.currentPhaseId;

  const blocked =
    ctx.platformIsClosed ||
    isQAedRow(row) ||
    (!ctx.isAdmin && row?.obj_result?.obj_version?.id != currentPhaseId && row?.obj_result?.status_id != 3);

  return !blocked;
}

/**
 * BELL-R-5/R-6, design.md §6.2 "Branch routing (popover)": which path a row's Accept takes.
 *   - ToC-carried (`is_map_to_toc`) or a primary request → `'one-click'` (inert payload, one PATCH).
 *   - Everything else (bilateral contributor without carried mapping, or legacy) → `'step'` — the
 *     popover hands off instead of deciding inline (`BELL-DD-3`).
 */
export function classifyAccept(row: any): 'one-click' | 'step' {
  if (row?.is_map_to_toc) return 'one-click';
  if (isPrimaryRequestRow(row)) return 'one-click';
  return 'step';
}

/**
 * BELL-T-9 (BELL-DD-3, glossary "One-click request", amended 2026-10-06): the BELL's Accept path.
 * Only a primary request is decided in one click; a contribution (ToC-carried or not) always hands
 * off to the inbox, where the user reviews the ToC step and accepts. `classifyAccept` stays the
 * inbox / BELL-T-7 source and is deliberately unchanged.
 */
export function bellAcceptMode(row: any): 'one-click' | 'handoff' {
  return isPrimaryRequestRow(row) ? 'one-click' : 'handoff';
}

/**
 * BELL-R-7, design.md §6.2: a primary request's Decline always hands off to the justification
 * dialog (`'justify'`); every other row kind gets the popover's inline confirm/cancel (`'inline'`).
 */
export function declineMode(row: any): 'inline' | 'justify' {
  return isPrimaryRequestRow(row) ? 'justify' : 'inline';
}

export interface BuildDecisionBodyOpts {
  /** PDR-T-4: only read (and only put on the body) for a primary request's decline. */
  justification?: string;
}

/**
 * BELL-P-4, BELL-DD-2: the exact body `notification-item.component.ts::acceptOrReject()` builds
 * today — the inert `result_toc_result` (`{ planned_result: null, result_toc_results: [] }`) and
 * the primary-decline `justification`. The ToC-MAPPING payload (`withTocMapping`,
 * `buildTocMappingPayload()`) is intentionally NOT reproduced here: it reads the row's own
 * interactively-seeded `tocInitiative`, which is component state, not a pure function of `row` —
 * `notification-item` still overrides `result_toc_result` with that payload itself when the
 * contributor chose to map (see its own `acceptOrReject()`).
 */
export function buildDecisionBody(row: any, isAccept: boolean, opts: BuildDecisionBodyOpts = {}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    result_request: row,
    result_toc_result: { planned_result: null, result_toc_results: [] },
    request_status_id: isAccept ? 2 : 3
  };

  const isPrimaryDecline = !isAccept && isPrimaryRequestRow(row);
  if (isPrimaryDecline) {
    body['justification'] = opts.justification;
  }

  return body;
}

/**
 * BELL-T-5 (BELL-DD-4, design.md §6.1): the inbox URL the bell hands a rich step off to. The inbox
 * reads `request` + `action`, opens that row's own handler and clears both params.
 *
 * `phase` is the row's phase id so the row is inside the inbox's phase filter. The server's request
 * select carries it as `obj_result.obj_version.id` (BELL-P-10 Step 0: it has NO `obj_result.version_id`);
 * `version_id` is only a fallback. Tolerates the bell's extra `kind` tag (and any other field).
 */
export function bellHandoffUrl(row: any, action: 'accept' | 'decline'): string {
  const phase = row?.obj_result?.obj_version?.id ?? row?.obj_result?.version_id;
  const params = [
    ...(phase !== undefined && phase !== null && phase !== '' ? [`phase=${encodeURIComponent(String(phase))}`] : []),
    `request=${encodeURIComponent(String(row?.share_result_request_id))}`,
    `action=${action}`
  ];
  return `/result/results-outlet/results-notifications?${params.join('&')}`;
}
