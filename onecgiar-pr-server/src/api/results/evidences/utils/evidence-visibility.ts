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
