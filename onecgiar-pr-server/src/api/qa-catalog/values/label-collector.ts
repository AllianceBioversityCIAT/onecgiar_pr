// @akili-spec quality-assurance/qa-value-labels
// QVL-DD-2 / QVL-R-2: the (control list, option id) pairs of ONE result are read from its PROJECTED `values`, so they are exactly
// what the response returns (normalization, `field_keys`, applicability and the person-bearing rule need no extra logic).
// Only select nodes yield pairs: a `text` node that names a list (`general.lead_contact_person`) is skipped, and only its
// `directory_user` subfield is read. The ids are stringified (QVL-R-1, D-7): the JSON key of `1` and of `"1"` is the same.
import { CatalogField, CatalogSubField } from '../definitions/types';
import { isScalarType } from './value-typing';

/** control list name -> the distinct option ids (as strings) a result holds under it. */
export type LabelPairs = Map<string, Set<string>>;

export interface CollectedLabels {
  /** One entry per input result, in input order. */
  perResult: LabelPairs[];
  /** The union over the batch: what the resolver reads once, whatever the number of results. */
  union: LabelPairs;
}

type Node = Pick<
  CatalogField | CatalogSubField,
  'type' | 'subfields' | 'control_list'
>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isSelect = (type: Node['type']) =>
  type === 'single_select' || type === 'multi_select';

function add(pairs: LabelPairs, list: string, id: unknown): void {
  if (typeof id !== 'string' && typeof id !== 'number') return;
  let ids = pairs.get(list);
  if (!ids) pairs.set(list, (ids = new Set()));
  ids.add(String(id));
}

function walkSubfields(node: Node, source: unknown, pairs: LabelPairs): void {
  if (!isObject(source)) return;
  for (const sub of node.subfields ?? []) walk(sub, source[sub.key], pairs);
}

/** `projected` is what `project` returned for `node`: its shape follows the node type (see projection.ts). */
function walk(node: Node, projected: unknown, pairs: LabelPairs): void {
  switch (node.type) {
    case 'multi_select':
      // an array of scalars; `project` never nests under it
      if (node.control_list && Array.isArray(projected)) {
        for (const id of projected) add(pairs, node.control_list, id);
      }
      return;
    case 'list':
      if (Array.isArray(projected)) {
        for (const element of projected) walkSubfields(node, element, pairs);
      }
      return;
    case 'object':
      walkSubfields(node, projected, pairs);
      return;
  }
  if (!isScalarType(node.type)) return;
  if ((node.subfields?.length ?? 0) === 0) {
    if (isSelect(node.type) && node.control_list) {
      add(pairs, node.control_list, projected);
    }
    return;
  }
  // a scalar with subfields is `{ value, <subfield key>: ... }`; `value` is an option id only for a select
  if (!isObject(projected)) return;
  if (isSelect(node.type) && node.control_list) {
    add(pairs, node.control_list, projected.value);
  }
  walkSubfields(node, projected, pairs);
}

/**
 * The pairs of one result. `fields` are the definitions of the fields returned; a `values` key without a definition in
 * `fields` is not read. Never mutates its input.
 */
export function collectLabelPairs(
  fields: CatalogField[],
  values: Record<string, unknown>,
): LabelPairs {
  const pairs: LabelPairs = new Map();
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(values, f.key)) {
      walk(f, values[f.key], pairs);
    }
  }
  return pairs;
}

/** The pairs of every result of the batch (QVL-R-2: each result keeps only its own) and their union. */
export function collectLabels(
  results: ReadonlyArray<{ values: Record<string, unknown> }>,
  fields: CatalogField[],
): CollectedLabels {
  const perResult = results.map((r) => collectLabelPairs(fields, r.values));
  const union: LabelPairs = new Map();
  for (const pairs of perResult) {
    for (const [list, ids] of pairs) {
      for (const id of ids) add(union, list, id);
    }
  }
  return { perResult, union };
}
