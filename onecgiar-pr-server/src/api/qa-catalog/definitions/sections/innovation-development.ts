// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-9 · inventory 2026-A §5 T-3 (`innovation_development`, page IDI). Keys frozen as written in the inventory.
// The annual-updating block (`general.*`) is owned by C-1 (QAC-T-8) and is not repeated here.
//
// Question-backed rows (`gesi_stage`, `risk_stage`, `ipr_consideration`, `team_diversity`) bind to
// `result_answers` (one row per answered option, `answer_boolean = 1`, active; D27). The filter of a
// relation binding only filters its own table, and the question an option belongs to lives on
// `result_questions`, so the control list key carries it: one list per question
// (`question_options_<question>`), instead of the inventory's shared `question_options` (decision T-9).
// Question ids are identical in test and prod (REVIEW R3); the options themselves are DB rows.
//
// Deferred by D2 (2-hop through a parent row) to PENDING_CATALOG:
// `estimates_pooled|non_pooled|partners` and their `kind_cash` / `is_determined` subfields. The budget tables
// (`result_initiative_budget`, `non_pooled_projetct_budget`, `result_institutions_budget`) are in CATALOG_SCOPE and
// their `kind_cash` / `is_determined` columns are in PENDING_CATALOG; they reach the result through
// `results_by_inititiative` / `results_by_projects` / `results_by_institution`.
// `non_pooled_projetct_budget` does not match the guard's result-table pattern, so only its presence in scope covers it.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026, whenEq } from './shared';

export const INNOVATION_DEVELOPMENT_SECTION: CatalogSection = {
  key: 'innovation_development',
  label: 'Innovation development',
  order: 50,
  result_types: ['innovation_development'],
  ...FROM_2026,
};

const SECTION = INNOVATION_DEVELOPMENT_SECTION.key;
const TABLE = 'results_innovations_dev';
const TYPES = ['innovation_development'];

const answerBinding = () => ({
  kind: 'relation' as const,
  table: 'result_answers',
  fk_to_result: 'result_id',
  value_column: 'result_question_id',
  filter: { answer_boolean: 1, is_active: 1 },
});

const notApplicableReason = (label: string) => ({
  key: 'not_applicable_reason',
  label,
  type: 'text' as const,
  required: false,
  // answer_text of the "Not applicable" option row; required only when that option is chosen
  // (subfields carry no `required_when`; the rule stays on the inventory row).
  storage: {
    kind: 'column' as const,
    table: 'result_answers',
    column: 'answer_text',
  },
});

export const INNOVATION_DEVELOPMENT_FIELDS: CatalogField[] = [
  {
    key: 'innovation_dev.short_title',
    label: 'Provide a short name for the innovation',
    type: 'text',
    section: SECTION,
    order: 1,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'short_title' },
  },
  {
    key: 'innovation_dev.characterization',
    label: 'What would be the best way to characterize this innovation?',
    type: 'single_select',
    control_list: 'innovation_characteristics',
    section: SECTION,
    order: 2,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'innovation_characterization_id',
    },
  },
  {
    key: 'innovation_dev.nature',
    label:
      'Which of the below typologies best fits the nature of the innovation?',
    description:
      "Choose 'other' if you feel the Innovation does not fit well with the proposed categories.",
    type: 'single_select',
    control_list: 'innovation_types',
    section: SECTION,
    order: 3,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'innovation_nature_id' },
  },
  {
    key: 'innovation_dev.is_new_variety',
    label: 'Are you profiling a new or improved variety or breed?',
    type: 'boolean',
    section: SECTION,
    order: 4,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    // 12 = code of the variety/breed typology.
    required_when: whenEq('innovation_dev.nature', 12),
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'is_new_variety' },
  },
  {
    key: 'innovation_dev.number_of_varieties',
    label: 'Indicate the number of individual new or improved lines/ varieties',
    // D12: required (> 0) when the innovation is a new or improved variety or breed; the form shows no required marker.
    type: 'number',
    section: SECTION,
    order: 5,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('innovation_dev.is_new_variety', true),
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'number_of_varieties' },
  },
  {
    key: 'innovation_dev.gesi_stage',
    label:
      'What is the current stage of GESI consideration for this innovation?',
    type: 'single_select',
    control_list: 'question_options_gesi_stage',
    section: SECTION,
    order: 6,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    subfields: [notApplicableReason('Why?')],
  },
  {
    key: 'innovation_dev.risk_stage',
    label:
      'What is the current stage of negative impact/risk assessment for this innovation?',
    type: 'single_select',
    control_list: 'question_options_risk_stage',
    section: SECTION,
    order: 7,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    subfields: [notApplicableReason('Why?')],
  },
  {
    key: 'innovation_dev.ipr_consideration',
    label:
      'Do you have any Intellectual Property considerations for this innovation?',
    description:
      "Answering Yes or Not sure will trigger an automatic email to the lead Center's IP focal point when you submit this result. They will contact you directly.",
    type: 'single_select',
    control_list: 'question_options_ipr',
    section: SECTION,
    order: 8,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
  },
  {
    key: 'innovation_dev.developers',
    label: 'Innovation Developer',
    description:
      "This field is prepopulated with the Lead Contact person's information. If you wish to change it, remove the existing entry and replace it with the Innovation Developer's email or full name.",
    type: 'text',
    section: SECTION,
    order: 9,
    result_types: TYPES,
    // No live rule (REVIEW D12 b): optional, stage 1, not confirmed.
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'innovation_developers' },
  },
  {
    key: 'innovation_dev.collaborators',
    label: 'Innovation collaborators',
    description:
      'Provide the full name(s), email address and organizational affiliation(s) of other CGIAR and/or partner colleagues that contribute to this innovation. Standard format "Collaborator Name (email address)", separated by ";".',
    type: 'text',
    section: SECTION,
    order: 10,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'innovation_collaborators',
    },
  },
  {
    key: 'innovation_dev.team_diversity',
    label:
      'Innovation team diversity - Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?',
    type: 'single_select',
    control_list: 'question_options_team_diversity',
    section: SECTION,
    order: 11,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    // Conditions stay on the inventory rows: `actions` is required (>= 1) when option 113 ("Yes, concrete
    // actions...") is answered; `other_text` is required when "Other" (121) is ticked.
    subfields: [
      {
        key: 'actions',
        label: 'Multiple answers can be selected.',
        type: 'multi_select',
        control_list: 'question_options_team_diversity_actions',
        required: false,
        storage: {
          kind: 'column',
          table: 'result_answers',
          column: 'result_question_id',
        },
      },
      {
        key: 'other_text',
        label: 'Other',
        type: 'text',
        required: false,
        storage: {
          kind: 'column',
          table: 'result_answers',
          column: 'answer_text',
        },
      },
    ],
  },
  {
    key: 'innovation_dev.readiness_level',
    label: 'How would you assess the current readiness of this innovation?',
    description:
      'In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: SECTION,
    order: 12,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'innovation_readiness_level_id',
    },
  },
  {
    key: 'innovation_dev.readiness_justification',
    label:
      'Please provide a brief explanation that explains how the provided evidence (inputted in the Evidence section) justifies the chosen innovation readiness level',
    description:
      'Max 50 words. Example: We chose readiness level 6 (semi-controlled testing) for the genetically improved farm tilapia (GIFT).',
    type: 'text',
    section: SECTION,
    order: 13,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'evidences_justification',
    },
  },
];
