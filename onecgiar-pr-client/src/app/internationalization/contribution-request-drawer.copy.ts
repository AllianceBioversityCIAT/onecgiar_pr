// @akili-spec contribution-request-drawer (CRD-T-1)
/**
 * Contribution request drawer — centralized user-facing copy (NFR i18n, design.md §6.3).
 * Every string the drawer and its Align/footer states render lives here so a spec test can
 * import the same constant instead of asserting a literal.
 */

// NOTIF-T-6: single source for the two shared decision/info labels — `notificationItem.status*`
// (rendered inside a row) and `tabs.*` (the three-tab row above the unified list) must say exactly
// the same thing, per the note already on `notificationItem` below ("Wording matches NOTIF-T-6's
// planned tab labels").
const NEEDS_DECISION_LABEL = 'Needs your decision';
const FOR_YOUR_INFORMATION_LABEL = 'For your information';

export const CONTRIBUTION_REQUEST_DRAWER_COPY = {
  title: 'Contribution request',
  closeAriaLabel: 'Close',
  /** CRD-R-1 "AND IT MUST expose the row as an interactive control" — row accessible name. */
  rowAriaLabel: (resultCode: string): string => `Open contribution request for result ${resultCode}`,
  sections: {
    result: 'RESULT',
    whereItContributes: 'WHERE IT CONTRIBUTES',
    align: 'ALIGN TO YOUR THEORY OF CHANGE',
    /** NOTIF-T-4: `view` mode's metadata grid section (design.md §6.2 field-adapter table). */
    details: 'DETAILS'
  },
  /** CRD-R-4: the 7 field labels, in order. */
  fieldLabels: {
    level: 'Level',
    highLevelOutputOutcome: 'High level output / outcome',
    outcomeStatement: 'Outcome statement',
    indicatorTypology: 'Indicator typology',
    unitOfMeasurement: 'Unit of measurement',
    target: 'Target',
    contributionTarget: 'Contribution target'
  },
  /**
   * NOTIF-T-4: `view` mode's per-source metadata grid labels (design.md §6.2). A field with no
   * source on a given row is omitted entirely by the component — never rendered with this label
   * next to a blank/dash value (NOTIF-R-5, NOTIF-AC-7).
   */
  viewFieldLabels: {
    /** NOTIF-T-14 (NOTIF-R-5): rendered first — the row's decision/info status. */
    status: 'Status',
    resultType: 'Result type',
    phase: 'Phase',
    primaryProgram: 'Primary program',
    reportingCenter: 'Reporting center',
    submittedBy: 'Submitted by'
  },
  dashValue: '–',
  showMore: 'Show more',
  showLess: 'Show less',
  /**
   * CRD-R-2: header sentence words. `notification-item`'s `drawerHeader()` (CRD-T-4) reads these
   * directly — there is no longer a separate local copy of them.
   *
   * CRD-T-4 / requirements CRD-R-2 "Bilateral sentence": the bilateral verb/tail carry their own
   * "to"/"for" so the sentence reads naturally once `drawerHeader()` leaves `requesterCode` empty
   * for bilateral requests (no invented requester name, no "from" clause at all — see the CRD
   * template's `@if (h.requesterCode)` guard).
   */
  header: {
    from: 'from',
    verb: 'has asked',
    tail: 'to contribute to result',
    bilateralLeadPrefix: 'Center',
    bilateralVerb: 'has reported a contribution to',
    bilateralTail: 'for result'
  },
  align: {
    hint: 'Pick the indicator this result contributes to in your own theory of change. You can do this later.',
    clearMapping: 'Clear mapping'
  },
  footer: {
    acceptContribution: 'Accept contribution',
    decline: 'Decline',
    declineConfirmTitle: 'Decline this contribution?',
    cancel: 'Cancel',
    confirmDecline: 'Confirm decline',
    acceptHelperIncompleteMapping: 'Complete the mapping or clear it to accept without it.',
    /** Moved verbatim from notification-item (P2-3187); notification-item is not edited by this task. */
    blockedQAedReason: 'This result has been Quality Assessed and no additional contributors can be added.',
    blockedGenericReason: "This request can't be decided right now."
  },
  /**
   * NOTIF-T-5: `notification-item` row copy — the request/update type chip (`NOTIF-R-3`/`NOTIF-DD-3`)
   * and the decision/info status labels (`NOTIF-R-5`'s gap between `requirements.md` and
   * `design.md`, closed by explicit user decision 2026-09-29, recorded in `execution.md`).
   * **No longer rendered in the row** — `NOTIF-T-12` (rework attempt 1) removed the row-level status
   * chip that used to render `statusNeedsDecision`/`statusInfo` directly. `notification-item`'s
   * `rowStatusLabel` getter still resolves one of these two same strings, but only to feed
   * `drawerViewFields().status`, which `NOTIF-T-14` (a parallel task this same rework round) renders
   * inside the drawer's `view`-mode metadata grid instead (under the `viewFieldLabels.status` label
   * above) — the gap this removal reopened.
   */
  notificationItem: {
    /** `NOTIF-DD-3`: single chip for every `source:'request'` row — no sub-typing. */
    contributionRequestChip: 'Contribution request',
    /** Wording matches `NOTIF-T-6`'s planned tab labels, per the user's 2026-09-29 decision. */
    statusNeedsDecision: NEEDS_DECISION_LABEL,
    statusInfo: FOR_YOUR_INFORMATION_LABEL,
    /** `NOTIF-R-4`/`NOTIF-AC-2`: row accessible name, split by the drawer mode the click opens. */
    rowAriaLabelView: (resultCode: string): string => `Open notification details for result ${resultCode}`,
    /**
     * NOTIF-T-9 (`NOTIF-R-12`): funding-window tag badge labels — derived only from
     * `obj_result.source_name` (`'W1/W2'` | `'W3/Bilaterals'`), never fabricated for any other value.
     */
    fundingWindowW1W2: 'W1/W2',
    fundingWindowBilateral: 'W3/Bilateral'
  },
  /**
   * NOTIF-T-6: the three decision-state tab labels (`NOTIF-R-1`/`NOTIF-US-1`), rendered in
   * `results-notifications.component.html`'s new tab row. `needsDecision`/`forYourInformation` are
   * the exact same copy as `notificationItem.statusNeedsDecision`/`.statusInfo` above — single
   * source, so the row's own status text and its tab never drift apart.
   */
  tabs: {
    all: 'All',
    needsDecision: NEEDS_DECISION_LABEL,
    forYourInformation: FOR_YOUR_INFORMATION_LABEL
  },
  /**
   * NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`): the Received/Sent in-list toggle that replaces the
   * retired routed `requests/received`|`requests/sent` split — mirrors the mockup's `ntSegR`/`ntSegS`
   * segmented pills.
   */
  sourceToggle: {
    received: 'Received',
    sent: 'Sent'
  },
  /** NOTIF-T-6: the migrated filter toolbar (moved here from the retired `requests.component.*`). */
  filterToolbar: {
    filterButton: 'Filter',
    searchPlaceholder: 'Search notifications…',
    phasesLabel: 'Phases',
    phasesPlaceholder: 'Select phase',
    centerLabel: 'Center',
    centerSearchPlaceholder: 'Search centers',
    bilateralProjectLabel: 'Bilateral project',
    bilateralProjectSearchPlaceholder: 'Search projects',
    noCentersYet: 'No centers available yet.',
    noBilateralProjectsYet: 'No bilateral projects available yet.',
    // NOTIF-T-11 (`NOTIF-R-16`): Type / Funding / Result-type filter labels, following the same
    // naming pattern as centerLabel/bilateralProjectLabel above.
    typeLabel: 'Type',
    fundingLabel: 'Funding',
    resultTypeLabel: 'Result type',
    resultTypeSearchPlaceholder: 'Search result types',
    noTypesYet: 'No types available yet.',
    noFundingOptionsYet: 'No funding options available yet.',
    noResultTypesYet: 'No result types available yet.',
    nothingMatchesSearch: 'Nothing matches that search.',
    clearAll: 'Clear all',
    notificationSettings: 'Notification settings',
    markAllAsRead: 'Mark all as read',
    announcements: 'Announcements'
  }
} as const;
