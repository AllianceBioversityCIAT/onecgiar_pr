/**
 * Innovation Development questionnaire — phase-gated question set (epic P2-3243).
 *
 * Questions are rows in `result_questions`, and their ids are assigned by
 * AUTO_INCREMENT (migration 1762398554711 cloned the P22 rows into P25), so they
 * are **not** guaranteed to match across environments. Everything phase-gated is
 * therefore anchored on the question TEXT, never on a hardcoded id.
 *
 * If a text below is ever changed by the PO, it must be changed here AND in the
 * `validation_innovation_dev_P25` function in the database at the same time, or
 * the question silently stops being recognised on one of the two sides.
 * That function is applied by hand per environment and is deliberately not a
 * migration — it resolves these same two questions by text.
 */

/**
 * Reporting phase year from which the reduced Innovation Development form applies.
 * Mirrors `ReportingDesignYear.InnovationDevFormReduction` on the client.
 *
 * Gated on the phase YEAR and not on the portfolio on purpose: the P25 portfolio
 * also holds 2025-phase results, which must keep rendering exactly as before.
 */
export const INNOVATION_DEV_FORM_REDUCTION_YEAR = 2026;

/** P2-3467 — GESI stage question, added for the 2026 form. */
export const GESI_STAGE_QUESTION_TEXT =
  'What is the current stage of GESI consideration for this innovation?';

/** P2-3467 — negative impact / risk stage question, added for the 2026 form. */
export const RISK_STAGE_QUESTION_TEXT =
  'What is the current stage of negative impact/risk assessment for this innovation?';

/** P2-3467 — questions served up to the 2025 phase only. Their answers are retained. */
export const RETIRED_SCALING_QUESTION_TEXTS = [
  'Which concrete actions have been taken to understand and improve Gender Equality and Social Inclusivity (GESI) in developing this innovation?',
  'What concrete actions have been taken to understand and/or limit potential unintended negative consequences or impacts if the innovation is used at scale?',
  'What partners, policies, and financial mechanisms are in place to ensure the benefits of the innovation are sustained and equitably shared?',
];

/**
 * Normalises a question text for comparison: trims, collapses runs of whitespace
 * (the stored texts are multi-line in places) and lowercases.
 */
export function normalizeQuestionText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const GESI_STAGE_KEY = normalizeQuestionText(GESI_STAGE_QUESTION_TEXT);
const RISK_STAGE_KEY = normalizeQuestionText(RISK_STAGE_QUESTION_TEXT);
const RETIRED_KEYS = new Set(
  RETIRED_SCALING_QUESTION_TEXTS.map(normalizeQuestionText),
);

export function isGesiStageQuestion(text: string | null | undefined): boolean {
  return normalizeQuestionText(text) === GESI_STAGE_KEY;
}

export function isRiskStageQuestion(text: string | null | undefined): boolean {
  return normalizeQuestionText(text) === RISK_STAGE_KEY;
}

export function isRetiredScalingQuestion(
  text: string | null | undefined,
): boolean {
  return RETIRED_KEYS.has(normalizeQuestionText(text));
}

/** True when the result's phase must be served the reduced 2026 form. */
export function isReducedInnovationDevForm(
  phaseYear: number | null | undefined,
): boolean {
  return (
    typeof phaseYear === 'number' &&
    phaseYear >= INNOVATION_DEV_FORM_REDUCTION_YEAR
  );
}
