/**
 * Platform-only copy for Results Center "Where to report" guide-only mode.
 * Shared W3 strings come from `HUB_COPY` — do not fork `noCentersBody`.
 */
export const PLATFORM_GUIDE_COPY = {
  w12NoSpTitle: 'W1/W2 · Pooled funding',
  w12NoSpBody:
    'Pooled (W1/W2) results are reported inside a Science Program. You are not assigned to a program in the active portfolio yet. Ask your program admin for access, or browse Science Programs to see where reporting happens.',
  w12NoSpLink: 'Browse Science Programs',
  w12NoSpHref: '/result-framework-reporting',
  w3CenterOnlyBody: (centerCount: number) =>
    centerCount > 0
      ? `You are assigned to ${centerCount} center${centerCount === 1 ? '' : 's'}, but bilateral (W3) projects are listed in the context of a Science Program. Obtain program membership to see mapped projects and report W3 results.`
      : 'Bilateral (W3) results are reported by CGIAR Centers within a Science Program context. Obtain program membership to list mapped projects.',
  w3CenterOnlyLink: 'Browse Science Programs',
  emergingTitle: 'Emerging result',
  emergingSubtitle: (year: number | string | null) =>
    year
      ? `Unplanned achievement not in the ${year} Theory of Change`
      : 'Unplanned achievement not in the active Theory of Change',
  emergingAction: 'Report emerging result',
  emergingDisabledHint:
    'Emerging results are reported from within a Science Program once you have reporting access on that program.',
  pickerTitle: 'Choose a Science Program',
  pickerSubtitle: 'Reporting paths are scoped to one program at a time.',
  pickerContinue: 'Continue',
  pickerLoading: 'Loading programs…',
  pickerCount: (n: number) => (n === 1 ? '1 program' : `${n} programs`)
} as const;
