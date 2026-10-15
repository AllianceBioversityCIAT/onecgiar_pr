/**
 * Portfolio overview › status section — user-facing copy (client CLAUDE.md §5/§10).
 * Holds only the strings added by spec `changes/portfolio-overview-revamp/remove-rankings-status-copy`;
 * the rest of the page's template copy has not been migrated.
 */
export const PORTFOLIO_OVERVIEW_COPY = {
  statusTitle: 'Portfolio Results Reporting Status',
  statusSubtitle: 'All W1/W2 and W3/Bilateral results reported in this phase, by status',
  statusTableCaption: 'Portfolio Results Reporting Status breakdown',
  statusGuideLink: 'What do these statuses mean?',
  opensInNewTab: '(opens in a new tab)',
  rejectedHint: 'Applies to W3/Bilateral results only',
  // Typology view (spec changes/portfolio-overview-revamp/typology-view)
  typologyTitle: 'Results by typology',
  typologySubtitle: 'All results reported in this phase, grouped by level: Output, Outcome and Impact',
  typologyTableCaption: 'Results by level, broken down by Program / Accelerator or by lead Center',
  levelOutput: 'Output',
  levelOutcome: 'Outcome',
  levelImpact: 'Impact',
  levelUnclassified: 'Unclassified',
  levelEmpty: 'No results at this level',
  dimensionProgram: 'By Program / Accelerator',
  dimensionCenter: 'By Center (W3/Bilateral)',
  dimensionAriaLabel: 'Group the table by',
  colProgram: 'Program / Accelerator',
  colCenter: 'Lead Center',
  colTotal: 'Total',
  noProgram: 'No Program',
  noLeadCenter: 'No lead Center',
  noType: 'No type',
  centerNote: 'Each W3/Bilateral result counts once, under its lead Center.',
  centerEmpty: 'No W3/Bilateral results in this phase'
} as const;
