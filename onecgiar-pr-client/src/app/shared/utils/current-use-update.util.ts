import { CURRENT_USE_UPDATE_COPY } from '../../internationalization/current-use-update.copy';

/**
 * P2-3537 §4 / P2-3985 — the rules of the Innovation Use "Current Use Update" block, as pure functions,
 * so the W1/W2 form (`shared/components/innovation-use-form`) and the W3/bilateral full metadata
 * (`pages/bilateral/.../type-innovation-use`) reconcile the same way. Each form decides on its own
 * WHETHER the block shows and how it sums its actor rows; everything after that lives here.
 *
 * `previous` is the server's `current_use_previous` (`{ result_id, phase_year, total_actors }`), `null`
 * when the block must not render.
 */
export interface CurrentUsePrevious {
  total_actors?: number | string | null;
  phase_year?: number | string | null;
}

/** The figure reported in the previous phase, as a number. */
export function previousReportedUse(previous: CurrentUsePrevious | null | undefined): number {
  return Number(previous?.total_actors) || 0;
}

/** The round that figure comes from, for the "(FY2025)" label. `null` when unknown. */
export function previousUsePhaseYear(previous: CurrentUsePrevious | null | undefined): number | null {
  const year = Number(previous?.phase_year);
  return Number.isFinite(year) && year > 0 ? year : null;
}

/** Total cumulative use to date = previous + new. Never typed by anyone (field 3 of the story). */
export function totalCumulativeUse(previous: CurrentUsePrevious | null | undefined, newUsersAdded: unknown): number {
  return previousReportedUse(previous) + (Number(newUsersAdded) || 0);
}

/** The gap between what the actor rows add up to and the cumulative total. 0 means reconciled. */
export function currentUseDifference(actorsTotal: number, previous: CurrentUsePrevious | null | undefined, newUsersAdded: unknown): number {
  return actorsTotal - totalCumulativeUse(previous, newUsersAdded);
}

/** §4.1 — true while the actor rows do not add up to the cumulative total. */
export function hasCurrentUseMismatch(actorsTotal: number, previous: CurrentUsePrevious | null | undefined, newUsersAdded: unknown): boolean {
  return currentUseDifference(actorsTotal, previous, newUsersAdded) !== 0;
}

const direction = (diff: number): 'more than' | 'fewer than' => (diff > 0 ? 'more than' : 'fewer than');

/** The message §6.1 asks for: names the figures and states the exact gap. */
export function currentUseMismatchMessage(actorsTotal: number, previous: CurrentUsePrevious | null | undefined, newUsersAdded: unknown): string {
  const diff = currentUseDifference(actorsTotal, previous, newUsersAdded);
  return CURRENT_USE_UPDATE_COPY.mismatch(
    actorsTotal,
    Math.abs(diff),
    direction(diff),
    totalCumulativeUse(previous, newUsersAdded),
    previousReportedUse(previous),
    Number(newUsersAdded) || 0
  );
}

/** P2-3985 — the short form of the same gap, for the bilateral MDS footer / Submit alert. */
export function currentUseMismatchReason(actorsTotal: number, previous: CurrentUsePrevious | null | undefined, newUsersAdded: unknown): string {
  const diff = currentUseDifference(actorsTotal, previous, newUsersAdded);
  return CURRENT_USE_UPDATE_COPY.mismatchReason(actorsTotal, Math.abs(diff), direction(diff), totalCumulativeUse(previous, newUsersAdded));
}

/**
 * Both questions of the block carry an answer. §5: "New users added = 0" is allowed and still requires
 * the narrative, so the test is "answered", not "greater than zero".
 */
export function isCurrentUseUpdateAnswered(newUsersAdded: unknown, narrative: unknown): boolean {
  const answered = newUsersAdded !== null && newUsersAdded !== undefined;
  const narrated = !!String(narrative ?? '').trim();
  return answered && narrated;
}

/** Completion rule of a SHOWN block: answered, and the actor rows reconcile with the cumulative total. */
export function isCurrentUseUpdateComplete(
  actorsTotal: number,
  previous: CurrentUsePrevious | null | undefined,
  newUsersAdded: unknown,
  narrative: unknown
): boolean {
  return isCurrentUseUpdateAnswered(newUsersAdded, narrative) && !hasCurrentUseMismatch(actorsTotal, previous, newUsersAdded);
}
