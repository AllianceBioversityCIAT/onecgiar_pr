/**
 * SACN-T-3 (`notifications/sp-approval-center-notice`, design §8.1/§8.2, SACN-R-3/R-4/R-5/R-7):
 * centralized copy for the new-shape bilateral-approval sentence a center recipient sees, e.g.
 * "**SP06**, as primary Science Program, has approved your center's result **9330** - <title>".
 *
 * The server (`onecgiar-pr-server/src/api/notification/notification.service.ts` /
 * `results.service.ts`) stores one of two exact strings on `notification.text` for a center
 * recipient of an Approve decision:
 *  - `"<SPXX>${verb}"` when the owner Science Program code is known;
 *  - `fallbackLead` verbatim when it is not.
 * `notification-type.constants.ts`'s `buildApprovedCenterNoticeParts()` detects either shape by
 * its fixed `tail` and splits it into `segments` (bold SP code + plain verb, or the whole
 * fallback lead, unbolded). Keep these three strings byte-identical to the server's copies — each
 * side's spec pins the exact string, so drift fails a test rather than silently diverging
 * (design §7.4).
 */
export const BILATERAL_DECISION_NOTICE_COPY = {
  /** Appended directly after the bolded SP code — no leading space (the comma is attached). */
  verb: ", as primary Science Program, has approved your center's result",
  /** Whole-sentence fallback when the owner Science Program cannot be resolved. */
  fallbackLead: "The primary Science Program has approved your center's result",
  /** Fixed tail both shapes share — used to detect the new shape before parsing it further. */
  tail: "has approved your center's result",
  /** Updates-row chip for Approved AND Rejected bilateral review decisions (design §8.3/DD-4). */
  chipLabel: 'Decision update'
} as const;
