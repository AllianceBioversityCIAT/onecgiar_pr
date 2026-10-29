// @akili-spec quality-assurance/qa-field-catalog
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { computeCatalogContentHash, HashableCatalog } from './content-hash';
import { CatalogSubField } from './types';
import { CatalogYearVersion } from './versions';

/**
 * Frozen record of the catalog (QAC-R-2, QAC-R-8).
 * - `years[Y]`: revision + canonical hash of Y's EFFECTIVE catalog.
 * - `keys`: every key EVER declared, regardless of validity (retiring via `valid_to` keeps a
 *   key here). Namespaced: `result_type:<k>`, `section:<k>`, `field:<k>`, `subfield:<parent>/<sub>`.
 */
export interface CatalogSnapshot {
  years: Record<string, { revision: number; content_hash: string }>;
  keys: string[];
}

/** Subfield keys at every depth: `subfield:<field>/<sub>` and `subfield:<field>/<sub>/<subsub>`. */
function addSubfieldKeys(
  keys: Set<string>,
  prefix: string,
  subs: CatalogSubField[] | undefined,
): void {
  for (const sf of subs ?? []) {
    const key = `${prefix}/${sf.key}`;
    keys.add(key);
    addSubfieldKeys(keys, key, sf.subfields);
  }
}

/** All keys ever declared — NOT filtered by year, so retirement never reads as removal. */
export function collectAllKeys(catalog: HashableCatalog): string[] {
  const keys = new Set<string>();
  catalog.resultTypes.forEach((r) => keys.add(`result_type:${r.key}`));
  catalog.sections.forEach((s) => keys.add(`section:${s.key}`));
  for (const f of catalog.fields) {
    keys.add(`field:${f.key}`);
    addSubfieldKeys(keys, `subfield:${f.key}`, f.subfields);
  }
  return [...keys].sort();
}

export function buildSnapshot(
  catalog: HashableCatalog,
  versions: Record<number, CatalogYearVersion>,
): CatalogSnapshot {
  const years: CatalogSnapshot['years'] = {};
  for (const year of Object.keys(versions).map(Number).sort()) {
    years[String(year)] = {
      revision: versions[year].revision,
      content_hash: computeCatalogContentHash(catalog, year),
    };
  }
  return { years, keys: collectAllKeys(catalog) };
}

/**
 * Pure comparison of the frozen snapshot against the current code catalog. Returns one
 * message per violation (empty = ok):
 *  - R-2: a snapshot key no longer declared in code → names the key.
 *  - R-8: same revision, different hash → content changed without a bump.
 *  - R-8: different revision, same hash → bump without a change.
 *  - R-8: revision lower than the frozen one → revisions only go up.
 * A year present in the snapshot but gone from the code is also a violation.
 */
export function checkSnapshot(
  frozen: CatalogSnapshot,
  current: CatalogSnapshot,
): string[] {
  const violations: string[] = [];
  const currentKeys = new Set(current.keys);
  for (const key of frozen.keys) {
    if (!currentKeys.has(key)) {
      violations.push(`key removed from catalog: ${key}`);
    }
  }
  for (const [year, was] of Object.entries(frozen.years)) {
    const now = current.years[year];
    if (!now) {
      violations.push(`year ${year} removed from catalog versions`);
      continue;
    }
    if (now.revision < was.revision) {
      violations.push(
        `year ${year}: revision decreased ${was.revision} -> ${now.revision}`,
      );
      continue;
    }
    const sameRevision = now.revision === was.revision;
    const sameHash = now.content_hash === was.content_hash;
    if (sameRevision && !sameHash) {
      violations.push(
        `year ${year}: content changed without a revision bump (revision ${was.revision})`,
      );
    } else if (!sameRevision && sameHash) {
      violations.push(
        `year ${year}: revision bumped ${was.revision} -> ${now.revision} without a content change`,
      );
    }
  }
  return violations;
}

/** Stable on-disk form shared by the script and the staleness test. */
export function serializeSnapshot(snapshot: CatalogSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

/**
 * Guarded regeneration of the frozen snapshot. If a snapshot already exists it is compared
 * against `current` with checkSnapshot FIRST; any violation refuses to write and leaves the
 * file untouched, so regenerating can never launder a removed key or an un-bumped change.
 * Valid changes (content + bump, retirement via valid_to, new keys, new years) pass.
 */
export function guardedSnapshotWrite(
  file: string,
  current: CatalogSnapshot,
): { written: boolean; violations: string[] } {
  if (existsSync(file)) {
    const frozen = JSON.parse(readFileSync(file, 'utf8')) as CatalogSnapshot;
    const violations = checkSnapshot(frozen, current);
    if (violations.length > 0) return { written: false, violations };
  }
  writeFileSync(file, serializeSnapshot(current));
  return { written: true, violations: [] };
}
