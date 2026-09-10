/**
 * File-storage platforms that PRMS does not accept as evidence links.
 *
 * The reporting tool has stated this rule for a long time ("Links to SharePoint, One
 * Drive, Google Drive, DropBox and other file storage platforms are not allowed") and
 * enforces it in the browser, but the `/api/bilateral/*` surface never did — so the same
 * link was refused in the form and accepted through the API. PRMS stores the URL and
 * never fetches the document, so a link behind a Centre's tenant permissions is dead
 * weight: it renders nothing on the Results Dashboard and cannot be reviewed in QA.
 *
 * Kept identical to the client-side pattern (`rd-evidences`, `evidence-item`,
 * `bilateral/section-evidence`) on purpose: one rule, one shape, both entry points.
 *
 * Confidential evidence has its own supported route — upload the file to the PRMS
 * repository and answer "No" to the public question — which is not reachable through
 * this API, since it accepts links only.
 */
export const CLOUD_STORAGE_LINK_REGEX =
  /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;

export const CLOUD_STORAGE_LINK_MESSAGE =
  'Links to file storage platforms (Google Drive, Dropbox, SharePoint, OneDrive) are not accepted as evidence. Provide a publicly accessible link (CGSpace, DOI or a public site) instead.';

/** True when the value points at one of the blocked file-storage platforms. */
export function isCloudStorageLink(value: unknown): boolean {
  return (
    typeof value === 'string' && CLOUD_STORAGE_LINK_REGEX.test(value.trim())
  );
}
