/**
 * SACN-T-2 (`notifications/sp-approval-center-notice`, design §7.2-7.4, SACN-R-3/R-4/R-5/R-8):
 * server-side lead-sentence pieces for the new-shape bilateral-approval notice a center recipient
 * sees when a Science Program approves a W3/Bilateral result, e.g. "SP06, as primary Science
 * Program, has approved your center's result 9330 - <title>".
 *
 * Used by:
 *  - `results.service.ts` (`emitBilateralReviewNotification`) — composes and stores one of the two
 *    exact strings below on `notification.text` for a center recipient of an Approve decision.
 *  - `notification.service.ts` (`buildBilateralReviewDescription`) — detects the stored shape by
 *    its fixed `tail` and appends the result identity for both the toast and the inbox row.
 *
 * Keep these three strings byte-identical to the client's twin —
 * `onecgiar-pr-client/src/app/internationalization/bilateral-decision-notice.copy.ts` — there is no
 * shared package between server and client, so each side's spec pins the exact string and drift
 * fails a test rather than silently diverging (design §7.4).
 */
export const BILATERAL_DECISION_NOTICE_COPY = {
  /** Appended directly after the SP code — no leading space (the comma is attached). */
  verb: ", as primary Science Program, has approved your center's result",
  /** Whole-sentence fallback when the owner Science Program cannot be resolved. */
  fallbackLead: "The primary Science Program has approved your center's result",
  /** Fixed tail both shapes share — used to detect the new shape before parsing it further. */
  tail: "has approved your center's result",
} as const;
