import {
  DraftEvidence,
  DraftEvidenceSourceType,
} from '../entities/draft-evidence.entity';

/**
 * ADE-R-2 — the office-format allowlist that decides what a promoted draft attaches as formal
 * evidence. Deliberately narrower than `bilateral-ai-file-storage.service.ts`'s upload allowlist
 * (`['pdf', 'docx', 'txt', 'xls', 'xlsx', 'pptx']`): what the AI may *read* and what may become
 * *evidence* are different questions (`design.md` §9), and `txt` is the case that proves it —
 * accepted as an upload, never eligible to become evidence.
 *
 * Single source of truth: literal per `ADE-R-2`, not derived from any other list.
 */
export const QUALIFYING_EVIDENCE_EXTENSIONS: readonly string[] = [
  'pdf',
  'docx',
  'xls',
  'xlsx',
  'pptx',
];

/**
 * ADE-R-2 / ADE-AC-2 — decides whether one draft-evidence row qualifies to become formal
 * evidence on promotion.
 *
 * Requires BOTH:
 * - `source_type = DOCUMENT` (excludes `VOICE_NOTE` and `TEXT_CONTEXT` rows entirely — they have
 *   no file to transfer), AND
 * - the extension parsed from the stored `file_name` is on the allowlist above.
 *
 * The extension is parsed from `file_name`, never from `source_type` alone: `txt` is registered
 * as a `DOCUMENT` source today (`bilateral-ai-file-storage.service.ts`), so a `source_type`-only
 * filter would attach exactly the file `ADE-R-2` excludes. `mime_type` is not used either — it is
 * always `null` at creation (`design.md` §7.1, ADE-R-10).
 *
 * Pure: no I/O, no dependencies. `ADE-T-4`'s selection query is built on this predicate.
 */
export function isQualifyingEvidenceDocument(
  draftEvidence: Pick<DraftEvidence, 'source_type' | 'file_name'>,
): boolean {
  if (draftEvidence?.source_type !== DraftEvidenceSourceType.DOCUMENT) {
    return false;
  }

  const fileName = draftEvidence.file_name;
  if (!fileName) {
    return false;
  }

  const segments = fileName.split('.');
  if (segments.length < 2) {
    return false;
  }

  const extension = segments.pop()?.toLowerCase();
  if (!extension) {
    return false;
  }

  return QUALIFYING_EVIDENCE_EXTENSIONS.includes(extension);
}
