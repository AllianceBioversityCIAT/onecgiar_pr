// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.4 (IPSR step 1, components S1 / S1E / S1I / S1B). Keys frozen as written there.
//
// Decisions (owner mandate 2026-10-06, no model change):
//  - Geography (`ipsr_step_1.geo_scope`, `.regions`, `.countries`): IPSR variant of the common geography concept, same
//    storage as `geo.scope|regions|countries` (`result.geographic_scope_id`, `result_region`, `result_country`; no
//    `geo_scope_role_id` filter: the IPSR writer leaves it NULL) but its own keys:
//    the live step-1 function does not test geography and the "regions/countries specified"
//    questions are not rendered for module `ipsr`, so the common required rules do not hold for the package. The common
//    `geo.*` keys therefore list every other type explicitly (never `ALL_TYPES`). `required: false`,
//    `required_confirmed: false` (REVIEW D12 (b): the UI marks the scope required, no live rule backs it). The IPSR label
//    is the `label`; it is not form help text, so no `description`.
//    `ipsr_step_1.countries.sub_national` is 2-hop like `geo.subnational` (through `result_country`) -> PENDING_CATALOG
//    (REVIEW D2; the `result_country_subnational` entry names the key).
//  - `ipsr_step_1.eoi_outcomes` (required, VS1:32-41): `result_ip_eoi_outcomes` hangs off the package through
//    `result_by_innovation_package` (2-hop: `result_by_innovation_package_id`), which a RelationBinding cannot express
//    -> PENDING_CATALOG (REVIEW D2). A function-required field is therefore not in stage 1 (QAC-R-11 amended: D1/D2
//    deferrals are excepted).
//  - `ipsr_step_1.scaling_partners.partner_role` (required per partner, VS1:211-237): `result_by_institutions_by_deliveries_type`
//    is reached through `results_by_institution` (2-hop) -> PENDING_CATALOG (REVIEW D2). Its parent
//    `ipsr_step_1.scaling_partners` (optional, no live rule) is stage 2.
//  - Targeted use (`ipsr_step_1.targeted_use.*`): same tables and subfields as the innovation use current-use block
//    (QAC-T-10) with the IPSR filters of the inventory (actors without `section_id`; the page shares the form with
//    `isIpsr = true`). The any-of rule of the three lists (VS1:43-117: at least one complete entry across actors /
//    organizations / measures; once rows exist every active row must be complete) has no gate field in IPSR ("innov_use
//    not modelled") and `required_when` cannot say "at least one of the sibling lists has a row", so the lists are
//    `required: false, required_confirmed: true` and the rule stays here. They carry no `description` (no form help text).
//  - REVIEW D3 (a): "Organization" and "Sub-type" write the same column `institution_types_id`; one subfield
//    `institution_type` with the 2-level control list `institution_types` (the inventory `institution_sub_type` row has no
//    key of its own, R-2).
//  - REVIEW D12 (b): the facilitators' first name, last name and role are mandatory in the form (S1:64-67) but no live
//    rule tests them -> stage 1 as optional and unconfirmed. Email is optional in the form (stage 2).
//  - `is_expert_workshop_organized` drives the visibility of the facilitators, the participants link and the consent
//    question; those rows are optional, so no `required_when` is attached to them.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026 } from './shared';
import { IPSR_TABLE, IPSR_TYPES, col, sub } from './ipsr-shared';

export const IPSR_S1_GEOSCOPE_SECTION: CatalogSection = {
  key: 'ipsr_s1_geoscope',
  label: 'Geographic scope',
  order: 79,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S1_TARGETED_USE_SECTION: CatalogSection = {
  key: 'ipsr_s1_targeted_use',
  label: 'Targeted innovation use',
  order: 80,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S1_EXPERTS_SECTION: CatalogSection = {
  key: 'ipsr_s1_experts',
  label: 'Expert workshop',
  order: 81,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

const ACTORS = 'result_actors';
const ORGS = 'results_by_institution_type';
const MEASURES = 'result_ip_measure';
const FACILITATORS = 'result_ip_expert_workshop_organized';

const base = {
  result_types: IPSR_TYPES,
  required: false,
  required_confirmed: true,
  ...FROM_2026,
};

export const IPSR_STEP_1_FIELDS: CatalogField[] = [
  {
    // Control list `geographic_scopes`: hard-coded Global/Regional/Country/Sub-national in the IPSR form (no "to be determined").
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.geo_scope',
    label:
      'Select country/ geoscope for which packaging and scaling readiness assessment will be conducted',
    type: 'single_select',
    control_list: 'geographic_scopes',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 1,
    storage: col('result', 'geographic_scope_id'),
  },
  {
    // Shown when the scope is Regional.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.regions',
    label: 'Select regions',
    type: 'multi_select',
    control_list: 'regions',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 2,
    storage: {
      kind: 'relation',
      table: 'result_region',
      fk_to_result: 'result_id',
      value_column: 'region_id',
      filter: { is_active: 1 },
    },
  },
  {
    // Shown when the scope is Country or Sub-national.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.countries',
    label: 'Select countries',
    type: 'multi_select',
    control_list: 'countries',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 3,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { is_active: 1 },
    },
  },
  {
    ...base,
    key: 'ipsr_step_1.targeted_use.actors',
    label: 'Actors',
    type: 'list',
    section: IPSR_S1_TARGETED_USE_SECTION.key,
    order: 6,
    storage: {
      kind: 'relation',
      table: ACTORS,
      fk_to_result: 'result_id',
      value_column: 'result_actors_id',
      filter: { section_id: null, is_active: 1 },
    },
    subfields: [
      sub(
        ACTORS,
        'actor_type',
        'Actor type',
        'single_select',
        'actor_type_id',
        'actor_types',
      ),
      sub(ACTORS, 'other_actor_type', 'Other actor type', 'text'),
      sub(
        ACTORS,
        'sex_and_age_disaggregation',
        'Sex and age disaggregation does not apply',
        'boolean',
      ),
      sub(ACTORS, 'women', 'Women', 'number'),
      sub(ACTORS, 'women_youth', 'Youth (women)', 'number'),
      sub(ACTORS, 'men', 'Men', 'number'),
      sub(ACTORS, 'men_youth', 'Youth (men)', 'number'),
      sub(ACTORS, 'how_many', 'How many', 'number'),
    ],
  },
  {
    ...base,
    key: 'ipsr_step_1.targeted_use.organizations',
    label: 'Organizations',
    type: 'list',
    section: IPSR_S1_TARGETED_USE_SECTION.key,
    order: 15,
    storage: {
      kind: 'relation',
      table: ORGS,
      fk_to_result: 'results_id',
      value_column: 'institution_types_id',
      filter: { institution_roles_id: 5, is_active: 1 },
    },
    subfields: [
      sub(
        ORGS,
        'institution_type',
        'Organization',
        'single_select',
        'institution_types_id',
        'institution_types',
      ),
      sub(ORGS, 'other_institution', 'Other organization', 'text'),
      sub(ORGS, 'how_many', 'How many', 'number'),
    ],
  },
  {
    ...base,
    key: 'ipsr_step_1.targeted_use.measures',
    label: 'Other quantitative measures of innovation use (e.g. # of hectares)',
    type: 'list',
    section: IPSR_S1_TARGETED_USE_SECTION.key,
    order: 21,
    storage: {
      kind: 'relation',
      table: MEASURES,
      fk_to_result: 'result_id',
      value_column: 'unit_of_measure',
      filter: { is_active: 1 },
    },
    subfields: [
      sub(MEASURES, 'unit_of_measure', 'Unit of measure', 'text'),
      sub(MEASURES, 'quantity', 'Quantity', 'number'),
    ],
  },
  {
    ...base,
    key: 'ipsr_step_1.is_expert_workshop_organized',
    label:
      'Was an Innovation Packaging and Scaling Readiness online or in-person expert workshop organized?',
    type: 'boolean',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 27,
    required: true,
    storage: col(IPSR_TABLE, 'is_expert_workshop_organized'),
  },
  {
    // D12 (b): first name, last name and role are mandatory in the form, no live rule -> optional, unconfirmed.
    // Shown only when a workshop was organized.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.workshop_facilitators',
    label: 'Facilitators',
    description:
      'if a workshop was organized, list the facilitators of the IPSR workshop. These should only include the people who led the IPSR workshop sessions, not the people who supported workshop logistics and administration.',
    type: 'list',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 28,
    storage: {
      kind: 'relation',
      table: FACILITATORS,
      fk_to_result: 'result_id',
      value_column: 'result_ip_expert_workshop_organized_id',
      filter: { is_active: 1 },
    },
    subfields: [
      sub(FACILITATORS, 'first_name', 'First Name', 'text'),
      sub(FACILITATORS, 'last_name', 'Last Name', 'text'),
      sub(FACILITATORS, 'workshop_role', 'Role', 'text'),
    ],
  },
];
