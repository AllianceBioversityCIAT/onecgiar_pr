// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.7 (IPSR step 3, S3 / S3W / S3X). Keys frozen as written there.
//
// Catalogued here: the workshop answer, the current (now) readiness / use levels, the evidence-based levels of the
// core innovation and the complementary elements list (with their current levels).
// Deferred to PENDING_CATALOG (no model change):
//  - REVIEW D1 + D2: every `*_evidences` list with its 11 sub-keys (core readiness, core use, complementary readiness,
//    complementary use = 44 sub-keys (4 x 11) + 4 lists). They live in `result_ip_step_three_evidence` (NO TypeORM entity: the
//    completeness guard cannot see it, see the header of pending-catalog.ts) joined to `evidence` and need two levels of
//    nesting.
//  - REVIEW D2: `core.current_use.actors|organizations|measures` (+ their sub-keys): `result_ip_result_actors`,
//    `result_ip_result_institution_types`, `result_ip_result_measures` reach the package through
//    `result_by_innovation_package` (2-hop).
//  - Optional rows (stage 2): complementary `readiness_level` / `use_level` (evidence-based levels per element).
//
// Level rules. `result_by_innovation_package` has one row per element: role 1 = core innovation, role 2 = complementary
// element; both are one hop from the package (`result_innovation_package_id`), so a role filter selects the value.
//  - `core.readiness_level` / `core.use_level` (VS3:8-18): invalid when BOTH are empty. The rule is "at least one of
//    the two"; `required_when` has no "is empty" operator, so both are `required: false, required_confirmed: true` and
//    the rule stays here.
//  - `core.current_*_level` and the complementary current levels (VS1:123-135) are required when the workshop was
//    organized AND `assessed_during_workshop` = 1. 1 is the seeded id of the option "Only Current innovation readiness
//    and innovation use were self-assessed by the workshop experts" (control list `assessed_workshop_options`).
//  - The complementary rows are not user-added here (they come from step 2.1); the list is a read-through of the
//    role-2 rows and carries no rule of its own.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026, whenEq } from './shared';
import {
  IPSR_ELEMENT_TABLE,
  IPSR_TABLE,
  IPSR_TYPES,
  ROLE_COMPLEMENTARY,
  ROLE_CORE,
  col,
  sub,
} from './ipsr-shared';

export const IPSR_S3_WORKSHOP_SECTION: CatalogSection = {
  key: 'ipsr_s3_workshop',
  label: 'Scaling readiness assessment',
  order: 83,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S3_CORE_SECTION: CatalogSection = {
  key: 'ipsr_s3_core',
  label: 'Core innovation',
  order: 84,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S3_COMPLEMENTARY_SECTION: CatalogSection = {
  key: 'ipsr_s3_complementary',
  label: 'Complementary innovations/ enablers/ solutions',
  order: 85,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

const WORKSHOP_ORGANIZED = 'ipsr_step_1.is_expert_workshop_organized';
const ASSESSED = 'ipsr_step_3.assessed_during_workshop';

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

const currentLevelRule = {
  all: [
    { field: WORKSHOP_ORGANIZED, operator: 'eq' as const, value: true },
    { field: ASSESSED, operator: 'eq' as const, value: 1 },
  ],
};

export const IPSR_STEP_3_FIELDS: CatalogField[] = [
  {
    // Required by the step 1 function (VS1:121); the control lives in step 3. 2026 label; phases <= 2025 asked
    // "What was assessed during the expert workshop?".
    ...base,
    key: ASSESSED,
    label:
      'Provide the readiness and use levels of the core innovation and complementary enablers following the expert workshop.',
    type: 'single_select',
    control_list: 'assessed_workshop_options',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 1,
    required_when: whenEq(WORKSHOP_ORGANIZED, true),
    storage: col(IPSR_TABLE, 'assessed_during_expert_workshop_id'),
  },
  {
    ...base,
    key: 'ipsr_step_3.core.current_readiness_level',
    label: 'Innovation readiness (Current situation (now) — core innovation)',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 2,
    required_when: currentLevelRule,
    storage: levelOf(ROLE_CORE, 'current_innovation_readiness_level'),
  },
  {
    ...base,
    key: 'ipsr_step_3.core.current_use_level',
    label: 'Innovation use (Current situation (now) — core innovation)',
    type: 'single_select',
    control_list: 'use_levels',
    section: IPSR_S3_WORKSHOP_SECTION.key,
    order: 3,
    required_when: currentLevelRule,
    storage: levelOf(ROLE_CORE, 'current_innovation_use_level'),
  },
  {
    ...base,
    key: 'ipsr_step_3.core.readiness_level',
    label: 'Innovation Readiness level evidence-based',
    type: 'single_select',
    control_list: 'readiness_levels',
    section: IPSR_S3_CORE_SECTION.key,
    order: 5,
    storage: levelOf(ROLE_CORE, 'readiness_level_evidence_based'),
  },
  {
    ...base,
    key: 'ipsr_step_3.core.use_level',
    label: 'Innovation use level evidence-based',
    type: 'single_select',
    control_list: 'use_levels',
    section: IPSR_S3_CORE_SECTION.key,
    order: 18,
    storage: levelOf(ROLE_CORE, 'use_level_evidence_based'),
  },
  {
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
      sub(
        IPSR_ELEMENT_TABLE,
        'current_readiness_level',
        'Innovation readiness (Current situation (now))',
        'single_select',
        'current_innovation_readiness_level',
        'readiness_levels',
      ),
      sub(
        IPSR_ELEMENT_TABLE,
        'current_use_level',
        'Innovation use (Current situation (now))',
        'single_select',
        'current_innovation_use_level',
        'use_levels',
      ),
    ],
  },
];
