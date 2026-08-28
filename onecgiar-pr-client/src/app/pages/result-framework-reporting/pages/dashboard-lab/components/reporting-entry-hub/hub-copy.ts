/**
 * `ReportingEntryHubComponent` — every user-facing string, centralised (NFR i18n, `hub-copy.ts`
 * accepted deviation from DD-9: this codebase's `dashboard-lab` templates use literal English; a
 * later i18n pass becomes a single edit to this file instead of a template hunt).
 *
 * `docs/specs/changes/reporting-entry-hub/requirements.md` / `design.md` §6.2/§6.3.
 */
export const HUB_COPY = {
  title: 'Where to report',
  subtitle: 'Two funding paths, two entry points. Pick the one that matches the result you are reporting.',
  collapse: 'Collapse',
  expand: 'Expand',
  collapsedSummary: (aowCount: number, w3Total: number, w3Centers: number) =>
    `W1/W2 · ${aowCount} AoWs · W3 · ${w3Total} projects across ${w3Centers} centers`,
  notSeeingCenter: 'Not seeing your center? W3 reporting needs a Center User role.',
  requestAccess: 'Request access',
  requestAccessMailSubject: 'Request access to a CGIAR Center',
  w12: {
    laneTitle: 'W1/W2 · Pooled funding',
    laneBadge: 'Core',
    laneSubtitle: (phaseLabel: string) =>
      phaseLabel
        ? `Report against the program's ${phaseLabel} Theory of Change, by Area of Work.`
        : `Report against the program's Theory of Change, by Area of Work.`,
    reportAction: 'Report',
    noRightsTooltip: 'You do not have reporting rights on this program',
    noRightsLine: (programCode: string) => `Ask your program admin to add you to ${programCode}.`,
    programLevelHeading: 'Program-level · cross-cutting',
    noProgramLevel: 'No program-level targets planned for this phase.',
    outcomeBadge: 'Outcome',
    footerPrefix: 'Something not in the plan? Use ',
    footerAction: 'Report emerging result',
    footerSuffix: ' in the header.'
  },
  w3: {
    laneTitle: 'W3 · Bilateral projects',
    laneSubtitle: (programCode: string, year: number | string) =>
      `Reported through your CGIAR Center. Only projects that allocate budget to ${programCode} in ${year}.`,
    totalsBadge: (total: number, centers: number) => `${total} projects · ${centers} centers`,
    searchLabel: 'Search projects by code or name',
    searchPlaceholder: 'Search by project code or name (e.g. B-A1368)',
    matchCounter: (matches: number, total: number) => `${matches} / ${total}`,
    projectsOf: (n: number, m: number, programCode: string) => `${n} of ${m} projects fund ${programCode}`,
    openCenterHome: 'Open center home',
    /** Punctuation between the "N of M…" text and the "Open center home" link — read aloud with
     * both, so it is copy, not decoration. */
    homeLinkSeparator: ' · ',
    showAll: (n: number) => `Show all ${n}`,
    showLess: 'Show less',
    createResult: 'Create result',
    createResultDisabledTitle: 'Center acronym missing — open it from My CGIAR Centers',
    /** The bolded percentage inside the allocation chip (the `<SP code>` half is the `programCode`
     * input, not copy). */
    allocationValue: (allocation: number) => `${allocation}%`,
    noneFunding: (programCode: string, phaseLabel: string) =>
      `None of your centers has a project allocated to ${programCode} in ${phaseLabel}.`,
    noCentersBody: 'W3 results are reported by CGIAR Centers. You are not assigned to a center yet.',
    errorMessage: 'Could not load your center projects.',
    centerErrorMessage: (centerName: string) => `Could not load projects for ${centerName}`,
    retry: 'Retry',
    truncatedNotice: 'Showing the first 300 projects — refine your search',
    activePhaseNote: (year: number | string) => `Bilateral projects are listed for the active reporting phase (${year}).`,
    // `aria-live="polite"` announcements (REH-AC-14) — read aloud by screen readers, so they are
    // copy in every sense that matters, not just visible template text.
    searchAnnouncement: (matches: number, total: number) => `${matches} / ${total} projects match`,
    centerToggleAnnouncement: (centerName: string, expanded: boolean) => `${centerName} ${expanded ? 'expanded' : 'collapsed'}`,
    showAllAnnouncement: (showAll: boolean, total: number, centerName: string) =>
      showAll ? `Showing all ${total} projects for ${centerName}` : `Showing 3 of ${total} projects for ${centerName}`
  }
} as const;
