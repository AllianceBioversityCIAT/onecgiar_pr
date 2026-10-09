// @akili-spec quality-assurance/qa-field-catalog
import { CatalogResultType } from './types';

// Label/level are provisional until the T-7 inventory confirms them.
export const CATALOG_RESULT_TYPES: CatalogResultType[] = [
  { key: 'policy_change', label: 'Policy change', level: 'outcome' },
  { key: 'innovation_use', label: 'Innovation use', level: 'outcome' },
  { key: 'other_outcome', label: 'Other outcome', level: 'outcome' },
  {
    key: 'capacity_sharing',
    label: 'Capacity sharing for development',
    level: 'output',
  },
  { key: 'knowledge_product', label: 'Knowledge product', level: 'output' },
  {
    key: 'innovation_development',
    label: 'Innovation development',
    level: 'output',
  },
  { key: 'other_output', label: 'Other output', level: 'output' },
  { key: 'impact_contribution', label: 'Impact contribution', level: 'impact' },
  { key: 'innovation_package', label: 'Innovation package', level: 'outcome' },
];
