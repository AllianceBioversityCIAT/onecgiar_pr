export type PlatformTourSurface = 'Sidebar' | 'Results Center' | 'Where to report';

export interface PlatformTourStepCopy {
  title: string;
  description: string;
  locationHint?: string;
}

/** Location badge — parallel to SP `tabBadgeHtml()` (POT-DD-4). */
export function platformLocationBadgeHtml(surface: PlatformTourSurface, hint?: string): string {
  const label = hint ? `${surface} · ${hint}` : surface;
  return `<span class="pr-guide-tab-badge"><span class="pr-guide-tab-dot"></span><strong>${label}</strong></span>`;
}

export function platformStepDescription(
  surface: PlatformTourSurface,
  body: string,
  hint?: string
): string {
  return `${platformLocationBadgeHtml(surface, hint)}<span class="pr-guide-step-copy">${body}</span>`;
}

export const SIDEBAR_TOUR_COPY = {
  header: {
    title: 'Your navigation',
    description:
      'This sidebar is home base. Every Science Program and Platform tool is listed here.',
    locationHint: 'Navigation'
  },
  programs: {
    title: 'Science Programs',
    description: 'Programs you work on appear here. Click one to open its reporting workspace.',
    locationHint: 'My programs'
  },
  otherPrograms: {
    title: 'Other programs',
    description: 'Programs you can view — but do not own — show in this second list.',
    locationHint: 'Other programs'
  },
  platform: {
    title: 'Platform tools',
    description: 'Cross-program tools live here — not inside a single Science Program.',
    locationHint: 'Platform links'
  },
  resultsCenter: {
    title: 'Results Center',
    description:
      'Open this to search and export <strong>all</strong> results across every program in one table.',
    locationHint: 'Results Center'
  },
  centers: {
    title: 'Your centers',
    description: 'Your CGIAR Center pages appear here when you have a center role.',
    locationHint: 'Centers'
  },
  collapse: {
    title: 'Collapse the sidebar',
    description: 'Click here to collapse the sidebar and save space. Expand it again anytime.',
    locationHint: 'Collapse control'
  }
} as const satisfies Record<string, PlatformTourStepCopy>;

export const RC_TOUR_COPY = {
  hero: {
    title: 'Results Center',
    description:
      'This is the cross-program catalog. Every reported result for the active phase appears in the table below.',
    locationHint: 'Hero'
  },
  whereToReport: {
    title: 'Where to report',
    description:
      'Not sure where to enter a result? Start here — we will show Science Program (W1/W2), Center (W3), and emerging paths.',
    locationHint: 'Where to report'
  },
  filters: {
    title: 'Filters',
    description:
      'Narrow the list by program, status, center, funding source, and more. Filters combine together.',
    locationHint: 'Filters'
  },
  export: {
    title: 'Export',
    description: 'Download the filtered list as a spreadsheet for your team or portfolio review.',
    locationHint: 'Export'
  },
  table: {
    title: 'Results table',
    description: 'Each row is one result. Click a row to open its detail page.',
    locationHint: 'Table'
  },
  update: {
    title: 'Update a result',
    description: 'Already reporting? Jump straight to an existing result to edit it.',
    locationHint: 'Update result'
  }
} as const satisfies Record<string, PlatformTourStepCopy>;

export const WTR_TOUR_COPY = {
  intro: {
    title: 'Three reporting paths',
    description:
      'Pick the path that matches <strong>who funds</strong> your work. You can switch paths anytime before you submit.',
    locationHint: 'Overview'
  },
  picker: {
    title: 'Choose a program',
    description:
      'Select your Science Program first — all reporting happens inside a program, even from Results Center.',
    locationHint: 'Program picker'
  },
  w12: {
    title: 'Science Program funding (W1/W2)',
    description:
      'Report against planned indicators from the program Theory of Change (ToC).',
    locationHint: 'W1/W2 path'
  },
  w3: {
    title: 'Center funding (W3)',
    description: 'Report from your center workspace when the program uses W3 (center-executed) rules.',
    locationHint: 'W3 path'
  },
  emerging: {
    title: 'Emerging results',
    description:
      'For findings that were <strong>not</strong> planned in the ToC — use this when nothing in the plan fits.',
    locationHint: 'Emerging'
  }
} as const satisfies Record<string, PlatformTourStepCopy>;
