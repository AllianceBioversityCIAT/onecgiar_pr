/**
 * `KPM-T-5` — pure merge (round-robin) and dedup (DOI -> title|type|year) functions.
 *
 * No logger/HTTP/Nest imports on purpose (`KPM-DD-3`, `KPM-DD-4`, `design.md` §5): the service
 * (`KPM-T-4`) calls these against the already-fetched, per-source `ok` items only.
 */

import { CgspaceAlsoInDto, CgspaceItemDto } from './dto/cgspace-item.dto';
import { KpRepository } from './repositories.config';

/**
 * Round-robins across sources in the given (selection) order, preserving each source's own
 * order. Sources shorter than others are skipped once exhausted (`design.md` §5 "Merge" /
 * `KPM-DD-3`) — no cross-source re-scoring.
 */
export function interleave<T>(sources: T[][]): T[] {
  const result: T[] = [];
  const maxLength = sources.reduce(
    (max, source) => Math.max(max, source.length),
    0,
  );

  for (let i = 0; i < maxLength; i++) {
    for (const source of sources) {
      if (i < source.length) {
        result.push(source[i]);
      }
    }
  }

  return result;
}

const DOI_PREFIXES = [
  /^https:\/\/doi\.org\//i,
  /^http:\/\/dx\.doi\.org\//i,
  /^doi:/i,
];

/**
 * Normalizes a DOI for the dedup key₁: strips `https://doi.org/`, `http://dx.doi.org/` and
 * `doi:` prefixes, lowercases, trims. `null`/`undefined`/blank -> `null` (no DOI-key match).
 */
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (doi === null || doi === undefined) {
    return null;
  }

  let value = doi.trim();
  for (const prefix of DOI_PREFIXES) {
    value = value.replace(prefix, '');
  }
  value = value.trim().toLowerCase();

  return value.length === 0 ? null : value;
}

/**
 * Normalizes a title for the dedup key₂: lowercase, NFKD, strip diacritics and punctuation,
 * collapse whitespace (`design.md` §5 "Dedup").
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritical marks stripped after NFKD split
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // punctuation -> space (keeps word boundaries)
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupKey2(item: CgspaceItemDto): string {
  return `${normalizeTitle(item.title)}|${item.type.toLowerCase()}|${item.year ?? ''}`;
}

function priorityRank(
  repository: KpRepository | undefined,
  priorityOrder: readonly KpRepository[],
): number {
  if (!repository) {
    return priorityOrder.length; // missing repository -> lowest priority, never throws (KPM-T-5 contract)
  }
  const index = priorityOrder.indexOf(repository);
  return index === -1 ? priorityOrder.length : index;
}

/**
 * Dedupes the already-interleaved merged page (`design.md` §5 "Dedup" / `KPM-DD-4`).
 *
 * Grouping is **by key, not by pairwise reachability** (no union-find / transitive closure —
 * rework after review found the closure collapsing two different-DOI items through a DOI-less
 * intermediary that matched both on title):
 *
 *   (a) Items whose normalized DOI (key₁) is present are partitioned into DOI groups by exact
 *       key₁ equality. key₁ equality is itself transitive, so a genuine three-way same-DOI
 *       collapse needs no closure and stays correct.
 *   (b) The remaining DOI-less items are partitioned among themselves by key₂
 *       (title|type|year).
 *   (c) A DOI-less group is attached to a DOI group **iff exactly one** DOI group has a member
 *       whose key₂ equals the DOI-less group's key₂; when two or more DOI groups qualify, the
 *       DOI-less group is attached to none and stays its own card (tie rule recorded in
 *       `design.md` §5). A DOI-less item therefore bridges into at most one DOI group — never
 *       into a chain that would unite two different DOIs.
 *
 * Output order: the survivors keep the *position of the first-encountered member of their
 * group* in the merged list (i.e. groups are emitted in ascending order of their earliest
 * member's index) so the round-robin order stays stable — the survivor itself may have been a
 * later item in that group, chosen purely by `priorityOrder`.
 *
 * Pure: never mutates `items` or any item's `alsoIn` array; per-source totals are untouched
 * (this function never reads or writes them).
 */
export function dedupe(
  items: CgspaceItemDto[],
  priorityOrder: readonly KpRepository[],
): { items: CgspaceItemDto[]; dedupedCount: number } {
  const n = items.length;
  const doiKeys = items.map((item) => normalizeDoi(item.doi));
  const key2s = items.map((item) => dedupKey2(item));

  // (a) Partition DOI-bearing items by exact key₁.
  const doiGroups = new Map<string, number[]>();
  // (b) Partition the remaining DOI-less items by key₂.
  const doiLessGroups = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const doiKey = doiKeys[i];
    if (doiKey !== null) {
      if (!doiGroups.has(doiKey)) {
        doiGroups.set(doiKey, []);
      }
      doiGroups.get(doiKey)!.push(i);
    } else {
      const key2 = key2s[i];
      if (!doiLessGroups.has(key2)) {
        doiLessGroups.set(key2, []);
      }
      doiLessGroups.get(key2)!.push(i);
    }
  }

  // For each DOI group, the set of key₂ values its own members carry.
  const doiGroupKey2Sets = new Map<string, Set<string>>();
  for (const [doiKey, indices] of doiGroups) {
    doiGroupKey2Sets.set(doiKey, new Set(indices.map((i) => key2s[i])));
  }

  const finalGroups = new Map<string, number[]>();
  for (const [doiKey, indices] of doiGroups) {
    finalGroups.set(`doi:${doiKey}`, [...indices]);
  }

  // (c) Attach each DOI-less group to the single DOI group sharing its key₂, if any; a tie (two
  // or more qualifying DOI groups) leaves the DOI-less group standing alone.
  for (const [key2, indices] of doiLessGroups) {
    const candidateDoiKeys: string[] = [];
    for (const [doiKey, key2Set] of doiGroupKey2Sets) {
      if (key2Set.has(key2)) {
        candidateDoiKeys.push(doiKey);
      }
    }
    if (candidateDoiKeys.length === 1) {
      finalGroups.get(`doi:${candidateDoiKeys[0]}`)!.push(...indices);
    } else {
      finalGroups.set(`doiless:${key2}`, [...indices]);
    }
  }

  const orderedGroups = Array.from(finalGroups.values()).sort(
    (a, b) => Math.min(...a) - Math.min(...b),
  );

  let dedupedCount = 0;
  const outItems: CgspaceItemDto[] = [];

  for (const groupIndices of orderedGroups) {
    if (groupIndices.length === 1) {
      outItems.push(items[groupIndices[0]]);
      continue;
    }

    let survivorIdx = groupIndices[0];
    for (const idx of groupIndices) {
      if (
        priorityRank(items[idx].repository, priorityOrder) <
        priorityRank(items[survivorIdx].repository, priorityOrder)
      ) {
        survivorIdx = idx;
      }
    }

    const alsoIn: CgspaceAlsoInDto[] = [...(items[survivorIdx].alsoIn ?? [])];
    for (const idx of groupIndices) {
      if (idx === survivorIdx) {
        continue;
      }
      const dropped = items[idx];
      alsoIn.push({
        repository: dropped.repository as KpRepository,
        handle: dropped.handle,
        handleUrl: dropped.handleUrl,
        itemUrl: dropped.itemUrl,
      });
      dedupedCount++;
    }

    outItems.push({ ...items[survivorIdx], alsoIn });
  }

  return { items: outItems, dedupedCount };
}
