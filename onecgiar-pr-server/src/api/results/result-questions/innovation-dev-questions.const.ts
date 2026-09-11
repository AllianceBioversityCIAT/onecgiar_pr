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

/*
 * P2-3467 — questions 78 (GESI), 79 (risk) and 137 (partners, policies and financial
 * mechanisms) are served up to the 2025 phase only. They need no marker here: the
 * slot table in `responsibleInnovationAndScalingV2` pins q1..q4 by id, so a question
 * that owns no slot for the phase is simply not served. Their rows and every stored
 * answer stay in the database untouched.
 */

/**
 * P2-3272 / P2-3513 — the single Intellectual Property question that replaces the
 * four IPR ones (101, 102, 103, 138) from the 2026 phase on.
 *
 * Inserted by 1788441000000-AddConsolidatedIprQuestionP25 with options
 * Yes / Not sure / No. Matched by text, not by id, for the reason at the top of
 * this file.
 */
export const CONSOLIDATED_IPR_QUESTION_TEXT =
  'Do you have any Intellectual Property considerations for this innovation?';

/**
 * The options of the consolidated question that mean "the reporter wants IP support",
 * i.e. the ones that trigger the notification flow of P2-3272 Part 3 on submission.
 *
 * Up to the 2025 phase the trigger is option 110 ("Yes, please contact me") of
 * question 103; from 2026 it is either of these two.
 */
export const CONSOLIDATED_IPR_TRIGGER_OPTION_TEXTS = ['Yes', 'Not sure'];

/**
 * Option 110, "Yes, please contact me", of question 103 — the pre-2026 trigger of
 * the IP focal-point notification.
 *
 * An id and not a text on purpose: this row predates the P25 clone and is the same
 * in every environment, and the phases it serves are closed to new questions.
 */
export const LEGACY_IP_EXPERT_SUPPORT_OPTION_ID = 110;

/*
 * P2-3272 — questions 101, 102, 103 and 138 are served up to the 2025 phase only,
 * by the same slot-table mechanism described above. Their rows and every stored
 * answer stay untouched: the epic's PO note requires a 2025-phase result to keep
 * rendering its four original questions with the answers already given.
 */

/**
 * Normalises a question text for comparison: trims, collapses runs of whitespace
 * (the stored texts are multi-line in places) and lowercases.
 */
export function normalizeQuestionText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const GESI_STAGE_KEY = normalizeQuestionText(GESI_STAGE_QUESTION_TEXT);
const RISK_STAGE_KEY = normalizeQuestionText(RISK_STAGE_QUESTION_TEXT);
export function isGesiStageQuestion(text: string | null | undefined): boolean {
  return normalizeQuestionText(text) === GESI_STAGE_KEY;
}

export function isRiskStageQuestion(text: string | null | undefined): boolean {
  return normalizeQuestionText(text) === RISK_STAGE_KEY;
}

const CONSOLIDATED_IPR_KEY = normalizeQuestionText(
  CONSOLIDATED_IPR_QUESTION_TEXT,
);

export function isConsolidatedIprQuestion(
  text: string | null | undefined,
): boolean {
  return normalizeQuestionText(text) === CONSOLIDATED_IPR_KEY;
}

const CONSOLIDATED_IPR_TRIGGER_KEYS = new Set(
  CONSOLIDATED_IPR_TRIGGER_OPTION_TEXTS.map(normalizeQuestionText),
);

/** True for the "Yes" / "Not sure" options of the consolidated IPR question. */
export function isConsolidatedIprTriggerOption(
  text: string | null | undefined,
): boolean {
  return CONSOLIDATED_IPR_TRIGGER_KEYS.has(normalizeQuestionText(text));
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
