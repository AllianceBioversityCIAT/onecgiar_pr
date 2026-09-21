/**
 * Fixed fg/bg pairs for `result_status.result_status_id` (server enum 1–8).
 * UI-RULES rule 9: never recombine a foreground with another background.
 *
 * 🥇 THE ONE PLACE. Every surface that paints a result status — the Results Center table, the
 * result-detail rail, the bilateral page header, the review drawer, the draft lists — resolves its
 * colour HERE. Before 2026-09-21 each of them carried its own private map, and they disagreed in
 * ways only a user could catch: the detail rail painted `Quality Assessed` with the APPROVED green
 * and dropped `Approved` to the grey fallback, while the table next door had both right. If you are
 * about to write a status colour in a component, you are about to recreate that bug.
 *
 * Visual source of truth: the Results Center table (P2-3553, Cami 21-Sep) —
 * Editing (amber), Quality assessed (cyan), Submitted (blue), Pending review (blue),
 * Approved (green), Rejected (red), Discontinued / Draft (grey).
 *
 * Why `Pending review` is blue and no longer grey (Yeck, 21-Sep-2026): grey reads as
 * "inactive / disabled", and a bilateral result awaiting its Science Program is the opposite — it is
 * mid-flight. It sits on the SAME rung of the flow as `Submitted` does for W1/W2 (sent, waiting for
 * someone else to act), so it shares that pair instead of inventing a seventh colour, which rule 9
 * forbids. The label is what separates the two words; the colour is what separates the two MOMENTS.
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
  5: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }, // Pending review — see header
  6: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' }, // Approved
  7: { fg: 'var(--pr-status-rejected-fg)', bg: 'var(--pr-status-rejected-bg)' }, // Rejected
  8: { fg: 'var(--pr-status-not-started-fg)', bg: 'var(--pr-status-not-started-bg)' } // Draft
};

const FALLBACK: ResultStatusTokenPair = {
  fg: 'var(--pr-status-not-started-fg)',
  bg: 'var(--pr-status-not-started-bg)'
};

/**
 * `statusId` is typed loosely on purpose: the detail endpoint answers `status_id` as `string | number`
 * depending on the surface, and every caller coercing it by hand is how a private map ends up being
 * written "just for this screen". The coercion lives here, once.
 */
export function resultStatusToken(statusId: number | string | null | undefined): ResultStatusTokenPair {
  if (statusId == null) {
    return FALLBACK;
  }
  return RESULT_STATUS_TOKENS[Number(statusId)] ?? FALLBACK;
}

export function resultStatusFg(statusId: number | string | null | undefined): string {
  return resultStatusToken(statusId).fg;
}

export function resultStatusBg(statusId: number | string | null | undefined): string {
  return resultStatusToken(statusId).bg;
}

/**
 * Canonical label per `result_status_id`. Surfaces used to hard-code their own wording
 * ("Pending review" / "Pending Review" / "PENDING REVIEW"), which is why the same status read as
 * two different things depending on the screen. Casing is the component's business (a chip may
 * uppercase it in CSS); the WORDS are not.
 */
export const RESULT_STATUS_LABELS: Readonly<Record<number, string>> = {
  1: 'Editing',
  2: 'Quality Assessed',
  3: 'Submitted',
  4: 'Discontinued',
  5: 'Pending review',
  6: 'Approved',
  7: 'Rejected',
  8: 'Draft'
};

export function resultStatusLabel(statusId: number | string | null | undefined): string {
  if (statusId == null) {
    return '';
  }
  return RESULT_STATUS_LABELS[Number(statusId)] ?? '';
}
