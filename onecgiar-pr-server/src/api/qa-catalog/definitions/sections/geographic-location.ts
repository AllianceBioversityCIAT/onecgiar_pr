// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-4 (`geographic_location`). Keys frozen as written in the inventory.
// QAC-T-16 (2026-10-07, catalog 2026.15): the section is fully parametrized for RESULTS (visible_when / required_when per field,
// the country lists carry their sub-national areas as a subfield). IPSR geography (`ipsr_step_1.geo_scope|regions|countries`) is out
// of scope here (owner: deferred) and keeps its own keys in ipsr-step-1.ts. Not for `innovation_package`: the live IPSR step-1
// function applies none of these rules, so every type is listed explicitly, never `ALL_TYPES`.
//
// Citation legend (client paths under onecgiar-pr-client/src/app/):
//   GEO.html = pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.html (GEO.ts = .ts)
//   GM.html  = shared/components/geoscope-management/geoscope-management.component.html (GM.ts = .ts)
//   SG.html  = shared/components/geoscope-management/components/sub-geoscope/sub-geoscope.component.html
//   FM       = shared/services/fields-manager.service.ts
//   V-GEO    = tmp/validation_geo_location_P25 (live P25 function)
//   V-FIX    = tmp/validation_geo_location_P25.FIXED.sql (owner-approved fix of the extra-scope branch, 2026-10-06; compares
//              `extra_geo_scope_id`, and requires it once the extra scope is on)
// `required_confirmed: true` only where V-GEO states the rule. The `geo.extra_*` rows follow the UI intent (Santiago, 2026-10-06) and
// V-FIX: `required_confirmed: false` until the fix is applied in the environment (the live function does not read `extra_geo_scope_id`).
//
// Labels of the four `geo.extra_*` region/country fields: the form's own label (same geoscope-management component as the main block)
// plus the qualifier taken verbatim from the extra block question (rd-geographic-location.component.html:56, "...potential impact in
// other geographic areas?"); label disambiguated for QA (owner 2026-10-08, QAC-T-23). Keys unchanged.
//
// The SAME `app-geoscope-management` component renders the main block (`body` = the main body) and the extra block (`body` = the extra
// body, extra scope in `geo_scope_id`, "To be determined" hidden: GEO.html:54-60), so every extra rule below is the main rule with
// `geo.extra_*` keys, nested inside the extra block gate (EXTRA_BLOCK: main scope not Global/TBD, GEO.html:32, and "other areas" = Yes, GEO.html:54).
//
// Scope ids (closed list `geographic_scopes`, closed-control-lists.ts): 1 Global, 2 Regional, 3 Country, 5 Sub-national, 50 To be
// determined, and the stored LEGACY id 4 (a country scope written by IPSR and old data; the client reads it as 3, GEO.ts:292-309; V-GEO
// treats `IN (3, 4)` alike). Conditions that name 3 also name 4 for that reason.
//
// Not expressible as catalog data (recorded, not invented):
//  - The sub-national picker only shows for a country that HAS sub-national areas (SG.html:24-27, `subNationList` comes from CLARISA per
//    country); V-GEO:112-127 likewise requires >= 1 area only for such a country. Reference data, not a catalog key, so `subnational`
//    carries `required_when` "scope = 5" and a consumer must skip countries whose CLARISA list is empty.
//  - Scope 5 with zero countries PASSES the live function (V-GEO:112-127, REVIEW D25), but the FORM requires >= 1 country for scope 5
//    (GM.html:63-76), so since QAC-T-19 (option B, `required` = form + live function) `geo.countries` / `geo.extra_countries` are required
//    for scope 5 as form-only rules (`required_confirmed: false`; was: not required for 5 under QAC-T-16).
//  - Scope 2 (Regional) hides the regions Yes-No (GM.html:28 `hideOptions`; the answer is forced to Yes by `resetHasScope`, GM.ts:99-103),
//    so `regions_specified` is visible only for scope 1; the countries Yes-No shows for scope 1 and 2 (GM.html:60).
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  Condition,
} from '../types';
import {
  FROM_2026,
  INNOVATION_TYPES,
  NON_IPSR_TYPES,
  whenEq,
  whenIn,
} from './shared';

export const GEOGRAPHIC_LOCATION_SECTION: CatalogSection = {
  key: 'geographic_location',
  label: 'Geographic location',
  order: 40,
  result_types: NON_IPSR_TYPES,
  ...FROM_2026,
};

const SECTION = GEOGRAPHIC_LOCATION_SECTION.key;

const all = (...conditions: Condition[]): Condition => ({ all: conditions });
const any = (...conditions: Condition[]): Condition => ({ any: conditions });

// ---- main block ---------------------------------------------------------------------------------------------------------------
// regions_specified: GM.html:15-32 shows it for scope 1 and 2 (not 3, 4, 5, 50), with the Yes/No options only for scope 1 (:28).
// V-GEO:50-67: `has_regions = TRUE OR scope = 2` is checked first, so only scope 1 can fail on a NULL answer (:63-65).
const WHEN_REGIONS_SPECIFIED: Condition = whenEq('geo.scope', 1);
// regions: GM.html:33 `scope == 2 || has_regions`; V-GEO:50-61 (>= 1 active role-1 region).
const WHEN_REGIONS: Condition = any(
  whenEq('geo.scope', 2),
  all(whenEq('geo.scope', 1), whenEq('geo.regions_specified', true)),
);
// countries_specified: GM.html:48-62 (options for scope 1 and 2); V-GEO:69-86 (NULL fails for scope 1, 2, :82-84).
const WHEN_COUNTRIES_SPECIFIED: Condition = whenIn('geo.scope', [1, 2]);
// countries picker is SHOWN for scope 3 and 5, or after "Yes" for scope 1 and 2 (GM.html:63; 4 is read as 3, GEO.ts:292-294).
const WHEN_COUNTRIES_VISIBLE: Condition = any(
  whenIn('geo.scope', [3, 4, 5]),
  all(whenIn('geo.scope', [1, 2]), whenEq('geo.countries_specified', true)),
);
// ... and REQUIRED (>= 1 active role-1 country) whenever the picker is shown (QAC-T-19, option B: required follows the form): GM.html:63-76
// (`app-pr-multi-select` default required + `appFeedbackValidation` `countries.length > 0`, for scope 3, 5 and scope 1/2 after "Yes").
// V-GEO:93-106 states it for scope 3, 4 and V-GEO:69-80 for scope 1, 2 with "Yes"; scope 5 with no country PASSES the live function
// (V-GEO:110-131, REVIEW D25), so the scope 5 part is FORM-ONLY (before T-19 scope 5 was not required) and `required_confirmed` is false.
const WHEN_COUNTRIES_REQUIRED: Condition = WHEN_COUNTRIES_VISIBLE;
// sub-national areas: SG.html (one picker per selected country) only for scope 5 (GM.html:78); V-GEO:110-131 (per country that has areas).
const WHEN_SUBNATIONAL: Condition = whenEq('geo.scope', 5);

// ---- extra block (innovations) --------------------------------------------------------------------------------------------------
// The question exists when the main scope is not Global / TBD (GEO.html:32; V-GEO:133 `scope NOT IN (1, 50)`), and the block shows
// after "Yes" (GEO.html:54; V-GEO:145 / V-FIX:145).
const WHEN_EXTRA_QUESTION: Condition = whenIn('geo.scope', [2, 3, 4, 5]);
const EXTRA_BLOCK: Condition = all(
  WHEN_EXTRA_QUESTION,
  whenEq('geo.has_extra_scope', true),
);
const WHEN_EXTRA_REGIONS_SPECIFIED: Condition = all(
  EXTRA_BLOCK,
  whenEq('geo.extra_scope', 1),
);
const WHEN_EXTRA_REGIONS: Condition = all(
  EXTRA_BLOCK,
  any(
    whenEq('geo.extra_scope', 2),
    all(
      whenEq('geo.extra_scope', 1),
      whenEq('geo.extra_regions_specified', true),
    ),
  ),
);
const WHEN_EXTRA_COUNTRIES_SPECIFIED: Condition = all(
  EXTRA_BLOCK,
  whenIn('geo.extra_scope', [1, 2]),
);
const WHEN_EXTRA_COUNTRIES_VISIBLE: Condition = all(
  EXTRA_BLOCK,
  any(
    whenIn('geo.extra_scope', [3, 4, 5]),
    all(
      whenIn('geo.extra_scope', [1, 2]),
      whenEq('geo.extra_countries_specified', true),
    ),
  ),
);
// Same widening as the main block (QAC-T-19): required whenever the picker is shown, incl. extra scope 5 (GM.html:63-76).
const WHEN_EXTRA_COUNTRIES_REQUIRED: Condition = WHEN_EXTRA_COUNTRIES_VISIBLE;
const WHEN_EXTRA_SUBNATIONAL: Condition = all(
  EXTRA_BLOCK,
  whenEq('geo.extra_scope', 5),
);

/**
 * One element of a country list (`result_country` row of one role): the country and, for scope 5, its sub-national areas
 * (`result_country_subnational` rows of THAT result_country row and the same role; the area is the CLARISA `code`, SG.html:34).
 * `role` is the `geo_scope_role` id: 1 Main, 2 Extra (migration 1761222250119; `EnumGeoScopeRole`).
 */
const countrySubfields = (
  role: 1 | 2,
  subnationalWhen: Condition,
): CatalogSubField[] => [
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
    visible_when: subnationalWhen,
    // required (>= 1) for a country that has areas in CLARISA, not expressible (see header); V-GEO:110-131 (main), V-FIX:215-243 (extra)
    required_when: subnationalWhen,
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'result_country_subnational',
          join: [{ from: 'result_country_id', to: 'result_country_id' }],
          filter: { geo_scope_role_id: role, is_active: 1 },
        },
      ],
      value_column: 'clarisa_subnational_scope_code',
    },
  },
];

export const GEOGRAPHIC_LOCATION_FIELDS: CatalogField[] = [
  {
    key: 'geo.scope',
    label: 'What is the geographic focus of the result?',
    type: 'single_select',
    control_list: 'geographic_scopes',
    section: SECTION,
    order: 1,
    result_types: NON_IPSR_TYPES,
    // GM.html:1-11 (always shown, `[required]="true"`); V-GEO:34-37 NULL fails, :38-40 scope 50 passes
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'geographic_scope_id',
    },
  },
  {
    key: 'geo.regions_specified',
    label: 'Are there any regions that you wish to specify for this result?',
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: NON_IPSR_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: WHEN_REGIONS_SPECIFIED,
    required_when: WHEN_REGIONS_SPECIFIED,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_regions' },
  },
  {
    key: 'geo.regions',
    label: 'Select regions',
    type: 'multi_select',
    control_list: 'regions',
    section: SECTION,
    order: 3,
    result_types: NON_IPSR_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: WHEN_REGIONS,
    required_when: WHEN_REGIONS,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_region',
      fk_to_result: 'result_id',
      value_column: 'region_id',
      filter: { geo_scope_role_id: 1, is_active: 1 },
    },
  },
  {
    key: 'geo.countries_specified',
    label: 'Are there any countries that you wish to specify for this result?',
    type: 'boolean',
    section: SECTION,
    order: 4,
    result_types: NON_IPSR_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: WHEN_COUNTRIES_SPECIFIED,
    required_when: WHEN_COUNTRIES_SPECIFIED,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_countries' },
  },
  {
    // Pre-release type change multi_select -> list authorized by the owner (2026-10-07, QAC-T-16): each element is a country with
    // its sub-national areas. The key is unchanged; the stored set stays the role 1 rows of `result_country`.
    key: 'geo.countries',
    label: 'Select countries',
    type: 'list',
    section: SECTION,
    order: 5,
    result_types: NON_IPSR_TYPES,
    required: false,
    // partly function-stated (scope 1, 2, 3, 4); scope 5 is form-only (see WHEN_COUNTRIES_REQUIRED)
    required_confirmed: false,
    visible_when: WHEN_COUNTRIES_VISIBLE,
    required_when: WHEN_COUNTRIES_REQUIRED,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { geo_scope_role_id: 1, is_active: 1 },
    },
    subfields: countrySubfields(1, WHEN_SUBNATIONAL),
  },
  {
    // GEO.html:32-52 (shown for scope 2, 3, 4, 5; FM:268-274 hides it for P22 and non-innovations, which `result_types` covers);
    // V-GEO:133-136 (innovation types 2, 7 and scope not 1 / 50: NULL fails, :135).
    key: 'geo.has_extra_scope',
    label:
      'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
    type: 'boolean',
    section: SECTION,
    order: 6,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: WHEN_EXTRA_QUESTION,
    required_when: WHEN_EXTRA_QUESTION,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'has_extra_geo_scope',
    },
  },
  {
    // GEO.html:54-60 (FM:275-280); V-FIX:149 (`extra_geo_scope IS NULL` fails). The live function never reads the column.
    key: 'geo.extra_scope',
    label:
      'What is the geographic scope where there may be potential impact in other geographic areas?',
    type: 'single_select',
    control_list: 'geographic_scopes',
    section: SECTION,
    order: 7,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    visible_when: EXTRA_BLOCK,
    required_when: EXTRA_BLOCK,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'extra_geo_scope_id',
    },
  },
  {
    // same component as the main block, `extra_geo_scope_id` as scope (GEO.html:55-60); V-FIX:153-171
    key: 'geo.extra_regions_specified',
    label:
      'Are there any regions that you wish to specify for this result? (potential impact in other geographic areas)',
    type: 'boolean',
    section: SECTION,
    order: 8,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    visible_when: WHEN_EXTRA_REGIONS_SPECIFIED,
    required_when: WHEN_EXTRA_REGIONS_SPECIFIED,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_extra_regions' },
  },
  {
    // V-FIX:155-166 (>= 1 active role-2 region)
    key: 'geo.extra_regions',
    label: 'Select regions (potential impact in other geographic areas)',
    type: 'multi_select',
    control_list: 'regions',
    section: SECTION,
    order: 9,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    visible_when: WHEN_EXTRA_REGIONS,
    required_when: WHEN_EXTRA_REGIONS,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_region',
      fk_to_result: 'result_id',
      value_column: 'region_id',
      filter: { geo_scope_role_id: 2, is_active: 1 },
    },
  },
  {
    // V-FIX:174-192
    key: 'geo.extra_countries_specified',
    label:
      'Are there any countries that you wish to specify for this result? (potential impact in other geographic areas)',
    type: 'boolean',
    section: SECTION,
    order: 10,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    visible_when: WHEN_EXTRA_COUNTRIES_SPECIFIED,
    required_when: WHEN_EXTRA_COUNTRIES_SPECIFIED,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_extra_countries' },
  },
  {
    // Pre-release type change multi_select -> list authorized by the owner (2026-10-07, QAC-T-16); same shape as `geo.countries`
    // with the role 2 rows. V-FIX:174-213 (countries), :215-243 (sub-national per country).
    key: 'geo.extra_countries',
    label: 'Select countries (potential impact in other geographic areas)',
    type: 'list',
    section: SECTION,
    order: 11,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    visible_when: WHEN_EXTRA_COUNTRIES_VISIBLE,
    required_when: WHEN_EXTRA_COUNTRIES_REQUIRED,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { geo_scope_role_id: 2, is_active: 1 },
    },
    subfields: countrySubfields(2, WHEN_EXTRA_SUBNATIONAL),
  },
];
