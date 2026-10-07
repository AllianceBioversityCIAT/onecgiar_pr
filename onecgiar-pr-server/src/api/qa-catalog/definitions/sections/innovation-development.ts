// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-9 · inventory 2026-A §5 T-3 (`innovation_development`, page IDI). Keys frozen as written in the inventory.
// QAC-T-18 (owner field list 2026-10-07, prtest result 9765 phase 36; catalog 2026.17): the section is fully parametrized for
// RESULTS: `visible_when` / `required_when` per field from the 2026 client form, the question tree as closed lists + subfields, and the
// three investment tables as lists with their USD value and "yet to be determined" flag (lifts the D2 deferral).
// The annual-updating block (`general.*`) is owned by C-1 (QAC-T-8) and is not repeated here.
//
// Citation legend (client paths under onecgiar-pr-client/src/app/):
//   IDI.html = pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.html
//   SA.html  = .../innovation-dev-info/components/stage-assessment/stage-assessment.component.html (SA.ts = .ts)
//   IPC.html = .../components/intellectual-property-considerations/intellectual-property-considerations.component.html
//   TD.html  = .../components/innovation-team-diversity/innovation-team-diversity.component.html
//   EST.html = .../components/estimates/estimates.component.html
//   RB.html  = custom-fields/pr-radio-button/pr-radio-button.component.html
//   FM       = shared/services/fields-manager.service.ts
//   V-ID     = tmp/validation_innovation_dev_P25 (live P25 function; `required_confirmed: true` only when it also states the rule)
// `required` / `required_when` follow the 2026 FORM (owner decision 2026-10-07, option B): a control the form marks required (the
// shared components default `required = true`: pr-input, pr-select, pr-textarea, pr-yes-or-not, pr-radio-button, pr-field-header)
// is required here even when V-ID does not check it; `required_confirmed` is true only when V-ID states it as well.
//
// QUESTION TREE. Question-backed rows bind to `result_answers` (one row per answered option, `answer_boolean = 1`, `is_active = 1`;
// D27), saved by innovation_dev.service.ts `saveOptionsAndSubOptions` (the chosen radio gets `answer_boolean = true`, ticked
// checkboxes `answer_boolean = true`, free text in `answer_text`; a re-answer deactivates the older row). The relation filter only
// filters `result_answers`, and the question an option belongs to lives on `result_questions` (an excluded table), so the control
// list key carries the parent question: one list per question (`question_options_<question>`), the same decision as T-9.
//  - Team diversity (question 112; options 113/114/115; children of 113 = 116..121): ids are IDENTICAL in test and prod (owner check
//    2026-10-06/07: Innovation P25 questions 101-121, 138, 147-149, execution.md "result_questions check run by the owner in test and
//    prod"), so both lists are CLOSED (closed-control-lists.ts) and conditions compare ids. No migration in this repository seeds them
//    (they were cloned from the P22 rows by 1762398554711-PopulateDataResultQuestions without literal ids).
//  - GESI stage, risk stage and the consolidated IPR question are NOT in that verified set: they were inserted by
//    1787842155469-AddGesiRiskStageQuestionsP25 / 1788441000000-AddConsolidatedIprQuestionP25 with AUTO_INCREMENT ids, and the client,
//    the server (innovation-dev-questions.const.ts) and V-ID:26-62 all resolve them BY TEXT because the ids may differ per environment.
//    Their lists are therefore reference lists (not closed, ids never named in a condition). The one rule that depends on an option
//    ("Why?" for "Not applicable") is expressed on the option's LABEL, which is what the client (SA.ts NOT_APPLICABLE_LABEL) and V-ID:395
//    compare: each stage field carries a read-only `option_label` subfield (lookup of the chosen option's `question_text`).
//
// Not expressible / not stored, recorded (not invented):
//  - The readiness-diminished notice (IDI.html:192-196) is DERIVED (current level vs the previous report's level,
//    results-innovations-dev.repository.ts:353 `previous_irl`), not a stored field: skipped.
//  - The 2026 IPR block is ONE question (Yes / Not sure / No); its follow-ups (entry points text, formal IPR, IP expert support) belong to the
//    2025 form (`app-intellectual-property-rights`, IDI.html:139) and are not rendered in 2026 (IDI.html:134-142), so they are not catalogued.
//    The Yes / Not sure notice is help text, carried as the field description.
//  - Phase-gated 2026 removals stay out of the catalog: anticipated innovation user (IDI.html:52-54), evidence of user need (:63-76),
//    Megatrends (:78-83), GESI / risk open questions, assumptions and partners-policies (:106-130), scaling studies (:207-225) and the
//    reference materials (:230-232; `isInnovationReferenceMaterialsRemoved2026`). Their columns are NOT_FOR_QA / not catalogued.
//  - Investment tables: the form lists the BUDGET rows (one per active parent row, EST.html:21,74,147); each list is modelled on the PARENT
//    row (initiative / project / institution, active) with the budget row reached by a path, which is also how V-ID:644-680 iterates.
//    The same tables serve the investment blocks of innovation use and IPSR step 4 (cataloged separately).
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PathBinding,
} from '../types';
import { FROM_2026, whenEq, whenIn } from './shared';

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

/** Option label that reveals the stage questions' reason (SA.ts `NOT_APPLICABLE_LABEL`; V-ID:395). */
const NOT_APPLICABLE_LABEL = 'Not applicable';

/** Typology (`innovation_nature_id`, stored as the typology CODE) of a variety or breed (IDI.html:30). */
const VARIETY_NATURE = 12;

/** `result_questions` ids of the team-diversity question (owner-verified identical in test and prod). */
const TEAM_DIVERSITY_YES_ACTIONS = 113;
const TEAM_DIVERSITY_OTHER_ACTION = 121;

const answerBinding = () => ({
  kind: 'relation' as const,
  table: 'result_answers',
  fk_to_result: 'result_id',
  value_column: 'result_question_id',
  filter: { answer_boolean: 1, is_active: 1 },
});

/**
 * The OTHER active answered rows of the same result, reached from the parent option's row (DD-12: a subfield path starts at the
 * parent row, here a `result_answers` row). Which question they belong to is carried by the subfield's control list (closed ids).
 */
const sameResultAnswers = (
  valueColumn: string,
  filter: PathBinding['steps'][number]['filter'] = {
    answer_boolean: 1,
    is_active: 1,
  },
): PathBinding => ({
  kind: 'path',
  steps: [
    {
      table: 'result_answers',
      join: [{ from: 'result_id', to: 'result_id' }],
      filter,
    },
  ],
  value_column: valueColumn,
});

/** Read-only label of the option a stage question's answer row points at (reference text of `result_questions`). */
const chosenOptionLabel = (questionKey: string): CatalogSubField => ({
  key: 'option_label',
  label: 'Selected option',
  type: 'text',
  required: false,
  storage: {
    kind: 'lookup',
    source: 'prms.result_questions',
    keys: [{ from: questionKey, to: 'result_question_id' }],
    value_column: 'question_text',
  },
});

const whenNotApplicable = whenEq('option_label', NOT_APPLICABLE_LABEL);

/** SA.html:26-33: "Why?" box (`[required]="true"`, max 50 words) shown only when "Not applicable" is selected; V-ID:388-397. */
const notApplicableReason = (label: string): CatalogSubField => ({
  key: 'not_applicable_reason',
  label,
  type: 'text',
  required: false,
  visible_when: whenNotApplicable,
  required_when: whenNotApplicable,
  // answer_text of the "Not applicable" option row (the chosen row of the parent relation)
  storage: {
    kind: 'column',
    table: 'result_answers',
    column: 'answer_text',
  },
});

// ---- investment tables (EST.html) -------------------------------------------------------------------------------------------------
// V-ID:636-680 reads each budget row as: `is_determined` not TRUE => `kind_cash` (NULL counts as 0) >= 0, so NO value is required by the
// function; the form marks the USD input optional (`[required]="false"`, EST.html:38,99,166) and shows a "missing" alert when neither a value
// nor "yet to be determined" is given (`checkValueAlert`, estimates.component.ts:56-66). That either-or cannot be written with the condition vocabulary (no
// negation of `eq`, NULL vs false), so `kind_cash` stays `required: false`. The "yet to be determined" control is a one-option radio whose
// only meaning is the either-or above (EST.html:43-48), so it is `required: false` too: the component's default marker is not a
// requirement to tick it.
export const budgetValue = (
  budgetTable: string,
  parentFk: string,
  valueColumn: string,
): PathBinding => ({
  kind: 'path',
  steps: [
    {
      table: budgetTable,
      join: [{ from: 'id', to: parentFk }],
      filter: { is_active: 1 },
    },
  ],
  value_column: valueColumn,
});

const budgetSubfields = (
  budgetTable: string,
  parentFk: string,
): CatalogSubField[] => [
  {
    // EST.html:33-39 / 94-100 / 161-167: "Total USD Value (in-cash + in-kind)", currency input, `[required]="false"`
    key: 'kind_cash',
    label: 'Total USD Value (in-cash + in-kind)',
    type: 'number',
    required: false,
    storage: budgetValue(budgetTable, parentFk, 'kind_cash'),
  },
  {
    // EST.html:43-48 / 104-109 / 171-176: single option of the radio
    key: 'is_determined',
    label: 'This is yet to be determined',
    type: 'boolean',
    required: false,
    storage: budgetValue(budgetTable, parentFk, 'is_determined'),
  },
];

export const INNOVATION_DEVELOPMENT_FIELDS: CatalogField[] = [
  {
    key: 'innovation_dev.short_title',
    label: 'Provide a short name for the innovation',
    type: 'text',
    section: SECTION,
    order: 1,
    result_types: TYPES,
    // IDI.html:9 + FM:285-288 (`required: isP25()`, max 10 words); V-ID:69 valid_text
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
    // IDI.html:11-19 (pr-select, default required); V-ID:70
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
      'Choose ‘other’ if you feel the Innovation does not fit well with the proposed categories.',
    type: 'single_select',
    control_list: 'innovation_types',
    section: SECTION,
    order: 3,
    result_types: TYPES,
    // IDI.html:20-29 (pr-select, default required; the option value is the typology `code`); V-ID:71
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
    // IDI.html:30-35 (`innovation_nature_id == 12` gates the block; pr-yes-or-not default required); V-ID:72-73
    required: false,
    required_confirmed: true,
    visible_when: whenEq('innovation_dev.nature', VARIETY_NATURE),
    required_when: whenEq('innovation_dev.nature', VARIETY_NATURE),
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'is_new_variety' },
  },
  {
    key: 'innovation_dev.number_of_varieties',
    label: 'Indicate the number of individual new or improved lines/ varieties',
    type: 'number',
    section: SECTION,
    order: 5,
    result_types: TYPES,
    // IDI.html:37-44: shown inside the typology block when `is_new_variety`; the form marks it optional (`[required]="false"`, IDI.html:40) but
    // V-ID:74 requires a value > 0 when `is_new_variety = TRUE` (owner D12), so the function's rule is the one recorded (a green check
    // cannot be reached without it). Form and function disagree: reported.
    required: false,
    required_confirmed: true,
    visible_when: {
      all: [
        whenEq('innovation_dev.nature', VARIETY_NATURE),
        whenEq('innovation_dev.is_new_variety', true),
      ],
    },
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
    // IDI.html:96-100 (stage-assessment q1; SA.html:17 pr-radio-button default required); V-ID:369-376 (one option answered per stage question)
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    subfields: [
      notApplicableReason('Why?'),
      chosenOptionLabel('innovation_dev.gesi_stage'),
    ],
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
    // IDI.html:101-104 (stage-assessment q2); V-ID:369-376
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    subfields: [
      notApplicableReason('Why?'),
      chosenOptionLabel('innovation_dev.risk_stage'),
    ],
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
    // IDI.html:134-138 -> IPC.html:12-21 (pr-radio-button default required, options Yes / Not sure / No); V-ID:502-517 (2026 branch:
    // one option marked under the consolidated question)
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
    // IDI.html:144-151 (`[required]="false"`); stored as ONE free-text value (innovation_developers), not a list. No live rule.
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'innovation_developers' },
  },
  {
    key: 'innovation_dev.collaborators',
    label: 'Innovation collaborators',
    description:
      'Provide the full name(s), email address and organizational affiliation(s) of other CGIAR and/or partner colleagues that contribute to this innovation Names of key contributors will feature as co-authors on the Innovation Profile document in the same order as provided below. Standard format for entering collaborators: Please enter each collaborator using the following format: Collaborator Name (email address). If you register more than one collaborator, separate them using a semicolon (;). Example: Michael Thompson (m.thompson@innovationlab.org); Aisha Rahman (a.rahman@globalresearch.net)',
    type: 'text',
    section: SECTION,
    order: 10,
    result_types: TYPES,
    // IDI.html:153-159 (`[required]="false"`). No live rule.
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
    // IDI.html:161 -> TD.html:5-13 (pr-radio-button default required; options 113 / 114 / 115 = children of question 112); V-ID:522-531, 559-568
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: answerBinding(),
    subfields: [
      {
        // RB.html:92-107: the checkboxes show under the option that has sub-options (113) while it is selected; V-ID:569-587 requires
        // >= 1 ticked child when 113 is answered
        key: 'actions',
        label: 'Multiple answers can be selected.',
        type: 'multi_select',
        control_list: 'question_options_team_diversity_actions',
        required: false,
        visible_when: whenEq(
          'innovation_dev.team_diversity',
          TEAM_DIVERSITY_YES_ACTIONS,
        ),
        required_when: whenEq(
          'innovation_dev.team_diversity',
          TEAM_DIVERSITY_YES_ACTIONS,
        ),
        // the ticked rows (`answer_boolean = 1`) of the same result; the closed list restricts them to the children of 113 (116..121)
        storage: sameResultAnswers('result_question_id'),
      },
      {
        // RB.html:108-114: the text box of the "Other" checkbox (disabled until ticked; pr-input default required); V-ID:588-607
        key: 'other_text',
        label: 'Other',
        type: 'text',
        required: false,
        visible_when: whenIn('actions', [TEAM_DIVERSITY_OTHER_ACTION]),
        required_when: whenIn('actions', [TEAM_DIVERSITY_OTHER_ACTION]),
        storage: sameResultAnswers('answer_text', {
          result_question_id: TEAM_DIVERSITY_OTHER_ACTION,
          answer_boolean: 1,
          is_active: 1,
        }),
      },
    ],
  },
  {
    key: 'innovation_dev.readiness_level',
    label: 'How would you assess the current readiness of this innovation?',
    description:
      'In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided. Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation. The innovation readiness level will be quality assessed. YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW INNOVATION READINESS CALCULATOR',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: SECTION,
    order: 12,
    result_types: TYPES,
    // IDI.html:163-174 (pr-field-header default required, pr-range-level 0-9); V-ID:76
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
      'Example: We chose readiness level 6 (semi-controlled testing) for the genetically improved farm tilapia (GIFT) because it is currently being tested under semi-controlled conditions in the multiplication center and hatchery in the selected countries as shown in the provided evidence.',
    type: 'text',
    section: SECTION,
    order: 13,
    result_types: TYPES,
    // IDI.html:198-204 (pr-textarea default required, max 50 words); V-ID:77
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'evidences_justification',
    },
  },
  {
    key: 'innovation_dev.estimates_pooled',
    label:
      'Estimation of total USD-value of pooled investment by CGIAR Science Program/Accelerator during the reporting period',
    description:
      'Innovation development team estimates the total investment (in-cash + in-kind) in innovation development made by the leading Science Program/Accelerator and the contributing Science Program/Accelerator during the reporting period. Includes Science Program/Accelerator funds allocated to CGIAR and/or partners. Innovation development team works with contributing Science Program/Accelerator to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing Science Program/Accelerator during the reporting period.',
    type: 'list',
    section: SECTION,
    order: 14,
    result_types: TYPES,
    // IDI.html:228 -> EST.html:1-55 (one row per active initiative row, any role); V-ID:633-648 reads no value as required
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_inititiative',
      fk_to_result: 'result_id',
      value_column: 'inititiative_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'program',
        label: 'Science Program/Accelerator',
        type: 'single_select',
        control_list: 'initiatives',
        // identity of the element
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_inititiative',
          column: 'inititiative_id',
        },
      },
      ...budgetSubfields('result_initiative_budget', 'result_initiative_id'),
    ],
  },
  {
    key: 'innovation_dev.estimates_non_pooled',
    label:
      'Estimated total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period',
    description:
      'Innovation development team works with W3/ bilateral projects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing W3/ Bilaterals during the reporting period. Includes W3/ Bilateral funds allocated to CGIAR and/or partners',
    type: 'list',
    section: SECTION,
    order: 15,
    result_types: TYPES,
    // EST.html:57-130 (one row per active project row; projects are added in Contributors & partners); V-ID:650-666
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_projects',
      fk_to_result: 'result_id',
      value_column: 'project_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'project',
        label: 'Non-pooled project',
        type: 'single_select',
        control_list: 'projects',
        // identity of the element
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_projects',
          column: 'project_id',
        },
      },
      ...budgetSubfields('non_pooled_projetct_budget', 'result_project_id'),
    ],
  },
  {
    key: 'innovation_dev.estimates_partners',
    label:
      'Estimated total USD-value of (co-)investment by partners during the reporting period',
    description:
      'Innovation development team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period. This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR Science Program/Accelerator or projects',
    type: 'list',
    section: SECTION,
    order: 16,
    result_types: TYPES,
    // EST.html:132-198 (one row per active institution row, any role; partners are added in Contributors & partners); V-ID:668-684
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'institution',
        label: 'Partner',
        type: 'single_select',
        control_list: 'institutions',
        // identity of the element
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_institution',
          column: 'institutions_id',
        },
      },
      {
        // read-only "Institution type" shown under the partner name (EST.html:155-158)
        key: 'partner_type',
        label: 'Institution type',
        type: 'single_select',
        control_list: 'institution_types',
        required: false,
        storage: {
          kind: 'lookup',
          source: 'clarisa.institutions',
          keys: [{ from: 'institution', to: 'id' }],
          value_column: 'institution_type_code',
        },
      },
      ...budgetSubfields('result_institutions_budget', 'result_institution_id'),
    ],
  },
];
