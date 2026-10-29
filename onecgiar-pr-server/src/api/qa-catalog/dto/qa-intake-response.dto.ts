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
