import { PT_UNSAVED_EVIDENCE_DETAIL } from './progress-tracker-evidence.constants';

/**
 * INC-167646 — Progress Tracker evidence that has no http(s) link cannot become an Evidence row
 * (`evidence.link` is required; a file name is not an upload). The names are remembered in this
 * browser, keyed by result code, so the result page can keep showing them after create.
 * Another browser, or a later visit after the reminder is hidden, cannot reconstruct the list:
 * PRMS has no column for it.
 */
const STORAGE_KEY = 'prms.pt-unsaved-evidence.v1';
const MAX_NAMES = 12;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text: string): string {
  return String(text ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

function cleanNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length === MAX_NAMES) break;
  }
  return out;
}

function readMap(): Record<string, string[]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string[]>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Private mode or a full quota: the post-create alert still lists the names.
  }
}

/** Stores the unsaved names for `resultCode`. An empty list removes any previous note. */
export function rememberPtUnsavedEvidence(resultCode: string | number | null | undefined, names: readonly string[]): void {
  const code = resultCode == null ? '' : String(resultCode).trim();
  if (!code) return;
  const map = readMap();
  const clean = cleanNames(names);
  if (!clean.length) delete map[code];
  else map[code] = clean;
  writeMap(map);
}

/** Names remembered for this result code, or `[]`. */
export function readPtUnsavedEvidence(resultCode: string | number | null | undefined): string[] {
  const code = resultCode == null ? '' : String(resultCode).trim();
  if (!code) return [];
  const names = readMap()[code];
  return Array.isArray(names) ? cleanNames(names) : [];
}

/** Hides the reminder for this result. Does not delete any Evidence row. */
export function dismissPtUnsavedEvidence(resultCode: string | number | null | undefined): void {
  rememberPtUnsavedEvidence(resultCode, []);
}

/** Escaped HTML for the result-page warning. Empty when there is nothing to show. */
export function ptUnsavedEvidenceBannerHtml(names: readonly string[]): string {
  const clean = cleanNames(names);
  if (!clean.length) return '';
  const items = clean.map(name => `<li><strong>${escapeHtml(name)}</strong></li>`).join('');
  return (
    `<p>Progress Tracker listed evidence that is temporary and incomplete. It was not saved, because there is no link or file PRMS can store.</p>` +
    `<ul>${items}</ul>` +
    `<p>${escapeHtml(PT_UNSAVED_EVIDENCE_DETAIL)} This reminder stays in this browser only. It is not an evidence record.</p>`
  );
}
