// @akili-spec quality-assurance/qa-field-catalog
import {
  CatalogField,
  CatalogResultType,
  CatalogSection,
  CatalogSubField,
} from './definitions/types';
import {
  QaCatalogFieldResponse,
  QaCatalogResultTypeResponse,
  QaCatalogSectionResponse,
  QaCatalogSubFieldResponse,
} from './dto/qa-catalog-response.dto';

/**
 * QAC-R-4 / QAC-R-12: every projection builds the output key by key (whitelist, never
 * spread-then-delete), so a property added to the definition types — storage bindings,
 * `required_confirmed`, `required_when` — stays internal until it is added here on purpose.
 */
export function toResultTypeResponse(
  type: CatalogResultType,
): QaCatalogResultTypeResponse {
  return { key: type.key, label: type.label, level: type.level };
}

export function toSectionResponse(
  section: CatalogSection,
): QaCatalogSectionResponse {
  return {
    key: section.key,
    label: section.label,
    order: section.order,
    result_types: [...section.result_types],
  };
}

export function toSubFieldResponse(
  sub: CatalogSubField,
): QaCatalogSubFieldResponse {
  return {
    key: sub.key,
    label: sub.label,
    type: sub.type,
    ...(sub.control_list !== undefined && { control_list: sub.control_list }),
    ...(sub.required !== undefined && { required: sub.required }),
  };
}

export function toFieldResponse(field: CatalogField): QaCatalogFieldResponse {
  return {
    key: field.key,
    label: field.label,
    ...(field.description !== undefined && { description: field.description }),
    type: field.type,
    ...(field.control_list !== undefined && {
      control_list: field.control_list,
    }),
    section: field.section,
    order: field.order,
    result_types: [...field.result_types],
    required: field.required,
    valid_from: field.valid_from,
    valid_to: field.valid_to,
    ...(field.subfields !== undefined && {
      subfields: field.subfields.map(toSubFieldResponse),
    }),
  };
}
