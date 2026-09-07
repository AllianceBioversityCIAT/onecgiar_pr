// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-R-19)
/**
 * `Bilateral review` tab — string map (NFR i18n: American English, centralized copy).
 * `docs/specs/changes/sp-bilateral-review-tab/requirements.md` BRT-R-19; `design.md` §6.2/§6.3.
 */
export const BILATERAL_REVIEW_COPY = {
  tabLabel: 'Bilateral review',
  badgeAriaLabel: (pendingCount: number): string => `${pendingCount} pending review`,
  /** Band explainer panel entry (`activeTabInfo()`), tone-matched to the sibling tabs. */
  explainer: {
    title: 'Bilateral review',
    description:
      'Lists W3/Bilateral results that centers have reported to this program, grouped by bilateral project. Program reviewers approve or reject pending contributions here.'
  }
};
