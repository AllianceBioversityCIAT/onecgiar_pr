/**
 * Version shown beside the PRMS wordmark in the sidebar.
 *
 * It exists to tell one deployed build apart from the next: QA and the team read it on screen
 * instead of guessing whether the environment picked up the last delivery.
 *
 * ## Format — semantic versioning (MAJOR.MINOR.PATCH)
 *
 * Until 10-Sep-2026 this was a plain counter that ended at `57`. It now follows the industry
 * convention, so what the number changes says what kind of delivery it was:
 *
 * - **MAJOR** — a change that breaks how something already worked, or a release the business treats
 *   as a new stage of the product. Resets MINOR and PATCH to 0.
 * - **MINOR** — new functionality that does not break what already worked. Resets PATCH to 0.
 * - **PATCH** — a fix or an internal change with no new functionality.
 *
 * 🛑 The jump from `57` to `1.0.0` is deliberate and is NOT the environment going backwards. Anyone
 * comparing against an older instruction should read `57` as the last of the old series; everything
 * from `1.0.0` on belongs to the new one.
 *
 * ## Bumping it
 *
 * Bump on every delivery meant to be verified in a testing environment. Nothing generates it, so a
 * stale value here makes the stamp lie.
 *
 * 🛑 Read the value from the merged tree before bumping — never from memory. Several sessions work
 * this checkout at once, and two of them bumping blind leaves QA with a number that does not carry
 * the fix they were asked to verify.
 */
export const APP_VERSION = '1.1.0';
