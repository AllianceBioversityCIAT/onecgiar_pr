/**
 * Fixed fg/bg pairs for `result_status.result_status_id` (server enum 1–8).
 * UI-RULES rule 9: never recombine a foreground with another background.
 *
 * Visual source of truth: Results Center / Bilateral / SP programme-results tables —
 * Editing (amber), Quality assessed (cyan), Submitted (blue), Pending review (grey),
 * Approved (green), Rejected (red).
 */
export interface ResultStatusTokenPair {
  fg: string;
  bg: string;
}

export const RESULT_STATUS_TOKENS: Readonly<Record<number, ResultStatusTokenPair>> = {
  1: { fg: 'var(--pr-status-in-progress-fg)', bg: 'var(--pr-status-in-progress-bg)' }, // Editing
  2: { fg: 'var(--pr-status-in-qa-fg)', bg: 'var(--pr-status-in-qa-bg)' }, // Quality Assessed
  3: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }, // Submitted
  4: { fg: 'var(--pr-status-not-started-fg)', bg: 'var(--pr-status-not-started-bg)' }, // Discontinued
  5: { fg: 'var(--pr-status-not-started-fg)', bg: 'var(--pr-status-not-started-bg)' }, // Pending review
  6: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' }, // Approved
  7: { fg: 'var(--pr-status-rejected-fg)', bg: 'var(--pr-status-rejected-bg)' }, // Rejected
  8: { fg: 'var(--pr-status-not-started-fg)', bg: 'var(--pr-status-not-started-bg)' } // Draft
};

const FALLBACK: ResultStatusTokenPair = {
  fg: 'var(--pr-status-not-started-fg)',
  bg: 'var(--pr-status-not-started-bg)'
};

export function resultStatusToken(statusId: number | null | undefined): ResultStatusTokenPair {
  if (statusId == null) {
    return FALLBACK;
  }
  return RESULT_STATUS_TOKENS[Number(statusId)] ?? FALLBACK;
}

export function resultStatusFg(statusId: number | null | undefined): string {
  return resultStatusToken(statusId).fg;
}

export function resultStatusBg(statusId: number | null | undefined): string {
  return resultStatusToken(statusId).bg;
}
