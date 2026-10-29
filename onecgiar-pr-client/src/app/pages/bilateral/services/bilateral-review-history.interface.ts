import { scienceProgramLabel } from '../../../shared/utils/science-program-label.util';

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
  initiative_name?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/** `SP01 - Name` for the deciding Science Program; the bare code when no name came back, '' when neither. */
export const reviewEntryProgramLabel = (entry: ReviewHistoryEntry | null | undefined): string =>
  scienceProgramLabel(entry?.initiative_code, entry?.initiative_name);

/** `REJECTED` is the pre-RSB spelling; both mean a rejection. */
export const isRejectAction = (action: string | null | undefined): boolean => action === 'REJECT' || action === 'REJECTED';

/** Newest first, whatever order the server answered in (ties broken by id). */
export const sortReviewHistoryNewestFirst = (entries: readonly ReviewHistoryEntry[]): ReviewHistoryEntry[] =>
  [...entries].sort((a, b) => {
    const byDate = new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime();
    return byDate || (b?.id ?? 0) - (a?.id ?? 0);
  });
