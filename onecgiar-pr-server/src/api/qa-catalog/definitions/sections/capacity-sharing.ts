// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-9 · inventory 2026-A §5 T-2 (`capacity_sharing`, page CDI). Keys frozen as written in the inventory.
// Decision D4 (owner mandate 2026-10-06): the two radio groups over `capdev_term_id` are ONE field
// `capacity_sharing.length_of_training` plus the subfield `degree` on the same column (R-2: one key, one binding).
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026, whenEq } from './shared';

export const CAPACITY_SHARING_SECTION: CatalogSection = {
  key: 'capacity_sharing',
  label: 'Capacity sharing for development',
  order: 50,
  result_types: ['capacity_sharing'],
  ...FROM_2026,
};

const SECTION = CAPACITY_SHARING_SECTION.key;
const TABLE = 'results_capacity_developments';
const TYPES = ['capacity_sharing'];

const countField = (
  key: string,
  label: string,
  order: number,
  column: string,
): CatalogField => ({
  key,
  label,
  description: 'Number of people trained',
  type: 'number',
  section: SECTION,
  order,
  result_types: TYPES,
  required: true,
  required_confirmed: true,
  ...FROM_2026,
  storage: { kind: 'column', table: TABLE, column },
});

export const CAPACITY_SHARING_FIELDS: CatalogField[] = [
  countField('capacity_sharing.female_using', 'Women', 1, 'female_using'),
  countField('capacity_sharing.male_using', 'Men', 2, 'male_using'),
  countField(
    'capacity_sharing.non_binary_using',
    'Non-binary',
    3,
    'non_binary_using',
  ),
  // The column name is misspelt in code (`has_unkown_using`); kept as is.
  countField(
    'capacity_sharing.has_unkown_using',
    'Unknown',
    4,
    'has_unkown_using',
  ),
  {
    key: 'capacity_sharing.length_of_training',
    label: 'Length of training',
    description:
      'Long-term training refers to training that goes for 3 or more months. Short-term training refers to training that goes for less than 3 months. Both long-term and short-term training programs must be completed before reporting.',
    type: 'single_select',
    control_list: 'capdev_terms',
    section: SECTION,
    order: 5,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'capdev_term_id' },
    // "Degree" (PhD / Master) writes the same column (`term_2 ?? term_1`); shown for long-term in practice.
    // No live rule and no subfield `required_when` in the model: optional (REVIEW D12 b, D4).
    subfields: [
      {
        key: 'degree',
        label: 'Degree',
        type: 'single_select',
        control_list: 'capdev_terms',
        required: false,
        storage: { kind: 'column', table: TABLE, column: 'capdev_term_id' },
      },
    ],
  },
  {
    key: 'capacity_sharing.delivery_method',
    label: 'Delivery Method',
    description:
      "If you selected 'In person' or 'Blended', please ensure that you have the correct selections for section 4. Geographic Location.",
    type: 'single_select',
    control_list: 'capdev_delivery_methods',
    section: SECTION,
    order: 6,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'capdev_delivery_method_id',
    },
  },
  {
    key: 'capacity_sharing.is_attending_for_organization',
    label: 'Were the trainees attending on behalf of an organization?',
    type: 'boolean',
    section: SECTION,
    order: 7,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'is_attending_for_organization',
    },
  },
  {
    key: 'capacity_sharing.organizations',
    label: 'Select organizations',
    type: 'multi_select',
    control_list: 'institutions',
    section: SECTION,
    order: 8,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq(
      'capacity_sharing.is_attending_for_organization',
      true,
    ),
    ...FROM_2026,
    // Trainee organizations are `results_by_institution` rows with role 3 (V-CD:28-41).
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 3, is_active: 1 },
    },
  },
];
