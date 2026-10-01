/**
 * Center filter pills inside a "Contributing W3/bilateral projects" dropdown — shared user-facing copy (R37).
 * Used by the W3/Bilateral form (P2-3859, through `BILATERAL_CONTRIBUTORS_COPY.projectFilter`) and the
 * W1/W2 (pooled) result form (P2-3860), so both filters read the same.
 */
export const PROJECT_CENTER_FILTER_COPY = {
  /** Accessible name of the pill group (the pills themselves only show the acronym and a count). */
  groupLabel: 'Filter projects by Center',
  allCenters: 'All centers',
  count: (n: number): string => `(${n})`,
  /** Tooltip + accessible name of a pill: the pill itself only shows the acronym, so the full name lives here. */
  pillTitle: (centerName: string, n: number): string => `${centerName} (${n} ${n === 1 ? 'project' : 'projects'})`
} as const;
