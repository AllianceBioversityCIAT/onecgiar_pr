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
    /** NOTIF-T-4: `view` mode's metadata grid section (design.md §6.2 field-adapter table). */
    details: 'DETAILS',
    /** DSP-T-5 (design.md §6.2/§6.3 "APPROVAL CHAIN"): the chain section's own h3 heading. */
    approvalChain: 'APPROVAL CHAIN',
    /**
     * DSP-T-8 (design.md "Order in the body", mockup `docked-panel-detail.png`): the heading that
     * now wraps the existing `[crdAlign]` Align step — framing only, no new AOW checklist (DD-8).
     * Rework attempt 2: this heading REPLACES the slot's own inner heading (the former
     * `sections.align`/`align.hint` pair, deleted below) rather than stacking above it — see
     * `toc.helper`'s docstring for where that inner hint's wording went.
     */
    mapToToc: 'MAP TO YOUR THEORY OF CHANGE'
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
   * DSP-T-4 (design.md §6.2 "Field sources" / §6.3 "RESULT card"): the RESULT card's 6-field grid
   * labels, in fixed order (Reporting center → Result type → Primary Science Program →
   * Contributing programs → Submitted by → Phase). Replaces `viewFieldLabels` (DD-6 supersedes
   * NOTIF-R-5/NOTIF-AC-7 for THIS grid only — a missing value renders the label with `dashValue`
   * instead of being omitted; `status`/`requestKind` moved out to the chips row / `detailTitle()`).
   */
  resultGridLabels: {
    reportingCenter: 'Reporting center',
    resultType: 'Result type',
    primaryProgram: 'Primary Science Program',
    contributingPrograms: 'Contributing programs',
    submittedBy: 'Submitted by',
    phase: 'Phase'
  },
  dashValue: '–',
  showMore: 'Show more',
  showLess: 'Show less',
  /**
   * DSP-T-5 (design.md §6.2 "Program steps" / §6.3 "Chain step", DSP-R-8): the APPROVAL CHAIN
   * section's own strings — the fixed "Program submission" step name, its two pill texts
   * (`submitted`/`notSubmitted` reuses the result's own `result_status_name`, not a copy key),
   * the "Your program"/"Contributing program" pair (DSP-AC-6 "SP01 ... marked 'Your program',
   * subtitle 'Contributing program'"), the three program-step pills, and the loading/error state.
   */
  chain: {
    programSubmission: 'Program submission',
    submittedPill: 'Submitted',
    /** DSP-R-8 "Submitted by {actor} · {date}" — date already formatted `dd MMM yyyy` by the caller. */
    submittedBy: (actor: string, date: string): string => `Submitted by ${actor} · ${date}`,
    /** `{actor} · {date}` subtitle for an accepted/declined/pending program step (not the viewer's own). */
    actorAndDate: (actor: string, date: string): string => `${actor} · ${date}`,
    yourProgram: 'Your program',
    contributingProgram: 'Contributing program',
    acceptedPill: 'Accepted',
    awaitingDecisionPill: 'Awaiting decision',
    declinedPill: 'Declined',
    errorMessage: "Couldn't load the approval chain.",
    retry: 'Retry'
  },
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
    bilateralTail: 'for result',
    /**
     * PSR-T-9 (design.md §6.1 "Bilateral contributor request", PSR-R-10): the row/drawer sentence
     * — "**{owner sp}**, as primary Science Program, has tagged **{sp}** as a contributing Science
     * Program to result **{code}** - {title} on behalf of {center}". `verb`/`tail` slot into the
     * pre-existing `lead(+leadCode) … verb … responderCode … tail … resultCode – resultTitle` shape;
     * `onBehalfOf` composes the new `suffix` field (`notification-item`, wired by `PSR-T-8`, builds
     * `suffix: \`${onBehalfOf} ${center}\``).
     */
    bilateralContributorVerb: ', as primary Science Program, has tagged',
    bilateralContributorTail: 'as a contributing Science Program to result',
    onBehalfOf: 'on behalf of',
    /**
     * PSR-T-8 (design.md §6.1 "Primary request" row/drawer sentence, PSR-R-9): "{center} has
     * tagged **{sp}** as the primary Science Program of result **{code}** - {title}". Slots into
     * the same `lead … verb … responderCode … tail … resultCode – resultTitle` shape as the
     * pre-existing branches — `notification-item`'s `drawerHeader()` sets `lead` to the Creating
     * Center label and `responderCode` to the requested SP, leaving `requesterCode` empty (no
     * "from X" clause) exactly like the bilateral-contributor branch.
     */
    primaryVerb: 'has tagged',
    primaryTail: 'as the primary Science Program of result'
  },
  align: {
    clearMapping: 'Clear mapping'
  },
  /**
   * DSP-T-8 (design.md "Order in the body", DSP-R-10/DD-8): the single helper line under the
   * "MAP TO YOUR THEORY OF CHANGE" heading in `notification-detail-content`. Rework attempt 2
   * (Reviewer FAIL — requirements.md:34/L202, design.md DD-8: there is no AOW checklist, the real
   * control is the indicator picker): replaces the former `align.hint` string that used to render
   * BY `notification-item`, inside the projected `[crdAlign]` block's own now-deleted inner
   * heading — that inner `h3`/`p` is gone (no spec/CT reference to `sections.align`/`align.hint`
   * existed outside it), so this is now the ONLY guidance line in the ToC area.
   *
   * DSP-T-9 Q-4 (user-approved 2026-10-05): reverted to the mockup's literal wording — a user
   * decision, overriding the T-8 "accurate indicator wording" choice recorded above. The T-8
   * rationale (no AOW checklist exists) still stands as background; the user chose the mockup copy
   * anyway.
   */
  toc: {
    helper: 'Choose the area of work this result contributes to. You can do this later.'
  },
  footer: {
    acceptContribution: 'Accept contribution',
    /**
     * PSR-T-9 (design.md §6.1/§6.2): the `decide`-footer Accept label for a pending PRIMARY
     * program request. `notification-item` (wired by `PSR-T-8`) passes this through the drawer's
     * `acceptLabel` input — the drawer itself never decides which label a given row gets, it only
     * falls back to `acceptContribution` above when the caller passes none (CRD zero-touch: every
     * pre-existing caller that never sets `acceptLabel` keeps seeing `acceptContribution`).
     */
    acceptAsPrimary: 'Accept as primary',
    /**
     * PSR-T-9 (design.md §6.1 "Bilateral contributor request"): the plain "Accept" label for a
     * bilateral contributor request row — distinct from `acceptContribution`'s "Accept contribution"
     * (existing/W1-W2 rows) and `acceptAsPrimary`'s "Accept as primary" (primary requests). `PSR-T-8`
     * passes this through the drawer's `acceptLabel` input for that row kind.
     */
    accept: 'Accept',
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
   * `rowStatusLabel` getter still resolves one of these two same strings; `DSP-T-4` now feeds it into
   * the detail panel's `chips()` (first chip, status) instead of the retired `view`-mode metadata
   * grid — same strings, new destination.
   */
  notificationItem: {
    /** `NOTIF-DD-3`: single chip for every `source:'request'` row — no sub-typing. */
    contributionRequestChip: 'Contribution request',
    /**
     * PSR-T-8 (design.md §6.1 "Primary request" row, PSR-R-9): chip text for a `request_type:
     * 'primary'` row — single source for the row's own chip AND the drawer's `view`-mode
     * `requestKind` metadata field (`requestKindLabel` getter reads this same string for both), so
     * the row and the drawer can never say something different about the same request (PSR-T-8
     * task brief).
     */
    primaryRequestChip: 'Primary program request',
    /**
     * PSR-T-8 (design.md §6.1 "Bilateral contributor request" row, PSR-R-10): chip text for a
     * bilateral (`source_name: 'W3/Bilaterals'`) contribution request — distinct from the plain
     * `contributionRequestChip` above, which stays the W1/W2 / non-bilateral wording (`PSR-DD-10`).
     */
    contributorRequestChip: 'Contributor request',
    /**
     * PSR-T-8 (PSR-R-9 "missing-acronym clause"): fallback when a request's `creating_center` has
     * neither `acronym` nor `name` — never renders an empty name or "()". Chosen over a blank
     * string so the sentence still reads as a complete clause ("the Center has tagged SP09 …").
     */
    unknownCenterFallback: 'the Center',
    /**
     * PSR-T-8 rework attempt 2 (Reviewer finding, advisory): fallback when a bilateral contributor
     * row's `owner_program_code` is missing — avoids both an empty bold span and a sentence that
     * starts with the verb's leading comma (", as primary Science Program, has tagged …").
     * `drawerHeader()` uses this as `lead` (plain text) whenever `ownerProgramCode` is falsy, which
     * also routes the CRD template to its `@else` branch instead of the `leadCode` one.
     */
    unknownProgramFallback: 'The primary Science Program',
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
    fundingWindowBilateral: 'W3/Bilateral',
    /**
     * PSR-T-9 (PSR-R-2 "no longer actionable" / PSR-R-4 stale-tab idempotency, PSR-R-8): the exact
     * server-contract text for a 409 on accept/decline (already decided or cancelled — a stale tab,
     * a second click from another member, or a Center re-pick that cancelled this request's round).
     * `acceptOrReject()`'s error branch shows this instead of the generic error toast; the
     * surrounding `finalize()` still runs unconditionally, so the row's list refetches either way
     * and the request stops being actionable.
     */
    staleRequestMessage: 'This request was already answered'
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
  },
  /**
   * @akili-spec notifications/inbox-paginated-load (PAGE-T-6, design.md §6.2/§6.3, PAGE-R-4/R-10).
   * Copy for the paginated-history footer: the "Load more" button, the trailing skeleton row's
   * caption while a source's first history page is still outstanding, and the filtered-scope hint
   * shown next to "Load more" while a toolbar filter/search is active (PAGE-R-10) — exact wording
   * from `design.md` §6.2, not paraphrased.
   */
  inbox: {
    loadMore: 'Load more',
    loadingHistory: 'Loading history…',
    filteredHint: 'Filters apply to loaded notifications. Load more to include older ones.'
  }
} as const;
