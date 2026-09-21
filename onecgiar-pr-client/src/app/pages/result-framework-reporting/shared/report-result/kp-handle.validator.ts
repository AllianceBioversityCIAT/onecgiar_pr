/**
 * Repository-link validation for knowledge products.
 *
 * The regex and both messages were duplicated verbatim in `aow-hlo-create-modal` and
 * `lab-report-form`, and had already drifted (the modal's own spec asserted an older shape).
 * One copy, one place to change when a repository is added.
 *
 * Accepted shapes — CGSpace, MELSpace and WorldFish only:
 *   https://cgspace.cgiar.org/items/<uuid>
 *   https://repo.mel.cgiar.org/items/<uuid>
 *   https://digitalarchive.worldfishcenter.org/items/<uuid>
 *   https://hdl.handle.net/{10568|20.500.11766|20.500.12348}/<digits>
 *   https://cgspace.cgiar.org/handle/{10568|20.500.11766}/<digits>
 *   {10568|20.500.11766|20.500.12348}/<digits>  (bare handle, no https:// prefix — the way
 *     CGSpace/MELSpace/WorldFish display and share handles by default; see KPH-R-1)
 */
export const KP_HANDLE_REGEX =
  /^(?:https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)|(?:10568|20\.500\.11766|20\.500\.12348)\/\d+)$/;

/** Matches only the bare-handle alternative (no `https://` prefix), used by `normalizeKpHandle`. */
const KP_BARE_HANDLE_REGEX = /^(10568|20\.500\.11766|20\.500\.12348)\/(\d+)$/;

export const KP_HANDLE_EMPTY_MESSAGE = 'Please enter a valid handle.';
export const KP_HANDLE_UNSUPPORTED_MESSAGE =
  'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories.';

export interface KpHandleError {
  status: boolean;
  message: string;
}

export const KP_HANDLE_NO_ERROR: KpHandleError = { status: false, message: '' };

/**
 * Validate before spending a request. Returns the error object the form binds to, so a caller
 * never has to know which message goes with which failure.
 */
export function validateKpHandle(handle: string | null | undefined): KpHandleError {
  if (!handle) return { status: true, message: KP_HANDLE_EMPTY_MESSAGE };
  if (!KP_HANDLE_REGEX.test(handle)) return { status: true, message: KP_HANDLE_UNSUPPORTED_MESSAGE };
  return { ...KP_HANDLE_NO_ERROR };
}

/**
 * Rewrite an accepted bare handle (`{10568|20.500.11766|20.500.12348}/<digits>`) to its
 * already-proven-working canonical URL, so a caller never sends a bare handle to
 * `GET_mqapValidation` or persists one as `handler`. The caller is expected to have validated
 * first (`validateKpHandle`) — any other input, including an already-URL handle or an
 * unsupported/invalid value, is returned unchanged.
 */
export function normalizeKpHandle(handle: string): string {
  const match = KP_BARE_HANDLE_REGEX.exec(handle);
  if (!match) return handle;

  const [, prefix, digits] = match;
  if (prefix === '10568') return `https://cgspace.cgiar.org/handle/${prefix}/${digits}`;
  return `https://hdl.handle.net/${prefix}/${digits}`;
}
