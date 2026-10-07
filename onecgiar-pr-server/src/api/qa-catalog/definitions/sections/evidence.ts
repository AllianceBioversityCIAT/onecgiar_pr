// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-5 (`evidence`); QAC-T-17 (owner 2026-10-07): evidence fully parametrized. QA receives ALL evidence data
// (source, link, upload visibility, file name, file URL, description, every impact-area / result-type flag), not only what the green-check
// function requires; `validation_evidences_P25` (V-EV) decides `required` / `required_when` only.
// Keys frozen as written in the inventory (`evidence.items.<key>`), except `file`, which the owner split into `file_name` + `file_url`.
// Client citations (2026 form), paths under onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/:
//   EI.html = evidence-item/evidence-item.component.html · EI.ts = evidence-item/evidence-item.component.ts
//   EV.html = rd-evidences.component.html · EV.ts = rd-evidences.component.ts
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PathBinding,
} from '../types';
import {
  ALL_TYPES,
  FROM_2026,
  NON_KP_TYPES,
  RESULT_TYPE_FIELD,
  whenEq,
  whenIn,
} from './shared';

export const EVIDENCE_SECTION: CatalogSection = {
  key: 'evidence',
  label: 'Evidence',
  order: 60,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = EVIDENCE_SECTION.key;

/** `evidence.is_sharepoint` (tinyint) as stored: 0 = Link, 1 = Upload file. Closed list `evidence_sources`. */
const SOURCE_FIELD = 'source';
const SOURCE_LINK = 0;
const SOURCE_UPLOAD = 1;
const whenSourceLink = whenEq(SOURCE_FIELD, SOURCE_LINK);
const whenSourceUpload = whenEq(SOURCE_FIELD, SOURCE_UPLOAD);

/**
 * The uploaded file's row. The path starts at the PARENT element's row (`evidence`, DD-12) and follows
 * `evidence.id -> evidence_sharepoint.evidence_id`. Only active rows count: the table keeps older rows of a
 * re-uploaded file, and several of them can be active at once, so the step declares which one it reads: the newest
 * (`pick` by `created_date` desc), the same row the client/repository read (`MAX(created_date)` per `evidence_id`,
 * evidences.repository.ts:457-467). That makes the binding return one value per evidence.
 */
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

// Flags carry no per-element `required_when`: V-EV states them as a LIST rule (>= 1 active item with the flag
// when the matching tag is 3 / the readiness level is not 0), which the per-element model cannot express, so the
// rule stays on the inventory row and the flag is `required: false`.
const evidenceFlag = (
  key: string,
  label: string,
  column: string,
  visible_when: CatalogSubField['visible_when'],
): CatalogSubField => ({
  key,
  label,
  type: 'boolean',
  required: false,
  visible_when,
  storage: { kind: 'column', table: 'evidence', column },
});

const PRINCIPAL_TAG_LEVEL = 3;

// Impact-area flags. OWNER (2026-10-07): visible when the matching General information tag is Principal (id 3,
// closed list `tag_levels`). NOTE: the 2026 form renders these five checkboxes UNCONDITIONALLY (EI.html:129-133,
// no *ngIf; the card title says "Impact Area score of 2"); the tag gate is the owner's instruction, and it is the
// only case in which V-EV:72-98 reads the flag.
const impactAreaFlag = (
  key: string,
  label: string,
  column: string,
  tagKey: string,
): CatalogSubField =>
  evidenceFlag(key, label, column, whenEq(tagKey, PRINCIPAL_TAG_LEVEL));
// Result-type flags: shown only for their own result type (EI.html:134-147), which `isInnoDev` / `isInnoUse`
// (data-control.service.ts:234-240) and `resultTypeId` (EI.ts:126-128) resolve from `result_type_id`.
const typeFlag = (
  key: string,
  label: string,
  column: string,
  resultType: string,
): CatalogSubField =>
  evidenceFlag(key, label, column, whenEq(RESULT_TYPE_FIELD, resultType));

// Result types with evidence required (every type except capacity_sharing, which is exempt without evidence).
const EVIDENCE_REQUIRED_TYPES = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'impact_contribution',
  'innovation_package',
];

export const EVIDENCE_FIELDS: CatalogField[] = [
  {
    key: 'evidence.items',
    label: 'Evidence',
    type: 'list',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenIn(RESULT_TYPE_FIELD, EVIDENCE_REQUIRED_TYPES),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'evidence',
      fk_to_result: 'result_id',
      value_column: 'id',
      filter: { evidence_type_id: 1, is_supplementary: 0, is_active: 1 },
    },
    subfields: [
      {
        // EI.html:4-12 radio "Source of the evidence", options Link / Upload file (EI.ts:83-86); hidden for KP.
        // single_select over the closed list `evidence_sources` because the stored tinyint is 0/1 and the labels are not
        // "true/false"; the client sends booleans, the column holds 0/1 (EI.ts:23-50). The form marks the radio mandatory
        // (`pr-radio-button` defaults `required = true`, pr-radio-button.component.ts:34, and EI.html:4-12 does not
        // override it); V-EV does not read it, so this is a FORM-ONLY rule (QAC-T-19, option B: `required` follows the form;
        // was `required: false`). Required whenever it is shown (hidden for KP, EI.html:5).
        key: SOURCE_FIELD,
        label: 'Source of the evidence',
        type: 'single_select',
        control_list: 'evidence_sources',
        required: false,
        required_when: whenIn(RESULT_TYPE_FIELD, NON_KP_TYPES),
        visible_when: whenIn(RESULT_TYPE_FIELD, NON_KP_TYPES),
        storage: { kind: 'column', table: 'evidence', column: 'is_sharepoint' },
      },
      {
        // EI.html:14-22 shown when `!is_sharepoint`, `[required]="!isOptional"`. V-EV:66-71 requires a non-empty
        // `link` on EVERY item (an upload's link is its repository URL, `file_url`); the only exemption is the readiness-0
        // innovation_development case (V-EV:59-63), a cross-section condition the model cannot express.
        key: 'link',
        label: 'Link',
        type: 'text',
        required: false,
        required_when: whenSourceLink,
        visible_when: whenSourceLink,
        storage: { kind: 'column', table: 'evidence', column: 'link' },
      },
      {
        // EI.html:43-50 (inside the `upload_file` template, shown when `is_sharepoint`). The form marks the radio mandatory
        // (`pr-radio-button` defaults `required = true`, pr-radio-button.component.ts:34) and the server refuses an upload
        // without an answer (evidences.service.ts:600-618), but no live green-check rule reads it: FORM-ONLY rule (QAC-T-19, option B;
        // was `required: false`), required when the upload source is chosen (EI.html:43-50, no `[required]` override). Stored 0/1.
        key: 'is_public_file',
        label: 'Can this evidence be shared publicly?',
        type: 'boolean',
        required: false,
        required_when: whenSourceUpload,
        visible_when: whenSourceUpload,
        storage: fileRow('is_public_file'),
      },
      {
        // EI.html:54-86 file field (`sp_file_name`), upload source only. Owner: QA receives the name. FORM-ONLY rule (QAC-T-19,
        // option B; was `required: false`): the card is `[required]="true"` (EI.html:56); V-EV never reads the name (it reads the link,
        // see `file_url`).
        key: 'file_name',
        label: 'File to be uploaded to the repository',
        type: 'text',
        required: false,
        required_when: whenSourceUpload,
        visible_when: whenSourceUpload,
        storage: fileRow('file_name'),
      },
      {
        // EI.html:64 (`evidence.link` is the file's repository URL once uploaded). Delivered even when the file is private;
        // `is_public_file` tells QA how to treat it (owner). Same column as `link`; V-EV requires it non-empty for an upload
        // (function-stated, V-EV:65-71; not a form control: the link is produced by the upload, EI.html:64).
        key: 'file_url',
        label: 'Link to the uploaded file',
        type: 'text',
        required: false,
        required_when: whenSourceUpload,
        visible_when: whenSourceUpload,
        storage: { kind: 'column', table: 'evidence', column: 'link' },
      },
      impactAreaFlag(
        'gender_related',
        'Gender equality, youth and social inclusion',
        'gender_related',
        'general.gender_tag',
      ),
      // The UI label "Climate adaptation and mitigation" is bound to the column `youth_related` (EI.html:130).
      impactAreaFlag(
        'climate_related',
        'Climate adaptation and mitigation',
        'youth_related',
        'general.climate_tag',
      ),
      impactAreaFlag(
        'nutrition_related',
        'Nutrition, health and food security',
        'nutrition_related',
        'general.nutrition_tag',
      ),
      impactAreaFlag(
        'environment_related',
        'Environmental health and biodiversity',
        'environmental_biodiversity_related',
        'general.environment_tag',
      ),
      impactAreaFlag(
        'poverty_related',
        'Poverty reduction, livelihoods and jobs',
        'poverty_related',
        'general.poverty_tag',
      ),
      // EI.html:134 `*ngIf="isInnoDev"`; V-EV:125-139 (type 7, readiness level <> 0 => >= 1 item with the flag).
      typeFlag(
        'innovation_readiness_related',
        'Innovation Development',
        'innovation_readiness_related',
        'innovation_development',
      ),
      // EI.html:136 `*ngIf="isInnoUse"`.
      typeFlag(
        'innovation_use_related',
        'Innovation Use',
        'innovation_use_related',
        'innovation_use',
      ),
      // EI.html:138 `resultTypeId === 1`.
      typeFlag(
        'policy_change_related',
        'Policy Change',
        'policy_change_related',
        'policy_change',
      ),
      // EI.html:140 `resultTypeId === 5`.
      typeFlag(
        'capacity_sharing_related',
        'Capacity Sharing for Development',
        'capacity_sharing_related',
        'capacity_sharing',
      ),
      // EI.html:142 `resultTypeId === 6` (stored in `knowledge_product_metadata_related`).
      typeFlag(
        'knowledge_product_related_flag',
        'Knowledge Product',
        'knowledge_product_metadata_related',
        'knowledge_product',
      ),
      // EI.html:144 `resultTypeId === 8`.
      typeFlag(
        'other_output_related',
        'Other Output',
        'other_output_related',
        'other_output',
      ),
      // EI.html:146 `resultTypeId === 4`.
      typeFlag(
        'other_outcome_related',
        'Other Outcome',
        'other_outcome_related',
        'other_outcome',
      ),
      {
        // EI.html:150-162: the textarea LABEL (not help text) is "Please provide details of where evidence can be found
        // within the source <file|link> (e.g. page number, slide number, table number)", `[required]="false"`, max 50 words.
        // The word switches with the source (`is_sharepoint ? 'file' : 'link'`); the supplementary-information variant
        // (`isSuppInfo`) is never passed by this page (EV.html:247).
        key: 'description',
        label:
          'Please provide details of where evidence can be found within the source file or link (e.g. page number, slide number, table number)',
        type: 'text',
        required: false,
        storage: { kind: 'column', table: 'evidence', column: 'description' },
      },
    ],
  },
];
