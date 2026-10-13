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
      'Long-term training refers to training that goes for 3 or more months. Short-term training refers to training that goes for less than 3 months. Both long-term and short-term training programs must be completed before reporting (to avoid reporting the same trainee multiple times across years).',
    type: 'single_select',
    control_list: 'capdev_training_lengths',
    section: SECTION,
    order: 5,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'capdev_term_id' },
    // STORAGE (QAC-T-25): "Length of training" and "Degree" are two form controls over ONE column (`capdev_term_id = term_2 ?? term_1`,
    // cap-dev-info.component.ts:235; the degree is nulled unless the length is 4, :234). Both keys bind the RAW stored id and are read
    // through the normalization of contract known gap 17: a stored 1/2 is length 4 + that degree (load maps it back, .ts:206-209), a stored 3/4
    // is the length alone with NO degree. The `visible_when` of `degree` applies to the normalized reading; the future results endpoint
    // normalizes (no model extension, owner decision).
    // Degree: optional (the form passes `[required]="false"`, cap-dev-info.component.html:61; the live function has no rule for it, REVIEW D12 b, D4)
    // and displayed only for Long-term (html:55-56 is wider only because it also tests the stored 1/2 the load maps back to 4; those branches
    // are unreachable once loaded).
    subfields: [
      {
        key: 'degree',
        label: 'Degree',
        type: 'single_select',
        control_list: 'capdev_degrees',
        required: false,
        visible_when: whenEq('capacity_sharing.length_of_training', 4),
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
    // Form: the multi-select renders only when the answer is Yes and is `[required]="true"`
    // (cap-dev-info.component.html:91-101); function: validation_capacity_dev_P25 (organization count when attending = TRUE).
    required: false,
    required_confirmed: true,
    required_when: whenEq(
      'capacity_sharing.is_attending_for_organization',
      true,
    ),
    visible_when: whenEq(
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
