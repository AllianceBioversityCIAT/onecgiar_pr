/**
 * W3/Bilateral "Contributors & partners" section — centralized user-facing copy (R37).
 * A later multilingual pass edits this file instead of hunting templates.
 */

/**
 * P2-3865 — CLARISA glossary definition of "contributor", verbatim (checked against the CLARISA
 * glossary on 30-Sep-2026). If CLARISA rewords it, update it here and nowhere else.
 */
const CONTRIBUTOR_DEFINITION =
  'Partners that made a significant contribution to the achievement of a result. This could take many forms and the ' +
  'threshold for inclusion is that the result would not have been achieved or reported in its current form without their support.';

const DIFFERENT_ENTITIES_NOTE =
  'Only select contributors that are different from the one reporting this result: a different Program/Accelerator, ' +
  'a different W3/bilateral project and a different CGIAR Center.';

const NOTE_TITLE = 'What is a contributor?';
const GLOSSARY_LINK_LABEL = 'CLARISA glossary';

export const BILATERAL_CONTRIBUTORS_COPY = {
  contributorNote: {
    title: NOTE_TITLE,
    definition: CONTRIBUTOR_DEFINITION,
    differentEntities: DIFFERENT_ENTITIES_NOTE,
    glossaryLinkLabel: GLOSSARY_LINK_LABEL,
    /**
     * The whole note as the HTML `app-alert-status` renders through `[innerHTML]` (same channel the
     * partner-request alert already uses for its link). Informative only — it never gates saving.
     */
    html: (glossaryUrl: string): string =>
      `<strong>${NOTE_TITLE}</strong> ${CONTRIBUTOR_DEFINITION} ` +
      `(<a href="${glossaryUrl}" target="_blank" rel="noopener noreferrer">${GLOSSARY_LINK_LABEL}</a>)<br />` +
      DIFFERENT_ENTITIES_NOTE
  },
  /** P2-3859 — Center filter above "Contributing W3/bilateral projects". */
  projectFilter: {
    label: 'Filter projects by Center',
    allCenters: 'All centers',
    placeholder: 'Select a Center',
    count: (shown: number, total: number): string => `${shown} of ${total} projects`,
    /** The projects picker placeholder, which used to promise "all" projects even when filtered. */
    pickerPlaceholderAll: 'The drop-down list includes all bilateral projects',
    pickerPlaceholderFiltered: 'The drop-down list includes the projects of the selected Center'
  }
} as const;
