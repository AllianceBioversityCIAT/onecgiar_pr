// @akili-spec quality-assurance/qa-field-catalog
import { createHash } from 'crypto';
import { isValidIn } from './validity';
import { CatalogField, CatalogResultType, CatalogSection } from './types';

/**
 * JSON.stringify with object keys sorted recursively, so two structurally equal values
 * always serialise identically (MySQL JSON columns may return keys reordered). `undefined`
 * object members are dropped, like JSON.stringify does.
 */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const members = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${members.join(',')}}`;
}

/**
 * DD-12: version of the response PROJECTION (what `qa-catalog.mapper.ts` emits per field). It is part of
 * the hashed input, so changing what the endpoint returns for the same catalog (a new key in the
 * projection, a renamed one) changes the hash and, through the snapshot guard, forces a
 * `catalog_version` revision bump (consumers cache by it). Bump it in the same commit as the mapper
 * change; the pinned fingerprint in `qa-catalog.mapper.spec.ts` fails until you do.
 *
 * History: 1 = visible_when / required_when (fields and subfields), nested subfields (T-14).
 *          2 = v1.9 condition semantics: header pseudo-keys are `$`-prefixed (`result_type` -> `$result_type`),
 *              comparison by the referenced field's type (single_select by option id, multi_select only `in`).
 */
export const CONTRACT_VERSION = 2;

export interface HashableCatalog {
  resultTypes: CatalogResultType[];
  sections: CatalogSection[];
  fields: CatalogField[];
}

/**
 * sha256 (hex, 64 chars) of the stable JSON of the year's effective catalog: entries valid
 * in `year`, ordered by key. Advisory-grade; T-5 (QAC-R-8) may reuse it.
 */
export function computeCatalogContentHash(
  catalog: HashableCatalog,
  year: number,
  contractVersion: number = CONTRACT_VERSION,
): string {
  const byKey = <T extends { key: string }>(a: T, b: T) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  const effective = {
    contract: contractVersion,
    resultTypes: [...catalog.resultTypes].sort(byKey),
    sections: catalog.sections.filter((s) => isValidIn(s, year)).sort(byKey),
    fields: catalog.fields.filter((f) => isValidIn(f, year)).sort(byKey),
  };
  return createHash('sha256').update(stableStringify(effective)).digest('hex');
}
