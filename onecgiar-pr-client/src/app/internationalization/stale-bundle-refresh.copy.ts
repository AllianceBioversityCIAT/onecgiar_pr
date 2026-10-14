/**
 * `bugfix/stale-bundle-refresh-prompt` (design §6.3, requirements §6 `SBR-R-2`/`SBR-R-3`):
 * copy for the sticky toast shown when a browser tab still running a previous deploy's bundle
 * fails to lazy-load a route chunk (the chunk's content-hashed filename no longer exists on the
 * server). Not a `TermKey` — the text doesn't vary between P22/P25 portfolios, it's a
 * client-infra message, not product copy.
 */
export const STALE_BUNDLE_REFRESH_COPY = {
  /** Exact string required by `SBR-R-2`. */
  message: 'A new version of PRMS is available — refresh to continue',
  /** Label for the toast's one-click action (`SBR-R-3`): runs `window.location.reload()`. */
  actionLabel: 'Refresh now'
} as const;
