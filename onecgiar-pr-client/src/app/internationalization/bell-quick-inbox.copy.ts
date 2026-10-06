import { CONTRIBUTION_REQUEST_DRAWER_COPY } from './contribution-request-drawer.copy';
// @akili-spec notifications/bell-quick-inbox (BELL-T-3)
/**
 * Bell quick inbox — centralized user-facing copy (NFR i18n). Every string the popover rows render
 * for their inline Accept / Decline actions lives here so the spec imports the same constant
 * instead of asserting a literal.
 *
 * Lives in its own file (not in `contribution-request-drawer.copy.ts`) so the bell never edits a
 * copy file another feature owns; wording that already exists there is reused by import elsewhere.
 */
export const BELL_QUICK_INBOX_COPY = {
  /** BELL-T-4: the topbar bell button + popover shell (shell-topbar). */
  popover: {
    title: 'Notifications',
    /** BELL-R-1: the button label carries the count so assistive tech announces it. */
    buttonLabel: (count: number) => (count > 0 ? `Notifications, ${count} waiting` : 'Notifications'),
    /** BELL-R-10: shown only when the attention count is 0. */
    empty: 'You have not received any new notifications. Go to the notifications section to see all of your latest notifications.',
    /** BELL-R-13: first load in flight, nothing cached yet. */
    loading: 'Loading your notifications...',
    /** BELL-R-14: the bell data failed to load. */
    error: 'We could not load your notifications.',
    errorLink: 'Open the notifications page',
    /** BELL-R-3: how many waiting items the capped list does not show. */
    more: (count: number) => `+${count} more`,
    seeAll: 'See all the notifications',
    /** BELL-T-10: header chip ("3 new") = unread updates; hidden at 0. */
    newChip: (count: number) => `${count} new`,
    /** BELL-T-10: marks every unread update read (decisions untouched). */
    markAsRead: 'Mark as read',
    tabsAriaLabel: 'Filter notifications',
    tabs: { all: 'All', decide: 'To decide', updates: 'Updates' },
    /** BELL-T-10: per-tab empty states (the bell has rows, but none for this tab). */
    tabEmpty: { decide: 'Nothing to decide', updates: 'No new updates' }
  },
  /** BELL-T-10: card chips. */
  card: {
    requiresDecision: 'Requires decision',
    approved: 'Approved',
    declined: 'Declined',
    updateFallback: 'Update',
    /** Neutral update chip, keyed by the notification type name (`NotificationType` values). */
    updateLabels: {
      'Result Created': 'Created',
      'Result Submitted': 'Submitted',
      'Result Unsubmitted': 'Unsubmitted',
      'Result QAed': 'Quality assessed',
      Announcement: 'Announcement',
      'Result Center Tagged': 'Tagged',
      'Result Bilateral Project Tagged': 'Tagged',
      'Bilateral Result Submitted': 'Pending review',
      'Bilateral AI Job Finished': 'AI review',
      'Primary Program Request Moved': 'Moved'
    } as Record<string, string>
  },
  actions: {
    groupAriaLabel: 'Decision actions',
    accept: 'Accept',
    decline: 'Decline',
    /** BELL-T-12: the armed contribution Decline reuses the inbox wording. */
    confirmDecline: CONTRIBUTION_REQUEST_DRAWER_COPY.footer.confirmDecline,
    /** BELL-T-11: first click of a direct Accept turns its label into "Confirm " + the lowercased action. */
    confirmAction: (label: string) => `Confirm ${label.toLowerCase()}`,
    /** BELL-T-11: aria-live hint shown while a direct Accept waits for its second click. */
    confirmHint: 'Click again to confirm, or press Esc to cancel.'
  },
  /** BELL-R-8: row-level error line; the row stays and its buttons are re-enabled. */
  decisionError: 'We could not record your decision. Please try again.',
  /**
   * Parity with the inbox row's Accept tooltip (`notification-item.component.html`): the only
   * reason the inbox explains is a Quality Assessed result.
   */
  qaedTooltip: 'This result has been Quality Assessed and no additional contributors can be added.'
} as const;
