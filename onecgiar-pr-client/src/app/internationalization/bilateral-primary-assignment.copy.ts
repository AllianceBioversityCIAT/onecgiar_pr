/**
 * `notifications/bilateral-primary-sp-request` (PSR-T-10) — Center-side copy for the primary
 * Science Program request lifecycle: `section-zero-dashboard`'s on-hold / sent-back banner and
 * the ToC section's "no owner yet" notice. Exact wording per `requirements.md` `PSR-R-15`.
 */
export const BILATERAL_PRIMARY_ASSIGNMENT_COPY = {
  banner: {
    /** PSR-R-15: "Awaiting {SP code} acceptance as primary Science Program". */
    pending: (programCode: string): string =>
      `Awaiting ${programCode} acceptance as primary Science Program`,
    /** PSR-R-15: "Declined by {SP code}. Pick another primary Science Program". */
    sentBack: (programCode: string): string =>
      `Declined by ${programCode}. Pick another primary Science Program`,
    /**
     * `state === 'none'` with no owner (T-2 forward pointer → T-10, execution.md L132): never
     * requested, or the auto-request failed (PSR-R-1 failure scenario) — nothing was declined, so
     * "Pick another" is wrong; there is nothing to return to (Leader decision, PSR-T-10 attempt 2).
     */
    noneUnpicked: 'Pick a primary Science Program',
  },
  /** design.md §6.3 — shown next to the banner while the result has no owner. */
  submitBlockedReason:
    'Submit for review is unavailable until a primary Science Program accepts.',
  /** Marks a declined SP in the picker; it stays selectable (DD-8 — re-picking starts a new round). */
  declinedOptionSuffix: '(declined)',
  /** design.md §6.3 — the ToC section's notice while the result has no owner. */
  tocNotice: 'Available once the primary Science Program accepts.',
} as const;
