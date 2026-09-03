/**
 * Build number shown beside the PRMS wordmark in the sidebar.
 *
 * It exists to tell one deployed build apart from the next: QA and the team read the number on
 * screen instead of guessing whether the environment picked up the last delivery. Deliberately a
 * plain counter — a date or a hash is harder to read out loud and to compare at a glance.
 *
 * Bump it by one on every delivery meant to be verified in a testing environment. Nothing
 * generates it, so a stale value here makes the stamp lie.
 */
export const APP_VERSION = '31';
