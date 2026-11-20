// @akili-spec bilateral/evidence-privacy-tag (EVP-T-2, EVP-R-1, EVP-DD-2)

export type TinyFlag = 0 | 1 | boolean | null | undefined;

export interface EvidenceVisibilityInput {
  is_sharepoint?: TinyFlag;
  is_public?: TinyFlag;
  /** `is_public_file` of the first SharePoint row; absent when the item has no SP row. */
  is_public_file?: TinyFlag;
}

export interface EvidenceVisibility {
  visibility: 'public' | 'private';
  exposed: boolean | null;
}

/** MySQL tinyint may arrive as 0/1 or boolean; null/undefined stay null. */
const toFlag = (value: TinyFlag): boolean | null =>
  value === null || value === undefined ? null : Boolean(Number(value));

/**
 * @akili-spec bilateral/evidence-privacy-tag (EVP-T-5, EVP-DD-5)
 * Exposed `is_public` for an evidence row read with its `evidenceSharepointArray`.
 * Fail closed for files: any active SP row with `is_public_file` 0 makes it private;
 * otherwise the first active SP row decides; no SP row = private.
 */
export function exposedEvidenceIsPublic(evidence: any): boolean | null {
  const activeSp = (
    Array.isArray(evidence?.evidenceSharepointArray)
      ? evidence.evidenceSharepointArray
      : []
  ).filter((sp) => sp && sp.is_active !== false && sp.is_active !== 0);
  const anyPrivate = activeSp.some(
    (sp) => toFlag(sp.is_public_file) === false,
  );
  return resolveEvidenceVisibility({
    is_sharepoint: evidence?.is_sharepoint,
    is_public: evidence?.is_public,
    is_public_file: anyPrivate ? 0 : activeSp[0]?.is_public_file,
  }).exposed;
}

/**
 * Design §3.1: a file follows `is_public_file` (NULL or absent SP row = private);
 * a link follows `is_public` (NULL = untagged = public, exposed as null).
 */
export function resolveEvidenceVisibility(
  input: EvidenceVisibilityInput,
): EvidenceVisibility {
  if (toFlag(input.is_sharepoint)) {
    const isPublicFile = toFlag(input.is_public_file) === true;
    return {
      visibility: isPublicFile ? 'public' : 'private',
      exposed: isPublicFile,
    };
  }
  const isPublic = toFlag(input.is_public);
  if (isPublic === null) return { visibility: 'public', exposed: null };
  return { visibility: isPublic ? 'public' : 'private', exposed: isPublic };
}
