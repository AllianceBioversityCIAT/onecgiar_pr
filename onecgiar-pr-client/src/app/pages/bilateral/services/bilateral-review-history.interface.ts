/**
 * One row of `result_review_history`, as returned by GET /api/results/bilateral/:id/review-history
 * (newest first). `initiative_code` is the SP that took the decision; it is null on rows written
 * before `RSB-T-1`.
 */
export interface ReviewHistoryEntry {
  id: number;
  result_id: number;
  action: string;
  comment: string | null;
  created_at: string;
  created_by: number;
  initiative_code?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/** `REJECTED` is the pre-RSB spelling; both mean a rejection. */
export const isRejectAction = (action: string | null | undefined): boolean => action === 'REJECT' || action === 'REJECTED';

/** Newest first, whatever order the server answered in (ties broken by id). */
export const sortReviewHistoryNewestFirst = (entries: readonly ReviewHistoryEntry[]): ReviewHistoryEntry[] =>
  [...entries].sort((a, b) => {
    const byDate = new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime();
    return byDate || (b?.id ?? 0) - (a?.id ?? 0);
  });
