/**
 * P2-3840 — user-facing strings of IPSR Step 2.1 (candidate table + selected bundle list).
 * Kept out of the templates so a wording pass edits this file only. The modal keeps its own copy.
 */
export const COMPLEMENTARY_INNOVATION_COPY = {
  searchPlaceholder: 'Find innovation by code, title or lead',
  select: 'Add to the bundle',
  deselect: 'Remove from the bundle',
  openResult: 'Open result in a new tab',
  total: (shown: number, all: number) => `Total: ${shown} / ${all}`,
  noMatches: 'There are no results for the selected filters.',

  selectedTitle: 'Selected for the bundle',
  selectedCount: (count: number) => `${count} selected`,
  selectedEmpty: 'No complementary innovation/ enabler/ solution selected yet',
  createdKind: 'Created in IPSR',
  prmsKind: 'PRMS result',
  view: 'View',
  edit: 'Edit',
  remove: 'Remove from the bundle'
};
