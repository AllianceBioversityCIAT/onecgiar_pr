// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-T-3, BRT-R-19, BRT-R-31)
/**
 * `Bilateral review` tab — string map (NFR i18n: American English, centralized copy).
 * `docs/specs/changes/sp-bilateral-review-tab/requirements.md` BRT-R-19; `design.md` §6.2/§6.3.
 */
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
    centerFilterPlaceholder: 'Center',
    projectFilterLabel: 'Bilateral project',
    projectFilterPlaceholder: 'Bilateral project',
    categoryFilterLabel: 'Indicator category',
    categoryFilterPlaceholder: 'Indicator category'
  },
  /** Status chips row. */
  chips: {
    all: 'All',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected'
  },
  /** KPI strip (`BilateralReviewKpisComponent`). */
  kpis: {
    projects: 'Bilateral projects',
    centers: 'Contributing centers',
    pending: 'Pending review',
    decided: 'Decided this list',
    decidedSublabel: (approved: number, rejected: number): string => `${approved} approved · ${rejected} rejected`
  },
  /** Loading / empty / filtered-empty / error states (BRT-R-31). */
  states: {
    empty: 'No bilateral results reported to this program yet.',
    filteredEmpty: 'No results match your filters.',
    error: 'We could not load the bilateral review list.',
    retry: 'Retry'
  }
};
