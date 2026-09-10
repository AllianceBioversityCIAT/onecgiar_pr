/**
 * Single home of the ToC-scope filter rule (`changes/overview-aow-cross-filter`, `OSF-DD-6`). One
 * pure function maps `(rows, scope) → rows` for every scope-filterable surface — the Overview
 * hero row (`OSF-T-4`), the W1/W2 status-bucket lookup (`OSF-T-4`), and the W3/Bilateral card
 * partition (`OSF-T-5`) all call this same function rather than each re-implementing the match.
 * Precedent: `reporting-burndown.ts` is the single home for the zero-target rule.
 *
 * No Angular imports — pure, testable in isolation.
 */

/**
 * A result/bucket with no ToC link (or an empty one) belongs to the `UNTAGGED` bucket — never
 * dropped silently from every scope. Matches the server's `scopeBuckets[].key` for that bucket
 * (design.md §5).
 */
export const OVERVIEW_UNTAGGED_SCOPE_KEY = 'UNTAGGED';

/**
 * Filters `rows` down to the ones that belong to `scope`. `keyOf` resolves each row's own scope
 * key (an AoW code, `INTERMEDIATE`, `EOI_2030`, or `UNTAGGED`); a `null`/empty/undefined key is
 * treated as `UNTAGGED` rather than excluded, so a row with no ToC link still surfaces somewhere.
 *
 * `scope === null` means "All areas and outcomes" (`OSF-R-1`'s default) — every row passes
 * through unchanged, which is what keeps the unfiltered figures byte-identical (`OSF-AC-1`).
 */
export function filterRowsByScope<T>(rows: readonly T[], scope: string | null, keyOf: (row: T) => string | null | undefined): T[] {
  if (scope === null) return [...rows];
  return rows.filter(row => (keyOf(row) || OVERVIEW_UNTAGGED_SCOPE_KEY) === scope);
}
