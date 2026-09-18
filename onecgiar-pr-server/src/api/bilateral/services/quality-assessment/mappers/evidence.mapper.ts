// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { QualityPayloadEvidenceItem } from '../bilateral-quality-rules';

/**
 * `sections.evidence` — one item per active evidence row, definitions-only
 * (BIL-QAI-R-3, design.md §5 "Payload builder" evidence mapper):
 *
 * - `source = is_sharepoint ? 'prms_repository' : 'url'`.
 * - `visibility = is_sharepoint ? (is_public_file ? 'public' : 'private') : 'public'`.
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
    const isPublicFile = !!sharepointRow?.is_public_file;
    const visibility: 'public' | 'private' = isSharepoint
      ? isPublicFile
        ? 'public'
        : 'private'
      : 'public';

    const tags = TAG_LABELS.filter(([key]) => !!row?.[key]).map(
      ([, label]) => label,
    );

    return {
      description: row?.description ?? '',
      link: visibility === 'private' ? null : (row?.link ?? null),
      source: isSharepoint ? 'prms_repository' : 'url',
      visibility,
      tags,
    };
  });
}
