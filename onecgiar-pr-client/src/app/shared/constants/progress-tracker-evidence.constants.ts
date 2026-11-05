/**
 * Evidence saved from a Progress Tracker pick (server `ProgressTrackerPrefillService`) carries this
 * prefix in its description — the evidence table has no provenance column, so the prefix is the
 * marker. Keep it identical to the server's `PT_TEMPORARY_EVIDENCE_PREFIX`.
 */
export const PT_TEMPORARY_EVIDENCE_PREFIX = '[Temporary — from Progress Tracker, may be incomplete]';

/** Shown in the Evidence section and in the "Pending from Progress Tracker" checklist. */
export const PT_TEMPORARY_EVIDENCE_NOTICE =
  'Evidence retrieved from Progress Tracker is temporary and may be incomplete. Replace it with the final evidence if available.';

/**
 * Checklist detail for a Progress Tracker evidence item that has no http(s) link.
 * It is not an Evidence row: `evidence.link` is required, and a file name alone is not a file.
 */
export const PT_UNSAVED_EVIDENCE_DETAIL =
  'Temporary and incomplete. Progress Tracker did not provide a link or file PRMS can store, so this was not added as evidence. Supply the final file or link in Evidence before submitting.';

/** Checklist label. The name is the only identifier PT gave for an item without a link. */
export function ptUnsavedEvidenceLabel(name: string): string {
  return `Temporary evidence not saved: ${name}`;
}

/** True when an evidence description carries the Progress Tracker temporary prefix. */
export function isPtTemporaryEvidence(description: string | null | undefined): boolean {
  return typeof description === 'string' && description.trimStart().startsWith(PT_TEMPORARY_EVIDENCE_PREFIX);
}
