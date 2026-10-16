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
  centerEmpty: 'No W3/Bilateral results in this phase',
  // Global filters group (design 6.7); GLF-T-4 adds its keys here (spec changes/portfolio-overview-revamp/global-filters, GLF-R-7, GLF-R-9)
  filters: {
    dimensions: { program: 'Program', project: 'Project', center: 'Center', typology: 'Typology', status: 'Status' },
    notAffected: (labels: string) => `Not affected by: ${labels}`,
    totalsWholePortfolio: 'Totals cover the whole portfolio',
    // Filter bar (GLF-T-4, design 6.4 / 6.7)
    barLabel: 'Portfolio filters',
    clearAll: 'Clear all',
    noResults: 'No results match these filters.',
    count: (shown: string, total: string) => `${shown} of ${total} results`,
    countAll: (total: string, n: number) => (n === 1 ? `${total} result` : `${total} results`),
    applying: 'Applying filters…',
    remove: (label: string) => `Remove ${label}`,
    selectedCount: (n: number) => `${n} selected`,
    searchPlaceholder: (label: string) => `Search ${label.toLowerCase()}`,
    searchLabel: (label: string) => `Search ${label}`,
    noMatches: 'No matches',
    levelAll: (label: string) => `All ${label} types`,
    mapLoading: 'Loading the Project and Center filters…',
    mapError: 'The Project and Center filters are unavailable right now.',
    retry: 'Retry',
    hintLoading: 'Available when the Project and Center data has loaded',
    hintError: 'Unavailable right now. Use Retry.',
    droppedNotice: 'Your Project and Center selection was removed because their data could not be loaded.',
    sheetTrigger: (n: number) => (n > 0 ? `Filters (${n})` : 'Filters'),
    sheetTitle: 'Filters',
    activeChips: 'Active filters'
  },
  // Progress against ToC KPIs (spec changes/portfolio-overview-revamp/toc-kpi-progress, TKP-R-4..7)
  tocKpi: {
    title: 'Progress against ToC KPIs',
    subtitle: (year: string) =>
      `KPIs covered by at least one W1/W2 result in QA or Submitted status, out of the KPIs in each Program's Theory of Change for ${year}`,
    summaryLabel: 'All Programs and Accelerators',
    splitLine: (outputs: { covered: number; total: number }, outcomes: { covered: number; total: number }) =>
      `Outputs ${outputs.covered} / ${outputs.total} · Outcomes ${outcomes.covered} / ${outcomes.total}`,
    noKpis: 'No ToC KPIs in this phase',
    empty: 'No ToC KPIs are defined for this phase yet.',
    error: 'Progress against ToC KPIs could not be loaded right now.',
    retry: 'Retry',
    loading: 'Loading progress against ToC KPIs',
    barLabel: (percent: number, covered: number, total: number) => `${percent}% — ${covered} of ${total} KPIs covered`,
    openProgramme: (name: string) => `Open the Results tab of ${name}`
  },
  // W3/Bilateral projects (spec changes/portfolio-overview-revamp/w3-projects-section, WPS-R-4..R-9)
  projects: {
    title: 'W3/Bilateral projects',
    subtitle: (year: string | number) => `Projects mapped to a Program or Accelerator for ${year}, and how many report results`,
    kpiMapped: 'Mapped projects',
    kpiWithBilateral: 'With W3/Bilateral results',
    kpiW1w2: 'Contributing to W1/W2',
    percentOfMapped: (percent: string) => `${percent}% of mapped`,
    tabProgram: 'By P/A',
    tabCenter: 'By Center',
    dimensionAriaLabel: 'Group the projects by',
    viewChart: 'Chart',
    viewTable: 'Table',
    viewAriaLabel: 'Show the projects as',
    multiProgramCaption: 'A project mapped to several P/As counts under each, so the bars add up to more than the total.',
    footnote: (n: number) =>
      n === 1
        ? '1 project has W3/Bilateral results but no approved P/A mapping, so it is not counted.'
        : `${n} projects have W3/Bilateral results but no approved P/A mapping, so they are not counted.`,
    unassigned: 'Unassigned',
    empty: (year: string | number) => `No W3/Bilateral projects are mapped to a Program for ${year} yet.`,
    error: 'W3/Bilateral projects could not be loaded right now.',
    retry: 'Retry',
    loading: 'Loading W3/Bilateral projects',
    colProgram: 'Program / Accelerator',
    colCenter: 'Center',
    totalLabel: 'Total',
    tableCaptionProgram: 'W3/Bilateral projects by Program / Accelerator',
    tableCaptionCenter: 'W3/Bilateral projects by Center'
  }
} as const;
