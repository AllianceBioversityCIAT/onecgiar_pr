/**
 * Portfolio overview › CGIAR Centers (W3/Bilateral) block — user-facing copy (R37).
 * P2-3858 (INC-163934-2) built it as Admin › All P/As and Centers; P2-3928 (Ángel, 7-Oct-2026) moved the
 * Centers block into the Portfolio overview and removed the separate page.
 */
export const PORTFOLIO_CENTERS_BLOCK_COPY = {
  eyebrow: 'W3/Bilateral',
  title: 'CGIAR Centers',
  subtitle: 'W3/Bilateral results of every CGIAR Center in this phase — the same numbers each Center Overview shows.',
  phaseLabel: 'Phase',
  noPhase: 'No open reporting phase',
  nameColumn: 'Name',
  totalColumn: 'Total',
  totalRow: 'All',
  openOverview: (name: string): string => `Open the ${name} Overview`,
  loadError: 'Could not load.',
  retry: 'Retry',
  centersError: 'The Centers list could not be loaded.',
  partialTotal: 'Some rows could not be loaded, so the total leaves them out.',
  empty: 'Nothing to show.',
  kpiBilateral: 'W3/Bilateral results',
  kpiBilateralChip: (percent: number): string => `${percent}% approved`,
  kpiCentersReporting: 'Centers reporting',
  kpiReportingHint: 'with at least one result',
  resultsWord: 'results',
  statusTitle: 'Reporting status',
  activeFilter: 'Active filter:',
  viewInResultsCenter: 'View in Results Center',
  clearFilter: 'Clear filter',
  rankingCentersTitle: 'CGIAR Centers ranking',
  rankingHint: 'Results per Center, split by status. Click a status to rank by it.',
  modeHorizontal: 'Horizontal Bar',
  modeVertical: 'Vertical Bar',
  modeHeatmap: 'Heatmap',
  detailCentersTitle: 'Progress by Center',
  detailHint: 'The same numbers each Center Overview shows. Click a header to sort, a name to open its Overview.',
  tableView: 'Table View',
  chartView: 'Chart View',
  searchCenters: 'Search center…',
  clearSearch: 'Clear search',
  shownCount: (shown: number, total: number): string => `${shown} of ${total}`,
  centersStillLoading: 'Some Centers are still loading; figures update as they arrive.'
} as const;
