// @akili-spec quality-assurance/qa-field-catalog
import {
  CatalogField,
  CatalogResultType,
  CatalogSection,
  CatalogSubField,
  Condition,
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
 * `required_confirmed` — stays internal until it is added here on purpose.
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

/**
 * QAC-R-13: a condition is plain data over catalog keys, so it is rebuilt key by key (never aliased
 * or spread) and carries nothing but `field` / `operator` / `value` / `all` / `any`.
 */
export function toConditionResponse(condition: Condition): Condition {
  if ('all' in condition) {
    return { all: condition.all.map(toConditionResponse) };
  }
  if ('any' in condition) {
    return { any: condition.any.map(toConditionResponse) };
  }
  return {
    field: condition.field,
    operator: condition.operator,
    ...(condition.value !== undefined && {
      value: Array.isArray(condition.value)
        ? [...condition.value]
        : condition.value,
    }),
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
    ...(sub.required_when !== undefined && {
      required_when: toConditionResponse(sub.required_when),
    }),
    ...(sub.visible_when !== undefined && {
      visible_when: toConditionResponse(sub.visible_when),
    }),
    ...(sub.subfields !== undefined && {
      subfields: sub.subfields.map(toSubFieldResponse),
    }),
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
    ...(field.required_when !== undefined && {
      required_when: toConditionResponse(field.required_when),
    }),
    ...(field.visible_when !== undefined && {
      visible_when: toConditionResponse(field.visible_when),
    }),
    ...(field.subfields !== undefined && {
      subfields: field.subfields.map(toSubFieldResponse),
    }),
  };
}
