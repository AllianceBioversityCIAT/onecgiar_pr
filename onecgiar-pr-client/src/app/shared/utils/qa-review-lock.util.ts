/**
 * QA review lock (client side of the server's `isResultUnderQaReview`).
 *
 * While QA holds a result (`inQA`, from `result.in_qa`) in an open phase (`is_phase_open`), no
 * section may be saved — not even by an admin. The server answers 409 to General information in
 * that state; this keeps the form read-only so the user never gets that far.
 *
 * Same predicate as the server on purpose, without the `in_qa` global variable: the server does not
 * read it either, and a front that allowed what the back refuses would only produce save errors.
 */
export const QA_REVIEW_LOCK_REASON = 'This result is under QA review, so it can only be viewed until QA releases it.';

export function isResultLockedByQaReview(result: { inQA?: unknown; is_phase_open?: unknown } | null | undefined): boolean {
  if (!result) return false;
  return Number(result.inQA) === 1 && Number(result.is_phase_open) === 1;
}
