/**
 * Night sweep 2026-09-23 (W12-1 / W12-2) — what a W1/W2 result-detail section tells the person
 * when its own GET failed. The form is blank for a reason that has nothing to do with what is
 * stored, and saving that blank body would wipe the stored record (the server reads an empty list
 * or an absent count as "delete" / "0"), so Save is turned off until the page is reloaded.
 *
 * Wording mirrors the bilateral sections' `LOAD_ERROR_NOTE` (P2-3556, e.g.
 * `pages/bilateral/components/section-type-specific/type-capacity-sharing/type-capacity-sharing.component.ts`)
 * so the two routes explain the same failure the same way.
 */
export const RESULT_DETAIL_SECTION_LOAD_COPY = {
  loadErrorNote:
    'We could not load the information saved for this section, so the fields below are empty and saving is turned off. ' +
    'Please reload the page to try again — the information reported earlier has not been changed.',
  /**
   * Night sweep 2026-09-23 (R-2 / R-3) — the bilateral editor's wording, word for word the
   * `LOAD_ERROR_NOTE` the P2-3556 bilateral sections already show, for the bilateral sections that
   * now get the same gate (Evidence, Geography).
   */
  bilateralLoadErrorNote:
    'We could not load the information saved for this section, so the fields below are empty and nothing typed here will be saved. ' +
    'Please reload the page to try again — the information reported earlier has not been changed.'
};
