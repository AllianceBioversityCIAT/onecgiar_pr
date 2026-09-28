// @akili-spec contribution-request-drawer (CRD-T-1)
/**
 * Contribution request drawer — centralized user-facing copy (NFR i18n, design.md §6.3).
 * Every string the drawer and its Align/footer states render lives here so a spec test can
 * import the same constant instead of asserting a literal.
 */

export const CONTRIBUTION_REQUEST_DRAWER_COPY = {
  title: 'Contribution request',
  closeAriaLabel: 'Close',
  /** CRD-R-1 "AND IT MUST expose the row as an interactive control" — row accessible name. */
  rowAriaLabel: (resultCode: string): string => `Open contribution request for result ${resultCode}`,
  sections: {
    result: 'RESULT',
    whereItContributes: 'WHERE IT CONTRIBUTES',
    align: 'ALIGN TO YOUR THEORY OF CHANGE'
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
  }
} as const;
