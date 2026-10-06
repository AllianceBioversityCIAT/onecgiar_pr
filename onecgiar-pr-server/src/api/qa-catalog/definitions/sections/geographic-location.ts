// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-4 (`geographic_location`). Keys frozen as written in the inventory.
// The `geo.extra_*` rows follow the UI intent (Santiago, 2026-10-06): conditionally required,
// `required_confirmed: false` because the live function did not enforce them when the inventory was written.
// Deferred to PENDING_CATALOG: `geo.subnational`, `geo.extra_subnational` (2-hop through
// `result_country`, REVIEW D2).
import { CatalogField, CatalogSection, RequiredWhen } from '../types';
import {
  ALL_TYPES,
  FROM_2026,
  INNOVATION_TYPES,
  whenEq,
  whenIn,
} from './shared';

export const GEOGRAPHIC_LOCATION_SECTION: CatalogSection = {
  key: 'geographic_location',
  label: 'Geographic location',
  order: 40,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = GEOGRAPHIC_LOCATION_SECTION.key;

const WHEN_REGIONS: RequiredWhen = {
  any: [
    whenEq('geo.scope', 2),
    { all: [whenEq('geo.scope', 1), whenEq('geo.regions_specified', true)] },
  ],
};
const WHEN_COUNTRIES: RequiredWhen = {
  any: [
    whenIn('geo.scope', [3, 4, 5]),
    {
      all: [
        whenIn('geo.scope', [1, 2]),
        whenEq('geo.countries_specified', true),
      ],
    },
  ],
};
const WHEN_EXTRA_REGIONS: RequiredWhen = {
  any: [
    whenEq('geo.extra_scope', 2),
    {
      all: [
        whenEq('geo.extra_scope', 1),
        whenEq('geo.extra_regions_specified', true),
      ],
    },
  ],
};
const WHEN_EXTRA_COUNTRIES: RequiredWhen = {
  any: [
    whenIn('geo.extra_scope', [3, 4, 5]),
    {
      all: [
        whenIn('geo.extra_scope', [1, 2]),
        whenEq('geo.extra_countries_specified', true),
      ],
    },
  ],
};

export const GEOGRAPHIC_LOCATION_FIELDS: CatalogField[] = [
  {
    key: 'geo.scope',
    label: 'What is the geographic focus of the result?',
    type: 'single_select',
    control_list: 'geographic_scopes',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
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
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenIn('geo.scope', [1, 2]),
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
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
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
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenIn('geo.scope', [1, 2]),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_countries' },
  },
  {
    key: 'geo.countries',
    label: 'Select countries',
    type: 'multi_select',
    control_list: 'countries',
    section: SECTION,
    order: 5,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: WHEN_COUNTRIES,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { geo_scope_role_id: 1, is_active: 1 },
    },
  },
  {
    key: 'geo.has_extra_scope',
    label:
      'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
    type: 'boolean',
    section: SECTION,
    order: 7,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: true,
    // main scope not in {1 (global), 50 (to be determined)}
    required_when: whenIn('geo.scope', [2, 3, 4, 5]),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'has_extra_geo_scope',
    },
  },
  {
    key: 'geo.extra_scope',
    label:
      'What is the geographic scope where there may be potential impact in other geographic areas?',
    type: 'single_select',
    control_list: 'geographic_scopes',
    section: SECTION,
    order: 8,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    required_when: whenEq('geo.has_extra_scope', true),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'extra_geo_scope_id',
    },
  },
  {
    key: 'geo.extra_regions_specified',
    label: 'Are there any regions that you wish to specify for this result?',
    type: 'boolean',
    section: SECTION,
    order: 9,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    required_when: whenIn('geo.extra_scope', [1, 2]),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_extra_regions' },
  },
  {
    key: 'geo.extra_regions',
    label: 'Select regions',
    type: 'multi_select',
    control_list: 'regions',
    section: SECTION,
    order: 10,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    required_when: WHEN_EXTRA_REGIONS,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_region',
      fk_to_result: 'result_id',
      value_column: 'region_id',
      filter: { geo_scope_role_id: 2 },
    },
  },
  {
    key: 'geo.extra_countries_specified',
    label: 'Are there any countries that you wish to specify for this result?',
    type: 'boolean',
    section: SECTION,
    order: 11,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    required_when: whenIn('geo.extra_scope', [1, 2]),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_extra_countries' },
  },
  {
    key: 'geo.extra_countries',
    label: 'Select countries',
    type: 'multi_select',
    control_list: 'countries',
    section: SECTION,
    order: 12,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    required_when: WHEN_EXTRA_COUNTRIES,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_country',
      fk_to_result: 'result_id',
      value_column: 'country_id',
      filter: { geo_scope_role_id: 2 },
    },
  },
];
