/** Tab-specific explainer copy for the bilateral center header info popover. */
export const BILATERAL_HEADER_INFO_COPY = {
  infoButtonAriaLabel: 'About this center and view',
  popoverAriaLabel: 'About this center and view',
  activeViewLabel: 'Active view',
  centerOverviewHeading: 'Center overview',
  fallbackCenterOverview:
    'CGIAR Centers report W3/Bilateral results that contribute to Science Programs and Accelerators. ' +
    'Use this workspace to track progress, create results, and manage submissions for the current reporting cycle.',
  centerOverview: (centerName: string): string =>
    `${centerName} reports W3/Bilateral results that contribute to CGIAR Science Programs and Accelerators. ` +
    'This center workspace brings together portfolio overview, project-based reporting, result management, and AI-assisted draft review for the current cycle.',
  tabs: {
    overview: {
      title: 'Overview',
      description:
        'A dashboard of your center’s bilateral reporting progress. Review status distribution, science program alignment, project activity, and items that need attention before submission.'
    },
    reporting: {
      title: 'Reporting',
      description:
        'Browse bilateral projects mapped to Science Programs. Search and filter the catalog, inspect program allocation, and start a new W3/Bilateral result from a project card.'
    },
    results: {
      title: 'Results',
      description:
        'View and open all W3/Bilateral results led by this center. Filter by phase, status, and science program, then continue editing or review submitted contributions.'
    },
    drafts: {
      title: 'AI Draft Results',
      description:
        'Review AI-generated draft results before they become formal submissions. Inspect extracted fields, refine titles and descriptions, and promote drafts into the reporting workflow.'
    }
  }
} as const;
