// @akili-spec quality-assurance/qa-intake
import { IneligibleReason } from '../qa-results.repository';

/**
 * QIN-R-3 / R-9: body of `POST /api/qa/results/intake`. Every requested id is in exactly one list, in
 * request order. `changed` is false when the result was already In QA (nothing was written for it).
 * Additive-only (ADR-004).
 */
export interface QaIntakeTaken {
  result_id: number;
  result_code: number;
  changed: boolean;
}

export interface QaIntakeNotTaken {
  result_id: number;
  /** `null` only for `not_found`. */
  result_code: number | null;
  /** The feed's QRF-R-8 reasons, same order. */
  reason: IneligibleReason;
}

export interface QaIntakeResponse {
  phase_year: number;
  taken: QaIntakeTaken[];
  not_taken: QaIntakeNotTaken[];
}

/** QIN-R-4: how QA ends the review of a result. `qaed` -> Quality Assessed; `not_qaed` -> back to the program, still Submitted. */
export type QaReleaseOutcome = 'qaed' | 'not_qaed';

/** QIN-R-4 / design section 6: release reasons, in the order they are checked. */
export type QaReleaseReason =
  | 'not_found'
  | 'other_phase'
  | 'not_in_qa'
  | 'not_submitted';

/**
 * QIN-R-9: body of `POST /api/qa/results/release`. Every requested id is in exactly one list, in request
 * order. Additive-only (ADR-004).
 */
export interface QaReleaseReleased {
  result_id: number;
  result_code: number;
  outcome: QaReleaseOutcome;
}

export interface QaReleaseNotReleased {
  result_id: number;
  /** `null` only when the id has no row. */
  result_code: number | null;
  reason: QaReleaseReason;
}

export interface QaReleaseResponse {
  phase_year: number;
  released: QaReleaseReleased[];
  not_released: QaReleaseNotReleased[];
}
