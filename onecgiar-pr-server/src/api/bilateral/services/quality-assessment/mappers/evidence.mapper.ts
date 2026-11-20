// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { QualityPayloadEvidenceItem } from '../bilateral-quality-rules';
import { resolveEvidenceVisibility } from '../../../../results/evidences/utils/evidence-visibility';

/**
 * `sections.evidence` — one item per active evidence row, definitions-only
 * (BIL-QAI-R-3, design.md §5 "Payload builder" evidence mapper):
 *
 * - `source = is_sharepoint ? 'prms_repository' : 'url'`.
 * - `visibility` comes from `resolveEvidenceVisibility`: file ⇒ `is_public_file`; link ⇒ `is_public`
 *   (NULL = legacy = public).
 * - Private ⇒ `link: null`. `QualityPayloadEvidenceItem` has no SharePoint-specific field
 *   (document id, folder path, file name) to begin with, so a private item can never leak one
 *   regardless of what `evidence.entity.ts` / `evidence-sharepoint.entity.ts` carry.
 *
 * Tags are label text derived from the evidence row's boolean flags — never the flag names.
 */

const TAG_LABELS: ReadonlyArray<readonly [key: string, label: string]> = [
  ['gender_related', 'Gender'],
  ['youth_related', 'Youth'],
  ['nutrition_related', 'Nutrition'],
  ['environmental_biodiversity_related', 'Environment & biodiversity'],
  ['poverty_related', 'Poverty'],
];

/** A URL scheme, e.g. `https://`, `http://` (QEL-DD-1). */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Normalises a public evidence link (`QEL-R-1`): trims it, `''`/whitespace-only → `null`,
 * and prefixes `https://` when it has no scheme. A link that already has a scheme is left
 * unchanged (never upgraded/downgraded). Fixes rows already stored without a scheme — no
 * data migration — because the AI's fetch tool requires one. Never called for a private row;
 * those stay `null` regardless of what is stored.
 */
function normalizePublicLink(link: unknown): string | null {
  if (typeof link !== 'string') {
    return null;
  }
  const trimmed = link.trim();
  if (trimmed === '') {
    return null;
  }
  return SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function mapEvidence(
  detail: Record<string, any>,
): QualityPayloadEvidenceItem[] {
  const rows: any[] = Array.isArray(detail?.evidence_array)
    ? detail.evidence_array
    : [];

  return rows.map((row) => {
    const isSharepoint = Number(row?.is_sharepoint) === 1;
    const sharepointRow = Array.isArray(row?.evidenceSharepointArray)
      ? row.evidenceSharepointArray[0]
      : null;
    // @akili-spec bilateral/evidence-privacy-tag (EVP-T-7, EVP-R-10): link visibility
    // follows `is_public` (NULL = legacy = public); files keep following `is_public_file`.
    const { visibility } = resolveEvidenceVisibility({
      is_sharepoint: row?.is_sharepoint,
      is_public: row?.is_public,
      is_public_file: sharepointRow?.is_public_file,
    });

    const tags = TAG_LABELS.filter(([key]) => !!row?.[key]).map(
      ([, label]) => label,
    );

    return {
      description: row?.description ?? '',
      link: visibility === 'private' ? null : normalizePublicLink(row?.link),
      source: isSharepoint ? 'prms_repository' : 'url',
      visibility,
      tags,
    };
  });
}
