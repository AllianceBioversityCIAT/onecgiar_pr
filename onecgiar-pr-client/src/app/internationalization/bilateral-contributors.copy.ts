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
  /** P2-3859 — one Center pill per Center that owns projects, inside the "Contributing W3/bilateral projects" panel, under its search box. */
  projectFilter: {
    /** Accessible name of the pill group (the pills themselves only show the acronym and a count). */
    groupLabel: 'Filter projects by Center',
    allCenters: 'All centers',
    count: (n: number): string => `(${n})`,
    /** Tooltip + accessible name of a pill: the pill itself only shows the acronym, so the full name lives here. */
    pillTitle: (centerName: string, n: number): string => `${centerName} (${n} ${n === 1 ? 'project' : 'projects'})`,
    /** The projects picker placeholder, which used to promise "all" projects even when filtered. */
    pickerPlaceholderAll: 'The drop-down list includes all bilateral projects',
    pickerPlaceholderFiltered: (centerAcronym: string): string => `The drop-down list includes the projects of ${centerAcronym}`
  }
} as const;
