// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-R-15)
/**
 * Query-param contract for the Bilateral review tab's URL ↔ state bridge (`design.md` §6.2).
 * Six keys: `search, status, center, project, category, view`. `center` / `project` / `category`
 * are multi-value, comma-separated — the same shape `programme-results-query-params.ts` uses for
 * `?section=` / `?category=` on the Results tab. `center` carries CLARISA center CODES (BRT-R-16),
 * not acronyms, matching the legacy `?center=` value space.
 */
export const BILATERAL_REVIEW_SEARCH_QUERY_PARAM = 'search';
export const BILATERAL_REVIEW_STATUS_QUERY_PARAM = 'status';
export const BILATERAL_REVIEW_CENTER_QUERY_PARAM = 'center';
export const BILATERAL_REVIEW_PROJECT_QUERY_PARAM = 'project';
export const BILATERAL_REVIEW_CATEGORY_QUERY_PARAM = 'category';
export const BILATERAL_REVIEW_VIEW_QUERY_PARAM = 'view';
// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-7)
/** The selected reporting cycle — a numeric `versionId`, NOT a phase label (unlike the Results
 *  tab's `?phase=`, which carries `phaseName` — parity of behavior, not of value space, per
 *  `requirements.md` §2 "Results tab phase UX"). */
export const BILATERAL_REVIEW_PHASE_QUERY_PARAM = 'phase';
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-11)
/** Eighth key — the grouped view's grouping dimension. Absent/invalid = `'project'` (BRP-R-11). */
export const BILATERAL_REVIEW_GROUP_QUERY_PARAM = 'group';

export type BilateralReviewQueryParamDimension = 'search' | 'status' | 'center' | 'project' | 'category' | 'view' | 'phase' | 'group';

/** `dimension → param name`, in toolbar order. */
export const BILATERAL_REVIEW_QUERY_PARAM_MAP: Record<BilateralReviewQueryParamDimension, string> = {
  search: BILATERAL_REVIEW_SEARCH_QUERY_PARAM,
  status: BILATERAL_REVIEW_STATUS_QUERY_PARAM,
  center: BILATERAL_REVIEW_CENTER_QUERY_PARAM,
  project: BILATERAL_REVIEW_PROJECT_QUERY_PARAM,
  category: BILATERAL_REVIEW_CATEGORY_QUERY_PARAM,
  view: BILATERAL_REVIEW_VIEW_QUERY_PARAM,
  phase: BILATERAL_REVIEW_PHASE_QUERY_PARAM,
  group: BILATERAL_REVIEW_GROUP_QUERY_PARAM
};

export type BilateralReviewStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
export type BilateralReviewViewMode = 'grouped' | 'flat';
/** BRP-R-11: how the grouped view's rows are grouped — by bilateral project (today) or by lead
 *  center. Never a third value; unknown/missing parses to `'project'` (BRP-DD-4). */
export type BilateralReviewGroupMode = 'project' | 'center';

/** Unknown/missing → `'all'` (BRT-R-7's default), never a value the chips do not render. */
export function parseBilateralReviewStatus(raw: string | null): BilateralReviewStatusFilter {
  return raw === 'pending' || raw === 'approved' || raw === 'rejected' ? raw : 'all';
}

/** Unknown/missing → `'grouped'` (BRT-R-30's default). */
export function parseBilateralReviewView(raw: string | null): BilateralReviewViewMode {
  return raw === 'flat' ? 'flat' : 'grouped';
}

/** Unknown/missing → `'project'` (BRP-R-11's default). The page's own effect (not this pure
 *  function) is what strips a present-but-invalid raw value from the URL — this only decides the
 *  RUNTIME value, same split `parseBilateralReviewStatus`/`parseBilateralReviewView` use. */
export function parseBilateralReviewGroupMode(raw: string | null): BilateralReviewGroupMode {
  return raw === 'center' ? 'center' : 'project';
}

/** `?center=a,b` → `['a', 'b']`. Blanks dropped, duplicates collapsed. */
export function parseBilateralReviewListParam(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const value of raw.split(',')) {
    const trimmed = value.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

/** `['a', 'b']` → `'a,b'`; an empty selection is `null`, which REMOVES the key under `merge`. */
export function joinBilateralReviewListParam(values: readonly string[]): string | null {
  return values.length ? values.join(',') : null;
}

/** Order-insensitive-free list equality — cheap guard for the URL hydrate effect. */
export function sameBilateralReviewList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-5, BRC-R-7)
/**
 * Normalizes any wire-shaped phase id (`number | string | null | undefined`) to a real, POSITIVE
 * phase id, or `null`. Shared by the page's and the band's `currentPhaseId` computeds and
 * `BilateralReviewCountService` — the ONE place the "not a real phase" rule lives.
 *
 * Live-page defect (Leader, Orca browser, SP02): `DataControlService.reportingCurrentPhase`
 * initializes `phaseId: null` (`data-control.service.ts:104`), and `Number(null) === 0` — NOT
 * `NaN` — so a naive `Number(raw)` reads the shell's cold-boot state as a "resolved" phase 0 and
 * fires an unscoped `versionId=0` request before the shell's own phases request lands. Rejecting
 * `null`/`undefined`/`''` BEFORE calling `Number()`, and rejecting `<= 0` after, closes both the
 * `Number(null) === 0` and the `Number('') === 0` variants — a phase id is never zero or negative.
 */
export function normalizeBilateralReviewPhaseId(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `?phase=36` → `36`; missing, blank, non-numeric or `<= 0` → `null` — the "no explicit override"
 *  value `selectedVersionId` falls back to the current phase for (BRC-R-7's default). All phase
 *  comparisons downstream are numeric, never a raw wire string. */
export function parseBilateralReviewPhase(raw: string | null): number | null {
  return normalizeBilateralReviewPhaseId(raw);
}
