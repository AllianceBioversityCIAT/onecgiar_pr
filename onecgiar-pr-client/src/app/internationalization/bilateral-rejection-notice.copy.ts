/**
 * `bilateral/rejected-result-correction` RRC-R-14 / RRC-R-15 — copy for the rejection notice on a
 * Rejected result and for the full rejection history in the results-list modal.
 */
export const BILATERAL_REJECTION_NOTICE_COPY = {
  title: 'Rejected by the Science Program',
  /** RRC-R-14: a rejection recorded without a justification. */
  noJustification: 'No justification was recorded.',
  /** RRC-T-9: label of the reason line in the rejection notification. */
  notificationReasonLabel: 'Reason:',
  loadError: "Couldn't load the rejection reason",
  loading: 'Loading the rejection reason…',
  showMore: 'Show more',
  showLess: 'Show less',
  history: {
    title: 'Rejection history',
    actionReject: 'Rejected',
    actionResubmit: 'Resubmitted',
    empty: 'No rejections have been recorded for this result.',
  },
  trigger: {
    rejected: 'View rejection justification',
    history: 'Review history',
  },
} as const;
