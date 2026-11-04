// @akili-spec quality-assurance/qa-intake
import { QA_RESULTS_BATCH_MAX } from './qa-results.constants';

/** QIN-DD-6 / design section 5: the `action` column of `result_qa_intake_log`. Shared by intake and release. */
export const QA_INTAKE_ACTION = {
  INTAKE: 'intake',
  RELEASE_QAED: 'release_qaed',
  RELEASE_NOT_QAED: 'release_not_qaed',
} as const;
export type QaIntakeAction =
  (typeof QA_INTAKE_ACTION)[keyof typeof QA_INTAKE_ACTION];

/** QIN-DD-10: the write routes share the feed's batch limit (`details`), not a second constant. */
export const QA_INTAKE_BATCH_MAX = QA_RESULTS_BATCH_MAX;

export const QA_INTAKE_ROUTE = '/api/qa/results/intake';
export const QA_RELEASE_ROUTE = '/api/qa/results/release';

/**
 * QIN-R-8 / design section 7 item 4: what the caller sees when a write fails. Fixed text: a driver
 * error carries SQL, table and column names, and the global filter copies the message into the 500 body.
 */
export const QA_WRITE_FAILED_MESSAGE = 'The QA change could not be applied';
