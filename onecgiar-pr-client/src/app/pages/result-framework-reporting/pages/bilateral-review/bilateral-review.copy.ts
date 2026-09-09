// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-T-3, BRT-R-19, BRT-R-31)
/**
 * `Bilateral review` tab — string map (NFR i18n: American English, centralized copy).
 * `docs/specs/changes/sp-bilateral-review-tab/requirements.md` BRT-R-19; `design.md` §6.2/§6.3.
 */

// @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-4, design.md §6.2)
/**
 * Tonal count badge shared by the status segmented control and the center strip. Contrast measured
 * HITL (BRP-R-4): primary-100/primary-800 and primary-700/white both clear 4.5:1; the neutral
 * fallback (zero count) uses the same subtle-surface/secondary-text pairing the rest of the page
 * uses for muted numerals.
 */
export function chipCountClass(count: number, pressed: boolean): string {
  const base = 'inline-flex min-w-[20px] justify-center rounded-full px-[6px] text-[11px] font-semibold tabular-nums leading-[18px]';
  if (count > 0 && pressed) return `${base} bg-[var(--pr-color-primary-700)] text-white`;
  if (count > 0) return `${base} bg-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-800)]`;
  return `${base} bg-[var(--pr-surface-subtle)] text-[var(--pr-text-secondary)]`;
}

export const BILATERAL_REVIEW_COPY = {
  tabLabel: 'Bilateral review',
  badgeAriaLabel: (pendingCount: number): string => `${pendingCount} pending review`,
  /** Band explainer panel entry (`activeTabInfo()`), tone-matched to the sibling tabs. */
  explainer: {
    title: 'Bilateral review',
    description:
      'Lists W3/Bilateral results that centers have reported to this program, grouped by bilateral project. Program reviewers approve or reject pending contributions here.'
  },
  // @akili-spec changes/sp-bilateral-review-tab (BRT-T-3)
  /** Page shell toolbar (search, Filter popover, Only pending, Expand all, Grouped/All results). */
  toolbar: {
    searchPlaceholder: 'Search code, title, project, center, category or indicator',
    searchAriaLabel: 'Search bilateral review results',
    clearSearchAriaLabel: 'Clear search',
    filterButtonLabel: 'Filter',
    filterAriaLabel: 'Filter bilateral review results',
    closeFiltersAriaLabel: 'Close filters',
    clearFilters: 'Clear filters',
    onlyPending: 'Only pending',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    groupedView: 'Grouped',
    flatView: 'All results',
    centerFilterLabel: 'Center',
    // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-1 attempt 2) — popover option-list
    // search placeholder, shown only when a dimension carries > 8 options (see `filterBand`'s
    // sibling constant, not `toolbar`'s own search — that one filters ROWS, this one filters the
    // OPTION LIST of one popover dimension).
    centerOptionSearchPlaceholder: 'Search centers',
    projectFilterLabel: 'Bilateral project',
    projectOptionSearchPlaceholder: 'Search projects',
    categoryFilterLabel: 'Indicator category',
    categoryOptionSearchPlaceholder: 'Search categories',
    // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-1 attempt 2, Reviewer round 2) — the
    // empty state of ONE popover dimension's option list after an option-search needle narrows it
    // to nothing (was inline English in the template, three times).
    filterOptionsNoMatches: 'No matches',
    // @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-7)
    cycleFilterLabel: 'Cycle',
    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-5)
    /** Toolbar "Clear filters · N" ghost button — replaces the old unconditional clear button. */
    clearAllLabel: (count: number): string => `Clear filters · ${count}`,
    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-11)
    /** Group-mode segmented control (`Group: Project | Center`), grouped view only. */
    groupByLabel: 'Group',
    groupByProject: 'Project',
    groupByCenter: 'Center'
  },
  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-1, R-2, R-3)
  /** Filter band — labeled rows above the status segmented control and the centers row. */
  filterBand: {
    statusLabel: 'Status',
    centersLabel: (count: number): string => `Centers · ${count}`,
    showCenters: 'Show centers',
    hideCenters: 'Hide centers'
  },
  /** Status chips row. */
  chips: {
    all: 'All',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected'
  },
  /** KPI strip (`BilateralReviewKpisComponent`) — rewritten as a one-line stat bar (BRP-R-6). */
  kpis: {
    projects: 'bilateral projects',
    centers: 'contributing centers',
    pending: 'pending review',
    decided: 'decided',
    decidedSublabel: (approved: number, rejected: number): string => `${approved} approved · ${rejected} rejected`
  },
  // @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-8)
  /** Pill next to the match count, shown only when the selected cycle differs from the current
   *  one ("Showing Reporting 2025") — so the hero's own cycle line is never misread. */
  phaseIndicator: (phaseName: string): string => `Showing ${phaseName}`,
  // @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-2, R-1, R-2, R-20, R-21)
  /** `BilateralReviewCenterStripComponent` — center chip strip under the status chips. */
  centerStrip: {
    groupAriaLabel: 'Contributing centers',
    all: 'All centers',
    notSpecified: 'Not specified',
    moreLabel: (hidden: number): string => `+${hidden} more`,
    chipAriaLabel: (label: string, pending: number): string => `${label}, ${pending} pending`,
    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-3, AC-3b)
    /** Collapsed-row summary chip when the popover holds several centers ("2 centers ✕"). */
    multipleLabel: (count: number): string => `${count} centers`,
    clearCenterAriaLabel: 'Clear center'
  },
  /** Loading / empty / filtered-empty / error states (BRT-R-31). */
  states: {
    empty: 'No bilateral results reported to this program yet.',
    filteredEmpty: 'No results match your filters.',
    error: 'We could not load the bilateral review list.',
    retry: 'Retry'
  },
  // @akili-spec changes/sp-bilateral-review-tab (BRT-T-4 rework attempt 2 — Reviewer fix #4)
  /** `BilateralReviewTableComponent` — grouped/flat table copy (column headers, row strings). */
  table: {
    // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-3) — `toc` +
    // `indicator` merged into one `alignment` header IN COLUMN POSITION (between `status` and
    // `date`) — key order is load-bearing for the header-order spec (project 7 keys / center 6
    // rendered, `showCenterColumn()` hides `center`'s rendered `<th>` but the key stays here).
    headers: {
      code: 'Code',
      title: 'Title',
      center: 'Lead center',
      status: 'Status',
      alignment: 'Alignment',
      date: 'Submission date',
      actions: 'Actions'
    },
    contributorBadge: 'Contributor',
    notSpecified: 'Not specified',
    reviewAction: 'Review',
    seeAction: 'See',
    // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-3, AC-5)
    /** The two original column names, kept for the merged Alignment cell's `sr-only` text when
     *  both values are placeholders — the visible header is `headers.alignment` now, but a screen
     *  reader user still needs to know WHICH value ("TOC result" vs "Indicator") is which. */
    tocLabel: 'TOC result',
    indicatorLabel: 'Indicator',
    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-11, R-12)
    /** Group header right side, split so the pending figure can carry its own tone (BRP-R-11) —
     *  replaces the combined "N results · M pending" string. */
    resultsLabel: (results: number): string => `${results} results`,
    pendingLabel: (pending: number): string => `${pending} pending`,
    /** Center-mode group caption — "N projects" (BRP-R-11's "the number of projects in the
     *  group"). Singular for exactly one. */
    projectsCaption: (count: number): string => `${count} project${count === 1 ? '' : 's'}`,
    // @akili-spec changes/sp-bilateral-review-tab (BRT-T-5, KZ-REH-2)
    /** Row action title while a decision re-fetch is in flight (`aria-disabled`, not `disabled`). */
    decisionInFlightTitle: 'Saving the decision. Please wait.'
  }
};
