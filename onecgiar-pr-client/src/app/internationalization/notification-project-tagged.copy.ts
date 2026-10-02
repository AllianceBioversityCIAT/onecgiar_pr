/**
 * W1/W2 "Bilateral project tagged" notification — centralized user-facing copy (WPT-NFR-3).
 *
 * `RESULT_BILATERAL_PROJECT_TAGGED`'s direct-tag rendering (an enriched or legacy bare
 * `notification.text`, no `leadIn`) is built client-side from these sentence pieces, assembled into
 * the `segments` part that `notification-type.constants.ts` supplies — see its
 * `NotificationTextParts.segments` and `parseTaggedProjectLabel`. Composed rows (a whole
 * server-composed sentence, BCT or pre-fix legacy) and empty text are untouched by this file — see
 * `isComposedTaggedText`.
 */
export const NOTIFICATION_PROJECT_TAGGED_COPY = {
  /** The non-emphasized verb clause between the SP code and the project code. */
  verb: 'has tagged the bilateral project',
  /**
   * The non-emphasized text surrounding the emphasized Center label, used when one is parsed off
   * the stored text (an enriched bare row, WPT-R-1/WPT-R-2). Rendered as
   * `before + {label} + after`.
   */
  centerClauseWithLabel: { before: 'from your center (', after: ') to result' } as const,
  /**
   * The plain, non-emphasized clause used when there is no Center label (a legacy bare row,
   * WPT-R-3).
   */
  centerClauseNoLabel: 'from your center to result',
  /** Inbox / Updates / bell chip label for a `RESULT_BILATERAL_PROJECT_TAGGED` row (WPT-R-6). */
  chipLabel: 'Bilateral project tagged'
} as const;
