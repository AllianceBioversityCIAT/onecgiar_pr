/**
 * Portfolio overview › CGIAR Centers (W3/Bilateral) block — user-facing copy (R37).
 * P2-3858 (INC-163934-2) built it as Admin › All P/As and Centers; P2-3928 (Ángel, 7-Oct-2026) moved the
 * Centers block into the Portfolio overview and removed the separate page.
 */
export const PORTFOLIO_CENTERS_BLOCK_COPY = {
  eyebrow: 'W3/Bilateral',
  title: 'CGIAR Centers',
  subtitle: 'W3/Bilateral results per CGIAR Center in this phase. Each result counts once, even when several Centers share it.',
  phaseLabel: 'Phase',
  noPhase: 'No open reporting phase',
  retry: 'Retry',
  centersError: 'The Centers list could not be loaded.',
  partialTotal: 'Some Centers could not be loaded, so the totals leave them out.',
  retryFailedCenters: 'Retry failed Centers',
  empty: 'Nothing to show.',
  kpiBilateral: 'W3/Bilateral results',
  resultsWord: 'results',
  statusTitle: 'Reporting status',
  activeFilter: 'Active filter:',
  viewInResultsCenter: 'View in Results Center',
  clearFilter: 'Clear filter',
  centersStillLoading: 'Some Centers are still loading; figures update as they arrive.',
  // PCA V-1 gate: W3 results the deck counts that no Center returns.
  noCenterNote: (count: number): string => (count === 1 ? '1 W3 result has no Center' : `${count} W3 results have no Center`),
  originNew: 'New',
  originReplicated: 'Replicated',
  filterSeparator: ' · ',
  // GLF-R-9: the line shown when an active global dimension is not honoured by this block.
  dimensions: { program: 'Program', project: 'Project', center: 'Center', typology: 'Typology', status: 'Status', funding: 'Funding source' },
  notAffected: (labels: string): string => `Not affected by: ${labels}`
} as const;
