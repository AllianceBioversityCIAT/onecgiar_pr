// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.4 (IPSR step 1, components S1 / S1E / S1I / S1B). Keys frozen as written there.
// QAC-T-28 (catalog 2026.27): the step is completed against the 2026 form (prtest result 9733, phase 37) and the live function
// validation_ipsr_step_one_P25 (VS1, tmp/). Option B (QAC-T-19): `required` / `required_when` = what the form requires UNION what VS1
// states; `required_confirmed` is true only where VS1 also states it; `visible_when` is transcribed from the form.
//
// Citation legend (client paths under onecgiar-pr-client/src/app/):
//   S1   = pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/step-n1.component.html (S1.ts = .ts)
//   S1E  = .../step-n1/components/step-n1-eoi-outcomes/step-n1-eoi-outcomes.component.html
//   S1I  = .../step-n1/components/step-n1-institutions/step-n1-institutions.component.html
//   S1B  = .../step-n1/components/step-n1-scaling-ambition-blurb/step-n1-scaling-ambition-blurb.component.html
//   GM   = shared/components/geoscope-management/geoscope-management.component.html (GM.ts = .ts)
//   IUF  = shared/components/innovation-use-form/innovation-use-form.component.html (rendered with `isIpsr = true`, S1:30)
//   VS1  = tmp/validation_ipsr_step_one_P25
//
// Decisions (owner mandate 2026-10-06, no model change; QAC-T-28 changes marked):
//  - Geography (`ipsr_step_1.geo_scope`, `.regions`, `.countries`): IPSR variant of the common geography concept, same
//    storage as `geo.scope|regions|countries` (`result.geographic_scope_id`, `result_region`, `result_country`; no
//    `geo_scope_role_id` filter: the IPSR writer leaves it NULL, innovation-pathway-step-one.service.ts:586-690) but its own keys:
//    VS1 does not test geography, so nothing here is function-stated (`required_confirmed: false`), and the common `geo.*` keys list every
//    other type explicitly (never `ALL_TYPES`). QAC-T-28: the rules are the FORM's. The scope radio is `[required]="true"` (GM:10) and
//    offers Global 1, Regional 2, Country 3, Sub-national 5 (GM.ts:30-35; no "to be determined" for module ipsr, :183-184); the server
//    stores 4 for a single-country package (result-innovation-package.service.ts:301) and the client reads it as 3 (S1.ts
//    `legacyCountries`), so the closed list is `ipsr_geographic_scopes` [1, 2, 3, 4, 5]. The "regions specified" / "countries specified"
//    questions render only for module reporting (GM:13,47), so there are no `*_specified` keys and the regions show for scope 2
//    (GM:33-46) and the countries for scope 3 and 5 (GM:63-77; 4 is stored 3). Both pickers are `pr-multi-select` (default required),
//    hence `required_when` = `visible_when`. `ipsr_step_1.countries` changes type `multi_select` -> `list` (PRE-RELEASE type change, same as
//    `geo.countries`, QAC-T-16): each element is a country (`country`) with its sub-national areas (`subnational`, shown for scope 5, one
//    selector per country, GM:78-87). The areas are `result_country_subnational` rows of the element's `result_country` row filtered only by
//    `is_active`: the IPSR writer (saveSubNational) never sets `geo_scope_role_id`, so no role filter exists. As in `geo.countries`,
//    a consumer must skip a country for which CLARISA lists no sub-national areas (reference data, not in the catalog).
//  - `ipsr_step_1.eoi_outcomes` (QAC-T-28; inventory key, section ipsr_s1_ambition): End of Initiative / 2030 outcomes of the package.
//    `result_ip_eoi_outcomes` hangs off the CORE element `result_by_innovation_package` (ipsr_role_id 1), so it is a 2-hop `path` binding
//    from `result` (`result.id -> result_innovation_package_id`, then `result_by_innovation_package_id`). Required: the picker is
//    `[required]="true"` (S1E:13) and VS1:32-41 requires >= 1 active outcome (function-stated, confirmed). The form renders the picker only
//    when the package has an initiative (S1:27, `detailData.inititiative_id`); that is not a catalog field, so no `visible_when` can state
//    it (documented gap: apply the rule to a package that has an initiative; VS1 requires the outcome regardless).
//  - `ipsr_step_1.scaling_partners` (QAC-T-28; section ipsr_s1_partners): `results_by_institution` role 5, a `list` whose elements carry the
//    same identity/type/role subfields as the external partners (`PARTNER_SUBFIELDS`: `institution`, `partner_type`, `partner_role`).
//    The picker is a `pr-multi-select` with the default `required` and the marker `[isComplete]="!!body?.institutions?.length"` (S1I:7), so
//    the form needs >= 1 partner, but VS1 passes with 0 partners (VS1:211-237) -> `required: true, required_confirmed: false`. The role of
//    every selected partner is required by the form (S1I:23-29) AND stated by VS1:211-237 (each partner with a delivery row: distinct partners
//    with a delivery must equal the partner count); `partner_role` is `required: true`.
//  - `ipsr_step_1.scaling_ambition_blurb` (QAC-T-28): the auto-generated 2030 Scaling Ambition Statement, READ-ONLY in the form (S1B, copy
//    button only; generated on GET, innovation-pathway-step-one.service.ts:266); optional, not confirmed.
//  - Targeted use (`ipsr_step_1.targeted_use.*`): same tables and subfields as the innovation use current-use block
//    (QAC-T-10) with the IPSR filters of the inventory (actors without `section_id`; the page shares the form with
//    `isIpsr = true`). QAC-T-28: the subfields carry the rules of the shared form (IUF) and of VS1, consistent with QAC-T-19/25 for
//    innovation use. Only what the IPSR render shows is catalogued: IUF:135 renders "Age disaggregation not available" through
//    `showAgeFallback()`, which is false when `isIpsr`, so `age_disaggregation_not_available` and `youth_split_applied_by_system` are not
//    subfields here. There is no "yet to be determined" tick in IPSR (IUF:1 `@if (!isIpsr)`; S1.ts sets it false), so the lists are always shown.
//    The any-of rule of the three lists (VS1:43-117: at least one complete entry across actors / organizations / measures; once rows exist
//    every active row must be complete, VS1:137-209) has no gate field in IPSR and `required_when` cannot say "at least one of the
//    sibling lists has a row", so the lists are `required: false, required_confirmed: true` and the rule stays here (function-stated,
//    not expressible). They carry no `description` (no form help text). Row rules: every row control is `[required]="!!id"` (required once
//    the row exists), hence `required: true` / `required_when` on the subfields; the women / youth / men / youth counters and `how_many`
//    follow the disaggregation tick (IUF:152-231), "other" texts follow the type 5 / 78 (IUF:112,282). A NULL `sex_and_age_disaggregation` is
//    read as false (contract known gap 11). The organizations list filters role 5 and `is_active` like the reader and writer
//    (innovation-pathway-step-one.service.ts:191-196,1186); VS1:81-105 has no role filter but requires `institution_roles_id` NOT NULL on every
//    active row of the result, and the package writer only creates role 5 rows. Actors and measures have no section (VS1 reads all active rows).
//  - REVIEW D3 (a): "Organization" and "Sub-type" write the same column `institution_types_id`; one subfield
//    `institution_type` with the 2-level control list `institution_types` (the inventory `institution_sub_type` row has no
//    key of its own, R-2).
//  - Expert workshop (QAC-T-28): `is_expert_workshop_organized` (required, VS1:119, confirmed) drives the visibility of the facilitators, the
//    participants link and the consent question (S1:52,72,80). The facilitators list header is `[required]="false"` (S1:55) and an empty list
//    is allowed ("No facilitators provided"), so the list is optional; each row's first name, last name and role are `[required]="true"`
//    (S1:64,65,67), so those subfields are `required: true`; VS1 does not test them (REVIEW D12 (b)), hence `required_confirmed: false` on
//    the list. Email is optional (S1:66). The participants link is evidence type 5 (S1:80-87, `[required]="false"`). The consent radio is
//    `pr-radio-button` (default required) and is shown only while a workshop was organized AND the participants link is a valid URL
//    (S1.ts `validateParticipantsConsent`, a URL regex on a sibling value; the value is sent as NULL otherwise). The URL test is not
//    expressible, so `visible_when` is the workshop answer only and the field stays `required: false` on purpose: requiring it on the workshop
//    answer alone would flag a package whose link is empty, where the form never asks the question (documented gap).
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  Condition,
} from '../types';
import { FROM_2026, whenEq, whenIn } from './shared';
import {
  IPSR_ELEMENT_TABLE,
  IPSR_TABLE,
  IPSR_TYPES,
  ROLE_CORE,
  SubRule,
  col,
  sub,
} from './ipsr-shared';
import { PARTNER_SUBFIELDS } from './contributors-partners';

export const IPSR_S1_GEOSCOPE_SECTION: CatalogSection = {
  key: 'ipsr_s1_geoscope',
  label: 'Geographic scope',
  order: 79,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
// QAC-T-28: inventory section of `ipsr_step_1.eoi_outcomes` (S1E, header "Scaling ambition").
export const IPSR_S1_AMBITION_SECTION: CatalogSection = {
  key: 'ipsr_s1_ambition',
  label: 'Scaling ambition',
  order: 80,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S1_TARGETED_USE_SECTION: CatalogSection = {
  key: 'ipsr_s1_targeted_use',
  label: 'Targeted innovation use',
  order: 81,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
// QAC-T-28: inventory section of the scaling partners and the generated statement (S1I, S1B).
export const IPSR_S1_PARTNERS_SECTION: CatalogSection = {
  key: 'ipsr_s1_partners',
  label: 'Scaling partners',
  order: 82,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};
export const IPSR_S1_EXPERTS_SECTION: CatalogSection = {
  key: 'ipsr_s1_experts',
  label: 'Expert workshop',
  order: 83,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

const ACTORS = 'result_actors';
const ORGS = 'results_by_institution_type';
const MEASURES = 'result_ip_measure';
const FACILITATORS = 'result_ip_expert_workshop_organized';

const SCOPE = 'ipsr_step_1.geo_scope';
const WORKSHOP = 'ipsr_step_1.is_expert_workshop_organized';

/** The type of institution that opens the free-text "Other organization" box (IUF:282). */
const OTHER_INSTITUTION_TYPE = 78;
/** IUF:319: "# of graduate students" is rendered only for the institution type 50. */
const GRADUATE_STUDENTS_TYPE = 50;

// Geography rules of the IPSR form (GM:33-87). The scope ids are the closed list `ipsr_geographic_scopes`; 4 is the stored country.
const WHEN_REGIONS: Condition = whenEq(SCOPE, 2);
const WHEN_COUNTRIES: Condition = whenIn(SCOPE, [3, 4, 5]);
const WHEN_SUBNATIONAL: Condition = whenEq(SCOPE, 5);
const WHEN_WORKSHOP: Condition = whenEq(WORKSHOP, true);

const base = {
  result_types: IPSR_TYPES,
  required: false,
  required_confirmed: true,
  ...FROM_2026,
};

// Row rules of the shared innovation-use form (IUF) with `isIpsr = true`; same gates as `innovation_use.current_use.*` (QAC-T-19/25).
const ALWAYS: SubRule = { required: true };
const WHEN_DISAGGREGATED: SubRule = {
  required_when: whenEq('sex_and_age_disaggregation', false),
  visible_when: whenEq('sex_and_age_disaggregation', false),
};

/** One country of the IPSR geography: the country and, for scope 5, its sub-national areas (GM:63-87). */
const countrySubfields = (): CatalogSubField[] => [
  {
    key: 'country',
    label: 'Country',
    type: 'single_select',
    control_list: 'countries',
    // identity of the element: a country row always has its country
    required: true,
    storage: { kind: 'column', table: 'result_country', column: 'country_id' },
  },
  {
    key: 'subnational',
    label: 'Sub-national levels',
    type: 'multi_select',
    control_list: 'subnational_areas',
    visible_when: WHEN_SUBNATIONAL,
    // required (>= 1) for a country that has areas in CLARISA, not expressible (see the header); one selector per country (GM:78-87)
    required_when: WHEN_SUBNATIONAL,
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'result_country_subnational',
          join: [{ from: 'result_country_id', to: 'result_country_id' }],
          // the IPSR writer leaves `geo_scope_role_id` NULL: no role filter, only active rows (the reader, step-one.service.ts:148-153)
          filter: { is_active: 1 },
        },
      ],
      value_column: 'clarisa_subnational_scope_code',
    },
  },
];

export const IPSR_STEP_1_FIELDS: CatalogField[] = [
  {
    // Closed list `ipsr_geographic_scopes`: Global / Regional / Country / Sub-national (no "to be determined" for module ipsr) + stored 4.
    // GM:1-10 `[required]="true"`; VS1 does not test it -> form-only.
    ...base,
    required: true,
    required_confirmed: false,
    key: SCOPE,
    label:
      'Select country/ geoscope for which packaging and scaling readiness assessment will be conducted',
    type: 'single_select',
    control_list: 'ipsr_geographic_scopes',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 1,
    storage: col('result', 'geographic_scope_id'),
  },
  {
    // GM:33-46 (scope Regional; the "regions specified" question is not rendered for module ipsr); pr-multi-select, default required.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.regions',
    label: 'Select regions',
    type: 'multi_select',
    control_list: 'regions',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 2,
    visible_when: WHEN_REGIONS,
    required_when: WHEN_REGIONS,
    storage: {
      kind: 'relation',
      table: 'result_region',
      fk_to_result: 'result_id',
      value_column: 'region_id',
      filter: { is_active: 1 },
    },
  },
  {
    // GM:63-77 (scope Country or Sub-national, stored 4 included). Pre-release type change multi_select -> list (QAC-T-28, see the
    // header): each element is a country with its sub-national areas. The key and the stored rows are unchanged.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.countries',
    label: 'Select countries',
    type: 'list',
    section: IPSR_S1_GEOSCOPE_SECTION.key,
    order: 3,
    visible_when: WHEN_COUNTRIES,
    required_when: WHEN_COUNTRIES,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { is_active: 1 },
    },
    subfields: countrySubfields(),
  },
  {
    // S1E:6-17 `[required]="true"`; VS1:32-41 (>= 1 active outcome of the core element, function-stated). The form shows the picker only
    // when the package has an initiative (S1:27): not expressible, see the header. The control list is the End of Initiative outcomes
    // (ToC results) offered by the step; the stored value is `toc_result_id`.
    ...base,
    key: 'ipsr_step_1.eoi_outcomes',
    label: 'Specify aspired outcomes and impact',
    description:
      'Specify to which 2030 outcomes the scaling of the core innovation is expected to contribute to by 2030 in the specific geo context.',
    type: 'multi_select',
    control_list: 'eoi_outcomes',
    section: IPSR_S1_AMBITION_SECTION.key,
    order: 5,
    required: true,
    storage: {
      kind: 'path',
      steps: [
        {
          // the core element of the package (VS1:12-26 reads the role 1 row)
          table: IPSR_ELEMENT_TABLE,
          join: [{ from: 'id', to: 'result_innovation_package_id' }],
          filter: { ipsr_role_id: ROLE_CORE, is_active: 1 },
        },
        {
          table: 'result_ip_eoi_outcomes',
          join: [
            {
              from: 'result_by_innovation_package_id',
              to: 'result_by_innovation_package_id',
            },
          ],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'toc_result_id',
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
      // IUF:100 (`[required]="!!result_actors_id"`); VS1:137-173 reads the type of every row.
      sub(
        ACTORS,
        'actor_type',
        'Actor type',
        'single_select',
        'actor_type_id',
        'actor_types',
        ALWAYS,
      ),
      // IUF:112 (input only for the type 5) ; VS1:62-65,153-157.
      sub(
        ACTORS,
        'other_actor_type',
        'Other actor type',
        'text',
        'other_actor_type',
        undefined,
        {
          required_when: whenEq('actor_type', 5),
          visible_when: whenEq('actor_type', 5),
        },
      ),
      sub(
        ACTORS,
        'sex_and_age_disaggregation',
        'Sex and age disaggregation does not apply',
        'boolean',
      ),
      // IUF:152-204 (`[required]="!!result_actors_id"`, shown while the disaggregation tick is off); VS1:148-153 for the four counters
      // of a type other than 5 (the form's wider rule, every type, is used).
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
      // IUF:221-231 (read-only "Total" while the tick is off, always rendered) and :233-242 (typed "How many" while it is on, required);
      // VS1:161-162.
      sub(ACTORS, 'how_many', 'How many', 'number', 'how_many', undefined, {
        required_when: whenEq('sex_and_age_disaggregation', true),
      }),
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
      // IUF:265-278 (`[required]="!!id"`); VS1:183-185.
      sub(
        ORGS,
        'institution_type',
        'Organization',
        'single_select',
        'institution_types_id',
        'institution_types',
        ALWAYS,
      ),
      // IUF:280-289 (shown and required for the type 78); VS1:186-191.
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
      // IUF:311-318 (`[required]="!!id"`); VS1:185.
      sub(
        ORGS,
        'how_many',
        'How many',
        'number',
        'how_many',
        undefined,
        ALWAYS,
      ),
      // IUF:319-327 (type 50 only, `[required]="false"`); no rule in VS1.
      {
        ...sub(ORGS, 'graduate_students', '# of graduate students', 'number'),
        visible_when: whenEq('institution_type', GRADUATE_STUDENTS_TYPE),
      },
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
      // IUF:347-364 (`[required]="!!result_ip_measure_id"`); VS1:204-207.
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
    ],
  },
  {
    // S1I:1-15. The picker needs >= 1 partner in the form; VS1 passes with 0 partners -> form-only. Each partner needs a role (S1I:23-29;
    // VS1:211-237), carried by `partner_role` (required: true).
    ...base,
    required: true,
    required_confirmed: false,
    key: 'ipsr_step_1.scaling_partners',
    label: 'Specify scaling partners',
    description:
      'Which government, public or private sector organization is expected to scale the innovation in the selected geoscope?',
    type: 'list',
    section: IPSR_S1_PARTNERS_SECTION.key,
    order: 24,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 5, is_active: 1 },
    },
    subfields: PARTNER_SUBFIELDS,
  },
  {
    // S1B:1-13: read-only, generated on GET from the other fields of the step (the form has only a copy button). No rule.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.scaling_ambition_blurb',
    label: '2030 Scaling Ambition Statement (auto-generated)',
    description:
      'The text below is auto-generated according to the information provided in the section. Please save this section for the Scaling Ambition blurb to update.',
    type: 'text',
    section: IPSR_S1_PARTNERS_SECTION.key,
    order: 26,
    storage: col(IPSR_TABLE, 'scaling_ambition_blurb'),
  },
  {
    // S1:43-50 (radio, default required); VS1:119 NULL fails. Options "Yes, an expert workshop was organized" / "No expert workshop was organized".
    ...base,
    key: WORKSHOP,
    label:
      'Was an Innovation Packaging and Scaling Readiness online or in-person expert workshop organized?',
    type: 'boolean',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 27,
    required: true,
    storage: col(IPSR_TABLE, 'is_expert_workshop_organized'),
  },
  {
    // S1:52-78 (shown only when a workshop was organized, `=== true`). The list header is `[required]="false"` and an empty list is allowed
    // (S1:55,73-76): optional; the rows' first name, last name and role are mandatory (S1:64,65,67) and carry `required: true`; no rule in
    // VS1 (REVIEW D12 (b)) -> unconfirmed.
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.workshop_facilitators',
    label: 'Facilitators',
    description:
      'if a workshop was organized, list the facilitators of the IPSR workshop. These should only include the people who led the IPSR workshop sessions, not the people who supported workshop logistics and administration.',
    type: 'list',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 28,
    visible_when: WHEN_WORKSHOP,
    storage: {
      kind: 'relation',
      table: FACILITATORS,
      fk_to_result: 'result_id',
      value_column: 'result_ip_expert_workshop_organized_id',
      filter: { is_active: 1 },
    },
    subfields: [
      sub(
        FACILITATORS,
        'first_name',
        'First Name',
        'text',
        'first_name',
        undefined,
        ALWAYS,
      ),
      sub(
        FACILITATORS,
        'last_name',
        'Last Name',
        'text',
        'last_name',
        undefined,
        ALWAYS,
      ),
      // S1:66 `[required]="false"`
      sub(FACILITATORS, 'email', 'Email', 'text'),
      sub(
        FACILITATORS,
        'workshop_role',
        'Role',
        'text',
        'workshop_role',
        undefined,
        ALWAYS,
      ),
    ],
  },
  {
    // S1:80-87 (shown when a workshop was organized, `[required]="false"`); evidence type 5 (IPSR workshop participants list), the reader
    // takes the first row (innovation-pathway-step-one.service.ts:270-276).
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.workshop_participants_link',
    label: 'Provide the link to the workshop list of participants',
    description: 'A template participant list can be downloaded here',
    type: 'text',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 33,
    visible_when: WHEN_WORKSHOP,
    storage: {
      kind: 'relation',
      table: 'evidence',
      fk_to_result: 'result_id',
      value_column: 'link',
      filter: { evidence_type_id: 5, is_active: 1 },
    },
  },
  {
    // S1:89-98: shown while a workshop was organized AND the link above is a valid URL (S1.ts:94-106); the second condition is not
    // expressible, so `visible_when` is the workshop answer and the field stays optional (documented gap, see the header).
    ...base,
    required_confirmed: false,
    key: 'ipsr_step_1.participants_consent',
    label:
      'Have all participants in the provided list given their consent for their information to be shared in accordance with GDPR requirements?',
    description: 'See more about GDPR requirements.',
    type: 'boolean',
    section: IPSR_S1_EXPERTS_SECTION.key,
    order: 34,
    visible_when: WHEN_WORKSHOP,
    storage: col(IPSR_TABLE, 'participants_consent'),
  },
];
