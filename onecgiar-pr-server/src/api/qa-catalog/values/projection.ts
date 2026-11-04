// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-9 / QRF-R-9: the last step before the response. Every object is built KEY BY KEY from the catalog (never a spread of
// what a resolver returned), so a key that is not a catalog key cannot appear at any depth. A missing value is `null`
// (`[]` for `multi_select` / `list`), never omitted; a scalar field with subfields is `{ value, <subfield key>: ... }`.
import { CatalogField, CatalogSubField } from '../definitions/types';
import { emptyValue, isScalarType } from './value-typing';

type Node = Pick<CatalogField | CatalogSubField, 'type' | 'subfields'>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function projectObject(
  node: Node,
  raw: unknown,
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  const source = isObject(raw) ? raw : {};
  for (const sub of node.subfields ?? []) {
    out[sub.key] = project(sub, source[sub.key]);
  }
  return out;
}

export function project(node: Node, raw: unknown): unknown {
  switch (node.type) {
    case 'multi_select':
      return Array.isArray(raw) ? raw.map(scalarOrNull) : [];
    case 'list':
      return Array.isArray(raw) ? raw.map((e) => projectObject(node, e)) : [];
    case 'object':
      return isObject(raw) ? projectObject(node, raw) : null;
  }
  if (!isScalarType(node.type)) return emptyValue(node.type);
  if ((node.subfields?.length ?? 0) === 0) return scalarOrNull(raw);
  const source = isObject(raw) ? raw : {};
  return projectObject(node, source, { value: scalarOrNull(source.value) });
}

const scalarOrNull = (v: unknown) =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    ? v
    : null;
