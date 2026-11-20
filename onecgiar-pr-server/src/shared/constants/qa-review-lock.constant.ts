/**
 * QA review lock for section saves.
 *
 * While QA holds a result (`result.in_qa = 1`) in an open phase (`version.status = 1`), no section
 * of that result may be saved. This is the same predicate the unsubmit guard uses
 * (`ResultRepository.unsubmitUnlessUnderQaReview`, QIN-R-6): QA reads the result as it was
 * submitted, so a save in between would change what QA is assessing.
 */
export const RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE =
  'This result is under QA review and cannot be edited until QA releases it.';

/**
 * True when the row is locked by QA. Takes the `getResultById` shape (`inQA`, `is_phase_open`),
 * whose values come back from MySQL as 0/1 numbers or strings, so both are normalised.
 */
export function isResultUnderQaReview(
  result: { inQA?: unknown; is_phase_open?: unknown } | null | undefined,
): boolean {
  if (!result) return false;
  return Number(result.inQA) === 1 && Number(result.is_phase_open) === 1;
}
