// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-9 · inventory 2026-A §5 T-1 (`knowledge_product`, page KPI). Keys frozen as written in the inventory.
// Stage 1 per DD-11 + D17 (read-only fields enter stage 1 as read-only values). The model has no read-only
// flag, so each read-only row says so in its description. Only rows stored in `results_knowledge_product`
// (one row per result, keyed by `results_id`) are catalogued here.
// Deferred by D2 (binding through a parent row, the model is not changed): every row stored in
// `results_kp_metadata` / `_authors` / `_keywords` / `_altmetrics` / `_fair_scores` (they reach the result
// through `results_knowledge_product`): `online_date`, `issue_date_cg|wos`, `authors`, `peer_reviewed_*`,
// `is_isi_*` (conditionally required, synced value), `doi`, `accessibility_*`, `keywords`,
// `agrovoc_keywords`, `altmetric`, `fair`. Those tables are IN scope and their columns are listed in
// PENDING_CATALOG (`twoHop`, naming the field) or NOT_FOR_QA; the denormalised FAIR columns of
// `results_knowledge_product` go to PENDING_CATALOG too.
// `knowledge_product.references` has no storage (REVIEW D26): not catalogued, nothing to bind.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026, whenEq } from './shared';

export const KNOWLEDGE_PRODUCT_SECTION: CatalogSection = {
  key: 'knowledge_product',
  label: 'Knowledge product',
  order: 50,
  result_types: ['knowledge_product'],
  ...FROM_2026,
};

const SECTION = KNOWLEDGE_PRODUCT_SECTION.key;
const TABLE = 'results_knowledge_product';
const TYPES = ['knowledge_product'];

const READ_ONLY =
  'Read-only: synced from the repository, not typed by the reporter.';

// Read-only display: no live rule, optional, not confirmed (REVIEW D12 b, D17).
const readOnlyText = (
  key: string,
  label: string,
  order: number,
  column: string,
): CatalogField => ({
  key,
  label,
  description: READ_ONLY,
  type: 'text',
  section: SECTION,
  order,
  result_types: TYPES,
  required: false,
  required_confirmed: false,
  ...FROM_2026,
  storage: { kind: 'column', table: TABLE, column },
});

export const KNOWLEDGE_PRODUCT_FIELDS: CatalogField[] = [
  {
    key: 'knowledge_product.is_melia',
    label: 'Is this knowledge product a MELIA Product?',
    type: 'boolean',
    section: SECTION,
    order: 1,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'is_melia' },
  },
  {
    key: 'knowledge_product.melia_previous_submitted',
    label: 'Do you have a MELIA study planned in your TOC?',
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('knowledge_product.is_melia', true),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'melia_previous_submitted',
    },
  },
  {
    key: 'knowledge_product.melia_type',
    label: 'Select MELIA type',
    type: 'single_select',
    control_list: 'melia_types',
    section: SECTION,
    order: 3,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    // The function also takes this branch when `melia_previous_submitted` is NULL; the model has no
    // "is null" operator, so the condition is the explicit "No" answer.
    required_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', false),
      ],
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'melia_type_id' },
  },
  {
    key: 'knowledge_product.toc_melia_study',
    label:
      'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)',
    type: 'single_select',
    control_list: 'toc_melia_studies',
    section: SECTION,
    order: 4,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', true),
      ],
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'toc_melia_study_id' },
  },
  readOnlyText('knowledge_product.handle', 'Handle', 5, 'handle'),
  readOnlyText(
    'knowledge_product.type',
    'Knowledge product type',
    10,
    'knowledge_product_type',
  ),
  readOnlyText('knowledge_product.licence', 'License', 18, 'licence'),
  // The column name is misspelt in code (`comodity`); kept as is.
  readOnlyText('knowledge_product.commodity', 'Commodity', 21, 'comodity'),
  readOnlyText(
    'knowledge_product.sponsors',
    'Investors/Sponsors',
    22,
    'sponsors',
  ),
];
