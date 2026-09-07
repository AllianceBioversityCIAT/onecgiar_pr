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

export type BilateralReviewQueryParamDimension = 'search' | 'status' | 'center' | 'project' | 'category' | 'view';

/** `dimension → param name`, in toolbar order. */
export const BILATERAL_REVIEW_QUERY_PARAM_MAP: Record<BilateralReviewQueryParamDimension, string> = {
  search: BILATERAL_REVIEW_SEARCH_QUERY_PARAM,
  status: BILATERAL_REVIEW_STATUS_QUERY_PARAM,
  center: BILATERAL_REVIEW_CENTER_QUERY_PARAM,
  project: BILATERAL_REVIEW_PROJECT_QUERY_PARAM,
  category: BILATERAL_REVIEW_CATEGORY_QUERY_PARAM,
  view: BILATERAL_REVIEW_VIEW_QUERY_PARAM
};

export type BilateralReviewStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
export type BilateralReviewViewMode = 'grouped' | 'flat';

/** Unknown/missing → `'all'` (BRT-R-7's default), never a value the chips do not render. */
export function parseBilateralReviewStatus(raw: string | null): BilateralReviewStatusFilter {
  return raw === 'pending' || raw === 'approved' || raw === 'rejected' ? raw : 'all';
}

/** Unknown/missing → `'grouped'` (BRT-R-30's default). */
export function parseBilateralReviewView(raw: string | null): BilateralReviewViewMode {
  return raw === 'flat' ? 'flat' : 'grouped';
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
