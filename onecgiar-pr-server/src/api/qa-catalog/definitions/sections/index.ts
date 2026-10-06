// @akili-spec quality-assurance/qa-field-catalog
import { CatalogField, CatalogSection } from '../types';
import {
  CONTRIBUTORS_PARTNERS_FIELDS,
  CONTRIBUTORS_PARTNERS_SECTION,
} from './contributors-partners';
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
  LINKED_RESULTS_FIELDS,
  LINKED_RESULTS_SECTION,
} from './linked-results';
import { TOC_ALIGNMENT_FIELDS, TOC_ALIGNMENT_SECTION } from './toc-alignment';

// One file per section; per-type tasks (QAC-T-9..11) add theirs here.
export const CATALOG_SECTIONS: CatalogSection[] = [
  GENERAL_INFORMATION_SECTION,
  TOC_ALIGNMENT_SECTION,
  CONTRIBUTORS_PARTNERS_SECTION,
  GEOGRAPHIC_LOCATION_SECTION,
  EVIDENCE_SECTION,
  LINKED_RESULTS_SECTION,
];

export const CATALOG_FIELDS: CatalogField[] = [
  ...GENERAL_INFORMATION_FIELDS,
  ...TOC_ALIGNMENT_FIELDS,
  ...CONTRIBUTORS_PARTNERS_FIELDS,
  ...GEOGRAPHIC_LOCATION_FIELDS,
  ...EVIDENCE_FIELDS,
  ...LINKED_RESULTS_FIELDS,
];
