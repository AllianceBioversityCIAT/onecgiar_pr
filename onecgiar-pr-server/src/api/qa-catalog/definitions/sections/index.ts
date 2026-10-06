// @akili-spec quality-assurance/qa-field-catalog
import { CatalogField, CatalogSection } from '../types';
import {
  CONTRIBUTORS_PARTNERS_FIELDS,
  CONTRIBUTORS_PARTNERS_SECTION,
} from './contributors-partners';
import {
  CAPACITY_SHARING_FIELDS,
  CAPACITY_SHARING_SECTION,
} from './capacity-sharing';
import { EVIDENCE_FIELDS, EVIDENCE_SECTION } from './evidence';
import {
  GENERAL_INFORMATION_FIELDS,
  GENERAL_INFORMATION_SECTION,
} from './general-information';
import {
  GEOGRAPHIC_LOCATION_FIELDS,
  GEOGRAPHIC_LOCATION_SECTION,
} from './geographic-location';
import {
  INNOVATION_DEVELOPMENT_FIELDS,
  INNOVATION_DEVELOPMENT_SECTION,
} from './innovation-development';
import {
  KNOWLEDGE_PRODUCT_FIELDS,
  KNOWLEDGE_PRODUCT_SECTION,
} from './knowledge-product';
import {
  LINKED_RESULTS_FIELDS,
  LINKED_RESULTS_SECTION,
} from './linked-results';
import {
  INNOVATION_USE_FIELDS,
  IU_CURRENT_USE_SECTION,
  IU_PROJECTION_2030_SECTION,
  IU_USE_LEVEL_SECTION,
} from './innovation-use';
import { POLICY_CHANGE_FIELDS, POLICY_CHANGE_SECTION } from './policy-change';
import { TOC_ALIGNMENT_FIELDS, TOC_ALIGNMENT_SECTION } from './toc-alignment';

// One file per section; per-type tasks (QAC-T-11 still to come) add theirs here.
export const CATALOG_SECTIONS: CatalogSection[] = [
  GENERAL_INFORMATION_SECTION,
  TOC_ALIGNMENT_SECTION,
  CONTRIBUTORS_PARTNERS_SECTION,
  GEOGRAPHIC_LOCATION_SECTION,
  EVIDENCE_SECTION,
  LINKED_RESULTS_SECTION,
  // QAC-T-9 · output types (`other_output` has no type page, so no section)
  KNOWLEDGE_PRODUCT_SECTION,
  CAPACITY_SHARING_SECTION,
  INNOVATION_DEVELOPMENT_SECTION,
  // QAC-T-10 · outcome types (`other_outcome` and `impact_contribution` have no type page, so no section)
  POLICY_CHANGE_SECTION,
  IU_CURRENT_USE_SECTION,
  IU_USE_LEVEL_SECTION,
  IU_PROJECTION_2030_SECTION,
];

export const CATALOG_FIELDS: CatalogField[] = [
  ...GENERAL_INFORMATION_FIELDS,
  ...TOC_ALIGNMENT_FIELDS,
  ...CONTRIBUTORS_PARTNERS_FIELDS,
  ...GEOGRAPHIC_LOCATION_FIELDS,
  ...EVIDENCE_FIELDS,
  ...LINKED_RESULTS_FIELDS,
  ...KNOWLEDGE_PRODUCT_FIELDS,
  ...CAPACITY_SHARING_FIELDS,
  ...INNOVATION_DEVELOPMENT_FIELDS,
  ...POLICY_CHANGE_FIELDS,
  ...INNOVATION_USE_FIELDS,
];
