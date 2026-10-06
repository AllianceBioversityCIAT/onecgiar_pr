// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-5 (`evidence`). Keys frozen as written in the inventory.
// Subfield keys are the inventory key minus the `evidence.items.` prefix. Deferred to PENDING_CATALOG:
// `evidence.items.is_public_file` and `evidence.items.file` (2-hop through `evidence`, REVIEW D2) and the
// optional subfields (stage 2).
import { CatalogField, CatalogSection, CatalogSubField } from '../types';
import { ALL_TYPES, FROM_2026, RESULT_TYPE_FIELD, whenIn } from './shared';

export const EVIDENCE_SECTION: CatalogSection = {
  key: 'evidence',
  label: 'Evidence',
  order: 60,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = EVIDENCE_SECTION.key;

// Subfields carry no `required_when`, so a conditional flag is `required: false`. The inventory rule
// for each flag (>= 1 active item with the flag when the matching tag is 3 / the readiness level is
// not 0) stays on the inventory row, not as data here (model limit, see the T-8 report).
const evidenceFlag = (
  key: string,
  label: string,
  column: string,
): CatalogSubField => ({
  key,
  label,
  type: 'boolean',
  required: false,
  storage: { kind: 'column', table: 'evidence', column },
});

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
        key: 'link',
        label: 'Link',
        type: 'text',
        required: true,
        storage: { kind: 'column', table: 'evidence', column: 'link' },
      },
      ...[
        evidenceFlag(
          'gender_related',
          'Gender equality, youth and social inclusion',
          'gender_related',
        ),
        // The UI label "Climate adaptation and mitigation" is bound to the column `youth_related`.
        evidenceFlag(
          'climate_related',
          'Climate adaptation and mitigation',
          'youth_related',
        ),
        evidenceFlag(
          'nutrition_related',
          'Nutrition, health and food security',
          'nutrition_related',
        ),
        evidenceFlag(
          'environment_related',
          'Environmental health and biodiversity',
          'environmental_biodiversity_related',
        ),
        evidenceFlag(
          'poverty_related',
          'Poverty reduction, livelihoods and jobs',
          'poverty_related',
        ),
        evidenceFlag(
          'innovation_readiness_related',
          'Innovation Development',
          'innovation_readiness_related',
        ),
      ],
    ],
  },
];
