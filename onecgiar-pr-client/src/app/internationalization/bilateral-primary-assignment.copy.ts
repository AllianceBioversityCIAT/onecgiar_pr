/**
 * `notifications/bilateral-primary-sp-request` (PSR-T-10) — Center-side copy for the primary
 * Science Program request lifecycle: `section-zero-dashboard`'s on-hold / sent-back banner and
 * the ToC section's "no owner yet" notice. Exact wording per `requirements.md` `PSR-R-15`.
 */
export const BILATERAL_PRIMARY_ASSIGNMENT_COPY = {
  banner: {
    /** PSR-R-15: "Awaiting {SP code} acceptance as primary Science Program". */
    pending: (programCode: string): string =>
      `${programCode} will review this result when you submit it for review`,
    /** PSR-R-15: "Declined by {SP code}. Pick another primary Science Program". */
    sentBack: (programCode: string): string =>
      `Declined by ${programCode}. Pick another primary Science Program`,
    /**
     * `state === 'none'` with no owner (T-2 forward pointer → T-10, execution.md L132): never
     * requested, or the auto-request failed (PSR-R-1 failure scenario) — nothing was declined, so
     * "Pick another" is wrong; there is nothing to return to (Leader decision, PSR-T-10 attempt 2).
     */
    noneUnpicked: 'Pick a primary Science Program',
    /**
     * `notifications/primary-decline-rejects-result` PDR-R-9 / PDR-DD-8: `state === 'sent_back'`
     * AND `readOnly()` — the result is Rejected (final for the Center), not merely awaiting a
     * re-pick. No "Pick another primary Science Program" text here; the picker is gone too
     * (`canEditAssignment()` already gates on `readOnly()`).
     */
    rejected: (programCodes: string): string =>
      `Declined by ${programCodes} as primary Science Program. The result was rejected.`,
    /**
     * `notifications/primary-notify-on-submit` PNS-R-5: `state === 'draft'` — the choice is saved
     * but not yet sent (create / Project Information save). Submit is what sends it.
     */
    draft: (programCode: string): string =>
      `${programCode} will review this result when you submit it for review`,
  },
  /** design.md §6.3 — shown next to the banner while the result has no owner. */
  submitBlockedReason:
    'Submit for review is unavailable until a primary Science Program accepts.',
  /**
   * `bilateral/rejected-result-correction` RRC-R-11 (AC21): a Rejected result whose lead project is
   * allocated to a single SP has no alternative to pick — say so instead of an empty selector.
   */
  singleAllocationNote:
    'This project is allocated to a single Science Program, so there is no alternative to choose.',
  /** Marks a declined SP in the picker; it stays selectable (DD-8 — re-picking starts a new round). */
  declinedOptionSuffix: '(declined)',
  /** design.md §6.3 — the ToC section's notice while the result has no owner. */
  tocNotice: 'Available once the primary Science Program accepts.',
} as const;
