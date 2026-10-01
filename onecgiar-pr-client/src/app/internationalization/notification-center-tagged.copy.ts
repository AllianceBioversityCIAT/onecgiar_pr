/**
 * W1/W2 "CG Center tagged" notification — centralized user-facing copy (WCT-NFR-3).
 *
 * `RESULT_CENTER_TAGGED`'s direct-tag rendering (bare `notification.text`, no `leadIn`) is built
 * client-side from this sentence plus the emphasized `lead` part (the owner Science Program code)
 * that `notification-type.constants.ts` supplies — see its `NotificationTextParts.lead`. Legacy and
 * BCT rows (a composed sentence or empty text) are untouched by this file.
 */
export const NOTIFICATION_CENTER_TAGGED_COPY = {
  /**
   * The row sentence, rendered after the emphasized `lead` (owner SP code) and before the
   * `{code} - {title}` result link: `<lead> has tagged your CG Center as a contributor (<label>) to
   * result <code> - <title>`. `label` is the tagged Center's acronym, or its `code` when the
   * acronym is empty (server-side fallback, WCT-R-8).
   */
  sentence: (label: string): string => `has tagged your CG Center as a contributor (${label}) to result`,
  /** Inbox / Updates / bell chip label for a `RESULT_CENTER_TAGGED` row (WCT-R-6). */
  chipLabel: 'CG Center tagged'
} as const;
