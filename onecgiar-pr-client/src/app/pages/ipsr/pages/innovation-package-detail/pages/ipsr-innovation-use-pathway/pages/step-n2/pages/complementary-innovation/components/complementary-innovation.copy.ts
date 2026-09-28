/**
 * P2-3840 — user-facing strings of IPSR Step 2.1 (candidate table + selected bundle list).
 * Kept out of the templates so a wording pass edits this file only. The modal keeps its own copy.
 */
export const COMPLEMENTARY_INNOVATION_COPY = {
  // P2-3846 — search-first layout (Ángel's mockup, 28-Sep-2026).
  searchTitle: 'Search existing PRMS results first',
  recommended: 'Recommended',
  searchHint:
    'Before adding a new enabler, check if it already exists in PRMS. Linking existing results prevents duplication and strengthens the package evidence base.',
  searchPlaceholder: 'Search by title, keyword, code or lead…',
  clearSearch: 'Clear search',
  resultTypes: 'Result types:',
  allTypes: 'All',
  resultsCount: (shown: number, all: number, searching: boolean) =>
    searching ? `${shown} ${shown === 1 ? 'match' : 'matches'} of ${all} results` : `${all} results available`,
  showMore: (remaining: number) => `Show ${Math.min(remaining, 10)} more`,
  link: 'Link',
  linked: 'Linked',
  created: 'Created',
  notInPrms: 'Not in PRMS yet?',
  addManualTitle: 'Add a new enabler (not yet reported in PRMS)',
  addManualHint: 'New entries are saved to the global PRMS repository and become available to all reporters going forward.',

  select: 'Add to the bundle',
  deselect: 'Remove from the bundle',
  openResult: 'Open result in a new tab',
  total: (shown: number, all: number) => `Total: ${shown} / ${all}`,
  noMatches: 'There are no results for the selected filters.',

  selectedTitle: 'Selected for the bundle',
  selectedCount: (count: number) => `${count} selected`,
  selectedEmpty: 'No complementary innovation/ enabler/ solution selected yet',
  createdKind: 'Created in IPSR',
  prmsKind: 'PRMS result',
  view: 'View',
  edit: 'Edit',
  remove: 'Remove from the bundle'
};
