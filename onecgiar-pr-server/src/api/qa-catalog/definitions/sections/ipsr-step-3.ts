// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.7 (IPSR step 3, S3 / S3W / S3X). Keys frozen as written there.
// QAC-T-30 (2026.29): the evidence lists, the current use of the core innovation and the evidence-based levels of the complementary
// elements are catalogued; the visibility of the current-level table follows the workshop answer.
//
// Client citations (2026 form), paths under onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/
// ipsr-innovation-use-pathway/pages/step-n3/: S3 = step-n3.component.html / .ts, S3W = components/step-n3-assessed-expert-workshop/
// (component html), S3X = components/step-n3-complementary-innovations/ (html / ts), S3C = components/step-n3-current-use/ (html),
// S3E = components/ipsr-step3-evidence-list/ (html / ts). VS3 = tmp/validation_ipsr_step_three_P25, VS1 = tmp/validation_ipsr_step_one_P25.
//
// Elements. `result_by_innovation_package` has one row per element: role 1 = core innovation, role 2 = complementary element; both are one
// hop from the package (`result_innovation_package_id`), so a role filter selects the element.
//
// Evidence lists (`*.readiness_evidences` / `*.use_evidences`). The links live in `result_ip_step_three_evidence` (entity added in QAC-T-30;
// one row per evidence, `ipsr_evidence_level` = 'readiness' | 'use', `result_by_innovation_package_id` = the element) and the evidence in
// `evidence` (type 7). An element of the list is an ACTIVE evidence row of that type reached through an ACTIVE link of that level (a
// deactivated evidence keeps its link row, evidences.repository.ts:576-586, so the last path step filters the evidence too); the
// subfields read the evidence row (`evidence.*`) and the uploaded file (`evidence_sharepoint`, newest active row), as in `evidence.items`.
// Subfield rules (S3E dialog): the source (link / upload) is a radio, always answered (default `required`); the link is `[required]="true"`
// for the link source; for an upload the public-sharing answer, the file and, once stored, its repository URL are required. Tags and the
// details are optional (`[required]="false"`). The 5 impact-area tags and the Innovation Use tag are always shown (no tag-level gate: the
// cross-section warning for a principal impact area without tagged evidence, S3:7-12, is documented, not a data condition). `file` of
// inventory §3.7 is split into `file_name` + `file_url` exactly as the owner decided for `evidence.items` (QAC-T-17).
//   - Cap: at most 6 evidences per element, readiness and use together (IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT, S3E). Not expressible.
//   - Level gate, NOT EXPRESSIBLE (documented gap): the lists are required when the element's level is not 0 (S3:38,55; S3X:34,53; the
//     form reads "index in the ordered CLARISA list != 0", an unset level counts as != 0; VS3:19-47 and VS3:231-264 read `clarisa_*.level`
//     != 0 and, for the complementary elements, also a NULL level). The stored value is the level ROW id, and the ids are NOT the level
//     numbers and differ by environment (read 2026-10-09 on the test DB: use levels id 1..10 = level 0..9 plus ids 13..20 = levels 2..9
//     again; readiness levels id 11..20 = level 0..9), so no `in` list over the ids is valid in every environment, the closed-list
//     vocabulary has no `not` and the level lists are not closed lists. An `in [1..9]` over level numbers (the D28 convention of
//     innovation_use.use_level) would compare numbers with ids and flag/hide the wrong rows, so no condition is stated: the lists are
//     `required: false, required_confirmed: true` (the function states the rule) and the lists are always shown (the form always renders
//     them, only the `required` marker changes, S3E header).
//   - Legacy columns: the first evidence of each level is dual-written to `readinees_evidence_link` / `use_evidence_link` /
//     `readiness_details_of_evidence` / `use_details_of_evidence` of the element row, and VS3 tests THOSE columns (VS3:19-47, 231-264), not
//     the list. They stay PENDING_CATALOG (not NOT_FOR_QA): packages without link rows (saved before P2-3824, no backfill, migration
//     1790347604000:25-26; or carried over to a new phase, evidences.repository.ts:23-29) hold their only evidence there, the form shows it
//     as the first "legacy" item (innovation-pathway-step-three.service.ts:1030-1050, ipsr-step3-evidence-list.component.html:97-101)
//     and the function validates it, so their list is empty while the function passes.
//
// Current use of the core innovation (`core.current_use.actors|organizations|measures`): rows of `result_ip_result_actors`,
// `result_ip_result_institution_types` (role 6) and `result_ip_result_measures`, 2-hop from the result through the core element
// (`path`). Same subfields and row rules as the step 1 targeted use (the shared form with isIpsr) PLUS the per-row evidence link
// (S3C:85-86,142-143,173-174; VS3:62-103,147-192 and VS3:108-131,193-217 test it for actors and organizations; for measures only inside the any-of
// group, VS3:143, while the form marks it `[required]="true"`): `required: true` on every row. Union form + function: `other_actor_type`
// and `other_institution` are required for the type 5 / 78 although the step 3 form marks the actor one `[required]="false"` (S3C:24,
// VS3:62-103,147-192 / VS3:193-217). The any-of rule across the three lists (VS3:49-146: with a use level != 0 at least one complete
// entry in actors / organizations / measures; once rows exist every active row must be complete, VS3:147-230) is not expressible
// (there is no "at least one of the sibling lists" operator), so the lists are `required: false, required_confirmed: true`. The block
// is hidden when the core use level is 0 (S3:61-63): not expressible for the id reason above, so the lists carry no `visible_when`
// (documented gap: a consumer must treat the three lists as not applicable when the core use level is 0; the server also deactivates
// the rows of a level 0, innovation-pathway-step-three.service.ts:665,754,829). "Organization" and "Sub-type" write the same column:
// one subfield `institution_type` with the 2-level list `institution_types` (REVIEW D3 (a), as in step 1).
//
// Levels (VS3:8-18): invalid only when BOTH core evidence-based levels are empty. The form marks both required (feedback markers
// S3:28-29,47-48: `!== null`), so Option B (form union function) gives `required: true`; the function states only the weaker "at
// least one", so `required_confirmed: false`. The complementary evidence-based levels are required by the form (green check S3X:8,
// allFieldsRequired = both levels picked; headers with the default `required`) and by no direct VS3 rule (VS3:231-264 reads them only
// to demand evidence): subfields `required: true`.
//
// Current levels (the table of the workshop answer). The assessed answer is asked only when a workshop was organized (S3:20-22), and the
// table shows for the answers 1 and 2 (S3W:11-16: set and != 3); its selects are `pr-select` with the default `required`, so the form
// requires the current levels for 1 and 2 while VS1:123-135 tests only 1: `required_when` follows the form, `required_confirmed: false`
// (the function states a narrower rule). The potential-situation columns are not on the 2026 form (hidden, still stored).
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PathBinding,
  PathStep,
} from '../types';
import { FROM_2026, whenEq } from './shared';
import {
  IPSR_ELEMENT_TABLE,
  IPSR_TABLE,
  IPSR_TYPES,
  ROLE_COMPLEMENTARY,
  ROLE_CORE,
  SubRule,
  col,
  sub,
} from './ipsr-shared';

export const IPSR_S3_WORKSHOP_SECTION: CatalogSection = {
  key: 'ipsr_s3_workshop',
  label: 'Scaling readiness assessment',
  order: 86,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S3_CORE_SECTION: CatalogSection = {
  key: 'ipsr_s3_core',
  label: 'Core innovation',
  order: 87,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S3_COMPLEMENTARY_SECTION: CatalogSection = {
  key: 'ipsr_s3_complementary',
  label: 'Complementary innovations/ enablers/ solutions',
  order: 88,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

const WORKSHOP_ORGANIZED = 'ipsr_step_1.is_expert_workshop_organized';
const ASSESSED = 'ipsr_step_3.assessed_during_workshop';

const ACTORS = 'result_ip_result_actors';
const ORGS = 'result_ip_result_institution_types';
const MEASURES = 'result_ip_result_measures';
const LINK_TABLE = 'result_ip_step_three_evidence';
const EVIDENCE = 'evidence';

/** `assessed_workshop_options` ids whose answer shows the current-level table: 1 and 2 (3 = none, S3W:11-16). Closed list. */
const ASSESSED_WITH_TABLE = [1, 2];
/** `evidence.evidence_type_id` of the IPSR step 3 evidence (migration 1790347604000, EvidenceTypeEnum.IPSR_STEP_THREE). */
const EVIDENCE_TYPE_STEP_THREE = 7;
/** `result_ip_result_institution_types.institution_roles_id` the step 3 writer sets (innovation-pathway-step-three.service.ts:539,720,730,781). */
const STEP_THREE_ORG_ROLE = 6;
/** `evidence.is_sharepoint` as stored (closed list `evidence_sources`): 0 = Link, 1 = Upload file. */
const SOURCE_LINK = 0;
const SOURCE_UPLOAD = 1;
const OTHER_ACTOR_TYPE = 5;
const OTHER_INSTITUTION_TYPE = 78;
const GRADUATE_STUDENTS_TYPE = 50;

const base = {
  result_types: IPSR_TYPES,
  required: false,
  required_confirmed: true,
  ...FROM_2026,
};

/** A level of one element role, read from the package's `result_by_innovation_package` rows. */
const levelOf = (role: number, column: string) => ({
  kind: 'relation' as const,
  table: IPSR_ELEMENT_TABLE,
  fk_to_result: 'result_innovation_package_id',
  value_column: column,
  filter: { ipsr_role_id: role, is_active: 1 },
});

/** The current-level table: a workshop was organized and the answer is 1 or 2 (S3:20-22, S3W:11-16). */
const currentLevelRule = {
  all: [
    { field: WORKSHOP_ORGANIZED, operator: 'eq' as const, value: true },
    { field: ASSESSED, operator: 'in' as const, value: ASSESSED_WITH_TABLE },
  ],
};

/** DD-13: first hop of every core-element path, from `result` to the package's core `result_by_innovation_package` row. */
const CORE_ELEMENT_STEP: PathStep = {
  table: IPSR_ELEMENT_TABLE,
  join: [{ from: 'id', to: 'result_innovation_package_id' }],
  filter: { ipsr_role_id: ROLE_CORE, is_active: 1 },
};

/**
 * Evidence of one element and level: element row -> its ACTIVE link of that level -> the ACTIVE evidence of type 7. Starts at the
 * element's `result_by_innovation_package` row; the value is the evidence id (never NULL, so every reached row is an element).
 */
const evidenceSteps = (level: 'readiness' | 'use'): PathStep[] => [
  {
    table: LINK_TABLE,
    join: [
      {
        from: 'result_by_innovation_package_id',
        to: 'result_by_innovation_package_id',
      },
    ],
    filter: { ipsr_evidence_level: level, is_active: 1 },
  },
  {
    table: EVIDENCE,
    join: [{ from: 'evidence_id', to: 'id' }],
    filter: { evidence_type_id: EVIDENCE_TYPE_STEP_THREE, is_active: 1 },
  },
];

/** The uploaded file's row, as in `evidence.items`: the newest active `evidence_sharepoint` row of the evidence. */
const fileRow = (valueColumn: string): PathBinding => ({
  kind: 'path',
  steps: [
    {
      table: 'evidence_sharepoint',
      join: [{ from: 'id', to: 'evidence_id' }],
      filter: { is_active: 1 },
      pick: { order_by: 'created_date', direction: 'desc' },
    },
  ],
  value_column: valueColumn,
});

const whenSourceLink = whenEq('evidence_source', SOURCE_LINK);
const whenSourceUpload = whenEq('evidence_source', SOURCE_UPLOAD);

const evidenceTag = (
  key: string,
  label: string,
  column: string,
): CatalogSubField => sub(EVIDENCE, key, label, 'boolean', column);

/** The fields of one evidence item of the step 3 dialog (S3E:221-315). Same for both levels of both element roles. */
const evidenceItemSubfields = (): CatalogSubField[] => [
  // S3E:221-228 radio Link / Upload file (default `required`, always answered); stored `evidence.is_sharepoint` 0/1.
  sub(
    EVIDENCE,
    'evidence_source',
    'Source of the evidence',
    'single_select',
    'is_sharepoint',
    'evidence_sources',
    { required: true },
  ),
  // S3E:230-231 `type="link"` `[required]="true"`, link source only.
  sub(EVIDENCE, 'link', 'Link', 'text', 'link', undefined, {
    required_when: whenSourceLink,
    visible_when: whenSourceLink,
  }),
  // S3E:241-248, upload source only (default `required`).
  {
    key: 'is_public_file',
    label: 'Can this evidence be shared publicly?',
    type: 'boolean',
    required: false,
    required_when: whenSourceUpload,
    visible_when: whenSourceUpload,
    storage: fileRow('is_public_file'),
  },
  // S3E:250-298 `app-field-card [required]="true"`, upload source only; the name is the stored `file_name` of the file row.
  {
    key: 'file_name',
    label: 'File to be uploaded to the repository',
    type: 'text',
    required: false,
    required_when: whenSourceUpload,
    visible_when: whenSourceUpload,
    storage: fileRow('file_name'),
  },
  // The repository URL of the uploaded file is stored as the evidence link (the save refuses a file evidence without it,
  // step-n3.component.ts uploadPendingEvidenceFiles); VS3 reads that link through the legacy mirror (VS3:19-47).
  sub(
    EVIDENCE,
    'file_url',
    'Link to the uploaded file',
    'text',
    'link',
    undefined,
    { required_when: whenSourceUpload, visible_when: whenSourceUpload },
  ),
  // S3E:301-307 tag checkboxes (`[required]="false"`); the label "Climate adaptation and mitigation" is stored in `youth_related`.
  evidenceTag(
    'gender_related',
    'Gender equality, youth and social inclusion',
    'gender_related',
  ),
  evidenceTag(
    'climate_related',
    'Climate adaptation and mitigation',
    'youth_related',
  ),
  evidenceTag(
    'nutrition_related',
    'Nutrition, health and food security',
    'nutrition_related',
  ),
  evidenceTag(
    'environmental_biodiversity_related',
    'Environmental health and biodiversity',
    'environmental_biodiversity_related',
  ),
  evidenceTag(
    'poverty_related',
    'Poverty reduction, livelihoods and jobs',
    'poverty_related',
  ),
  evidenceTag(
    'innovation_use_related',
    'Innovation Use',
    'innovation_use_related',
  ),
  // S3E:309-315 textarea `[required]="false"`, max 50 words; the label says "file" for an upload.
  sub(
    EVIDENCE,
    'description',
    'Please provide details of where evidence can be found within the source link (e.g. page number, slide number, table number)',
    'text',
    'description',
  ),
];

const EVIDENCE_HELP =
  'Add links or upload files that support the level selected above.';

/** Row rules of the shared innovation-use form with `isIpsr = true`, same as the step 1 targeted use (see its header). */
const ALWAYS: SubRule = { required: true };
const WHEN_DISAGGREGATED: SubRule = {
  required_when: whenEq('sex_and_age_disaggregation', false),
  visible_when: whenEq('sex_and_age_disaggregation', false),
};

export const IPSR_STEP_3_FIELDS: CatalogField[] = [
  {
    // Required by the step 1 function (VS1:121); the control lives in step 3 and is asked only when a workshop was organized
    // (S3:20-22). 2026 label; phases <= 2025 asked "What was assessed during the expert workshop?".
    ...base,
    key: ASSESSED,
    label:
      'Provide the readiness and use levels of the core innovation and complementary enablers following the expert workshop.',
    type: 'single_select',
    control_list: 'assessed_workshop_options',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 1,
    required_when: whenEq(WORKSHOP_ORGANIZED, true),
    visible_when: whenEq(WORKSHOP_ORGANIZED, true),
    storage: col(IPSR_TABLE, 'assessed_during_expert_workshop_id'),
  },
  {
    // S3W:51-60 (`pr-select`, default `required`) for the answers 1 and 2; VS1:123-135 tests only the answer 1 (see the header).
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_3.core.current_readiness_level',
    label: 'Innovation readiness (Current situation (now) — core innovation)',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 2,
    required_when: currentLevelRule,
    visible_when: currentLevelRule,
    storage: levelOf(ROLE_CORE, 'current_innovation_readiness_level'),
  },
  {
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_3.core.current_use_level',
    label: 'Innovation use (Current situation (now) — core innovation)',
    type: 'single_select',
    control_list: 'use_levels',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 3,
    required_when: currentLevelRule,
    visible_when: currentLevelRule,
    storage: levelOf(ROLE_CORE, 'current_innovation_use_level'),
  },
  {
    // S3:24-34 marker `readiness_level_evidence_based !== null`; VS3:8-18 fails only when BOTH core levels are empty (see the header).
    ...base,
    required: true,
    required_confirmed: false,
    key: 'ipsr_step_3.core.readiness_level',
    label: 'Innovation Readiness level evidence-based',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: IPSR_S3_CORE_SECTION.key,
    order: 5,
    storage: levelOf(ROLE_CORE, 'readiness_level_evidence_based'),
  },
  {
    // S3:37-39; VS3:19-33 (through the legacy mirror) when the level is not 0. Level gate not expressible (see the header).
    ...base,
    key: 'ipsr_step_3.core.readiness_evidences',
    label: 'Innovation Readiness level evidence',
    description: EVIDENCE_HELP,
    type: 'list',
    section: IPSR_S3_CORE_SECTION.key,
    order: 6,
    storage: {
      kind: 'path',
      steps: [CORE_ELEMENT_STEP, ...evidenceSteps('readiness')],
      value_column: 'id',
    },
    subfields: evidenceItemSubfields(),
  },
  {
    // S3:47-52 marker `use_level_evidence_based !== null`; same rule as the readiness level.
    ...base,
    required: true,
    required_confirmed: false,
    key: 'ipsr_step_3.core.use_level',
    label: 'Innovation use level evidence-based',
    type: 'single_select',
    control_list: 'use_levels',
    section: IPSR_S3_CORE_SECTION.key,
    order: 18,
    storage: levelOf(ROLE_CORE, 'use_level_evidence_based'),
  },
  {
    // S3:54-56; VS3:34-47 when the level is not 0. Level gate not expressible (see the header).
    ...base,
    key: 'ipsr_step_3.core.use_evidences',
    label: 'Innovation use level evidence',
    description: EVIDENCE_HELP,
    type: 'list',
    section: IPSR_S3_CORE_SECTION.key,
    order: 19,
    storage: {
      kind: 'path',
      steps: [CORE_ELEMENT_STEP, ...evidenceSteps('use')],
      value_column: 'id',
    },
    subfields: evidenceItemSubfields(),
  },
  {
    // S3C:6-97, block hidden at use level 0 (S3:61-63, not expressible). Any-of rule of the three lists: see the header.
    ...base,
    key: 'ipsr_step_3.core.current_use.actors',
    label: 'Actors',
    description:
      'Specify the current use of the core innovation by actors, organizations, hectares or other innovation users/ beneficiaries. The numbers should reflect the current innovation use that can be supported by evidence',
    type: 'list',
    section: IPSR_S3_CORE_SECTION.key,
    order: 31,
    storage: {
      kind: 'path',
      steps: [
        CORE_ELEMENT_STEP,
        {
          table: ACTORS,
          join: [
            {
              from: 'result_by_innovation_package_id',
              to: 'result_ip_result_id',
            },
          ],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'result_ip_actors_id',
    },
    subfields: [
      // S3C:14-20 (`[required]="!!id"`); VS3:62-103,147-192.
      sub(
        ACTORS,
        'actor_type',
        'Actor type',
        'single_select',
        'actor_type_id',
        'actor_types',
        ALWAYS,
      ),
      // S3C:22-25 (input only for the type 5, `[required]="false"`); VS3:77-83,166-172 require it.
      sub(
        ACTORS,
        'other_actor_type',
        'Other actor type',
        'text',
        'other_actor_type',
        undefined,
        {
          required_when: whenEq('actor_type', OTHER_ACTOR_TYPE),
          visible_when: whenEq('actor_type', OTHER_ACTOR_TYPE),
        },
      ),
      sub(
        ACTORS,
        'sex_and_age_disaggregation',
        'Sex and age disaggregation does not apply',
        'boolean',
      ),
      // S3C:37-68 (`[required]="!!id"`, shown while the disaggregation tick is off); VS3:70-74,158-164.
      sub(
        ACTORS,
        'women',
        'Women',
        'number',
        'women',
        undefined,
        WHEN_DISAGGREGATED,
      ),
      sub(
        ACTORS,
        'women_youth',
        'Youth (women)',
        'number',
        'women_youth',
        undefined,
        WHEN_DISAGGREGATED,
      ),
      sub(ACTORS, 'men', 'Men', 'number', 'men', undefined, WHEN_DISAGGREGATED),
      sub(
        ACTORS,
        'men_youth',
        'Youth (men)',
        'number',
        'men_youth',
        undefined,
        WHEN_DISAGGREGATED,
      ),
      // S3C:75-79 typed "How many" while the tick is on (required); the read-only "Total" while it is off feeds the same column.
      sub(ACTORS, 'how_many', 'How many', 'number', 'how_many', undefined, {
        required_when: whenEq('sex_and_age_disaggregation', true),
      }),
      // S3C:85-86 `type="link"`, required once the row is real; VS3 (NULL or '' invalid).
      sub(
        ACTORS,
        'evidence_link',
        'Evidence link',
        'text',
        'evidence_link',
        undefined,
        ALWAYS,
      ),
    ],
  },
  {
    ...base,
    key: 'ipsr_step_3.core.current_use.organizations',
    label: 'Organizations',
    type: 'list',
    section: IPSR_S3_CORE_SECTION.key,
    order: 41,
    storage: {
      kind: 'path',
      steps: [
        CORE_ELEMENT_STEP,
        {
          table: ORGS,
          join: [
            {
              from: 'result_by_innovation_package_id',
              to: 'result_ip_results_id',
            },
          ],
          filter: { institution_roles_id: STEP_THREE_ORG_ROLE, is_active: 1 },
        },
      ],
      value_column: 'institution_types_id',
    },
    subfields: [
      // S3C:107-113 (`[required]="!!id"`); VS3:108-131,193-217.
      sub(
        ORGS,
        'institution_type',
        'Organization',
        'single_select',
        'institution_types_id',
        'institution_types',
        ALWAYS,
      ),
      // S3C:115-119 (shown and required for the type 78); VS3:123-130,209-215.
      sub(
        ORGS,
        'other_institution',
        'Other organization',
        'text',
        'other_institution',
        undefined,
        {
          required_when: whenEq('institution_type', OTHER_INSTITUTION_TYPE),
          visible_when: whenEq('institution_type', OTHER_INSTITUTION_TYPE),
        },
      ),
      // S3C:131-133 (`[required]="!!id"`); VS3:117,204.
      sub(
        ORGS,
        'how_many',
        'How many',
        'number',
        'how_many',
        undefined,
        ALWAYS,
      ),
      // S3C:135-138 (type 50 only, `[required]="false"`); no rule in VS3.
      {
        ...sub(ORGS, 'graduate_students', '# of graduate students', 'number'),
        visible_when: whenEq('institution_type', GRADUATE_STUDENTS_TYPE),
      },
      // S3C:142-143 `type="link"`, required once the row is real; VS3:118-121,205-206.
      sub(
        ORGS,
        'evidence_link',
        'Evidence link',
        'text',
        'evidence_link',
        undefined,
        ALWAYS,
      ),
    ],
  },
  {
    ...base,
    key: 'ipsr_step_3.core.current_use.measures',
    label: 'Other quantitative measures of innovation use (e.g. # of hectares)',
    type: 'list',
    section: IPSR_S3_CORE_SECTION.key,
    order: 48,
    storage: {
      kind: 'path',
      steps: [
        CORE_ELEMENT_STEP,
        {
          table: MEASURES,
          join: [
            {
              from: 'result_by_innovation_package_id',
              to: 'result_ip_result_id',
            },
          ],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'unit_of_measure',
    },
    subfields: [
      // S3C:164-169 (`[required]="!!id"`); VS3:136-145,218-230.
      sub(
        MEASURES,
        'unit_of_measure',
        'Unit of measure',
        'text',
        'unit_of_measure',
        undefined,
        ALWAYS,
      ),
      sub(
        MEASURES,
        'quantity',
        'Quantity',
        'number',
        'quantity',
        undefined,
        ALWAYS,
      ),
      // S3C:173-174 `[required]="true"` for every row; VS3 reads it only inside the any-of group (VS3:143).
      sub(
        MEASURES,
        'evidence_link',
        'Evidence link',
        'text',
        'evidence_link',
        undefined,
        ALWAYS,
      ),
    ],
  },
  {
    // S3:68-78 / S3X:1-58: one card per complementary element (read-through of the role-2 rows, which come from step 2.1).
    ...base,
    key: 'ipsr_step_3.complementary_components',
    label: 'Complementary innovations/ enablers/ solutions',
    type: 'list',
    section: IPSR_S3_COMPLEMENTARY_SECTION.key,
    order: 4,
    storage: {
      kind: 'relation',
      table: IPSR_ELEMENT_TABLE,
      fk_to_result: 'result_innovation_package_id',
      value_column: 'result_by_innovation_package_id',
      filter: { ipsr_role_id: ROLE_COMPLEMENTARY, is_active: 1 },
    },
    subfields: [
      // S3W:64-82 (same table as the core current levels, same rule: VS1:123-135 for the answer 1, the form for 1 and 2).
      sub(
        IPSR_ELEMENT_TABLE,
        'current_readiness_level',
        'Innovation readiness (Current situation (now))',
        'single_select',
        'current_innovation_readiness_level',
        'readiness_levels',
        { required_when: currentLevelRule, visible_when: currentLevelRule },
      ),
      sub(
        IPSR_ELEMENT_TABLE,
        'current_use_level',
        'Innovation use (Current situation (now))',
        'single_select',
        'current_innovation_use_level',
        'use_levels',
        { required_when: currentLevelRule, visible_when: currentLevelRule },
      ),
      // S3X:18-28 (header with the default `required`; the green check needs both levels, S3X:65-72). VS3:231-264 has no direct rule
      // on the level, it only demands the evidence below (a NULL level counts as != 0).
      sub(
        IPSR_ELEMENT_TABLE,
        'readiness_level',
        'Innovation Readiness level evidence-based',
        'single_select',
        'readiness_level_evidence_based',
        'readiness_levels',
        { required: true },
      ),
      {
        // S3X:31-35; VS3:231-252 (through the legacy mirror) when the readiness level is not 0 or NULL. Level gate not expressible.
        key: 'readiness_evidences',
        label: 'Innovation Readiness level evidence',
        type: 'list',
        required: false,
        storage: {
          kind: 'path',
          steps: evidenceSteps('readiness'),
          value_column: 'id',
        },
        subfields: evidenceItemSubfields(),
      },
      // S3X:39-48.
      sub(
        IPSR_ELEMENT_TABLE,
        'use_level',
        'Innovation use level evidence-based',
        'single_select',
        'use_level_evidence_based',
        'use_levels',
        { required: true },
      ),
      {
        // S3X:50-54; VS3:253-263.
        key: 'use_evidences',
        label: 'Innovation use level evidence',
        type: 'list',
        required: false,
        storage: {
          kind: 'path',
          steps: evidenceSteps('use'),
          value_column: 'id',
        },
        subfields: evidenceItemSubfields(),
      },
    ],
  },
];
