/**
 * Admin › All P/As and Centers — user-facing copy (R37). P2-3858 (INC-163934-2, Nicoleta 29-Sep-2026):
 * one page with the Overview numbers of every Program/Accelerator and every CGIAR Center.
 */
export const ADMIN_ENTITIES_OVERVIEW_COPY = {
  title: 'All P/As and Centers',
  subtitle: 'Reporting status of every Program/Accelerator and every CGIAR Center on one page — the same numbers each Overview shows.',
  phaseLabel: 'Phase',
  noPhase: 'No open reporting phase',
  programsTitle: 'Programs and Accelerators',
  programsHint: 'W1/W2 results, as on each Program Overview.',
  centersTitle: 'CGIAR Centers',
  centersHint: 'W3/Bilateral results, as on each Center Overview.',
  nameColumn: 'Name',
  totalColumn: 'Total',
  totalRow: 'All',
  openOverview: (name: string): string => `Open the ${name} Overview`,
  loadError: 'Could not load.',
  retry: 'Retry',
  programsError: 'The Programs could not be loaded.',
  centersError: 'The Centers list could not be loaded.',
  partialTotal: 'Some rows could not be loaded, so the total leaves them out.',
  empty: 'Nothing to show.'
} as const;
