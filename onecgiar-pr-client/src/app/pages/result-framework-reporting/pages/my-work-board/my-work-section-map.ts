// @akili-spec changes/my-work-board (MWB-T-2, MWB-R-6, design.md §5)
// Pure — no Angular imports. Consumed by `my-work.view-model.ts` and the card component (T-4).

/** One `section_name`'s result-detail child route + card label (design.md §5). */
export interface MyWorkSection {
  /** Result-detail child route (`routing-data.ts` `resultDetailRouting`). */
  route: string;
  /** Card label used in the missing-sections list. */
  label: string;
}

/**
 * `section_name` (as `foldCompleteness`/the result-detail validation returns it) -> result-detail
 * child route + card label. Carries BOTH portfolios' section names — `theory-of-change` /
 * `partners` / `links-to-results` (P22) and `contributor-partners` (P25) — because a card's
 * `missing` array is whatever the server's v2 validation returned for THAT result's portfolio,
 * and this map has no way to know which portfolio produced it. All routes below exist as children
 * of `result-detail/:id` in `shared/routing/routing-data.ts` (`resultDetailRouting`).
 */
export const MY_WORK_SECTION_MAP: Readonly<Record<string, MyWorkSection>> = Object.freeze({
  'general-information': { route: 'general-information', label: 'General information' },
  'theory-of-change': { route: 'theory-of-change', label: 'Theory of change' },
  'geographic-location': { route: 'geographic-location', label: 'Geographic location' },
  partners: { route: 'partners', label: 'Partners' },
  'contributor-partners': { route: 'contributor-partners', label: 'Contributing partners' },
  'links-to-results': { route: 'links-to-results', label: 'Links to results' },
  evidences: { route: 'evidences', label: 'Evidence' },
  'policy-change1-info': { route: 'policy-change1-info', label: 'Policy change' },
  'innovation-use-info': { route: 'innovation-use-info', label: 'Innovation use' },
  'cap-dev-info': { route: 'cap-dev-info', label: 'Capacity sharing' },
  'knowledge-product-info': { route: 'knowledge-product-info', label: 'Knowledge product' },
  'innovation-dev-info': { route: 'innovation-dev-info', label: 'Innovation development' }
});

/** Fallback route when the mapping is unknown or completeness is `null` (`MWB-R-6`). */
export const MY_WORK_DEFAULT_ROUTE = 'general-information';

/**
 * First `missing` section name mapped to a known route, in the order the server returned them;
 * `'general-information'` when `missing` is empty/null/undefined or every entry is unmapped
 * (`MWB-R-6`).
 */
export function firstMissingRoute(missing: string[] | null | undefined): string {
  for (const name of missing ?? []) {
    const section = MY_WORK_SECTION_MAP[name];
    if (section) return section.route;
  }
  return MY_WORK_DEFAULT_ROUTE;
}

/** Display label for one `section_name`; an unmapped name is returned verbatim as a safe fallback
 *  (the mapper/view-model never lets an unknown name reach the missing-labels list in practice). */
export function sectionLabel(name: string): string {
  return MY_WORK_SECTION_MAP[name]?.label ?? name;
}
