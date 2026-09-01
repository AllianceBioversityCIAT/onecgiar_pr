/**
 * Reporting-cycle year from which a given UI redesign applies.
 *
 * Centralizes phase-gated layout logic so that adding a future threshold (2027, …)
 * is a one-line change here instead of scattered year comparisons across templates.
 *
 * A result is rendered with the redesigned UI when its reporting phase year
 * (`currentResult.phase_year`) is >= the value below; earlier phases keep the legacy UI.
 *
 * Modelled as a `const` object (not a TS `enum`) on purpose: two thresholds legitimately
 * share the 2026 cycle, which a real enum can express neither as duplicate literals
 * (S6578) nor as a cross-member reference (S6550). A const map has neither restriction
 * and keeps both named thresholds for readability and future divergence.
 *
 * 🛑 Phase year is NOT the portfolio. `isP25()` is true for the 2025 phase too — both live in the
 * P25 portfolio — so a portfolio gate cannot separate "what is new in 2026" from what came before.
 * Full audit, the inventory of every gate in the app and the known gaps:
 * `docs/context-ai/fase-vs-portafolio.md`.
 */
export const ReportingDesignYear = {
  /**
   * Contributors & Partners ToC section redesign (P2-3036) ships in the 2026 cycle.
   * Results in the 2025 phase (and earlier) keep the legacy labels, fields and validations.
   */
  ContributorsPartnersRedesign: 2026,

  /**
   * Geographic location "location of benefit" wording (P2-3036 AC9) ships in the 2026 cycle
   * for P25 Innovation results. Earlier phases keep the "geographic focus" wording.
   */
  GeographicLocationRedesign: 2026,

  /**
   * Reporting-form guidance redesign (P2-3201 / INC-158283) ships in the 2026 cycle: the AI
   * assistant notes and the guidance moved from inline grey boxes into ⓘ tooltips.
   * Confirmed with the PO on 18 Aug 2026 — it applies to the current portfolio only, so results
   * in the 2025 phase (and earlier) keep their inline guidance boxes and show no AI notes.
   */
  ReportingFormGuidanceRedesign: 2026,

  /**
   * Lead Contact Person becomes a mandatory MDS field (P2-3225) in the 2026 cycle, for pooled
   * results and Innovation Packages alike. The 2025 cycle is closed, so those results keep the
   * field optional — matching `validation_general_information_P25`, which gates the green check
   * on the same year.
   */
  LeadContactPersonMandatory: 2026,

  /**
   * SIDS form reduction for Innovation Development (epic P2-3243) ships in the 2026 cycle: the
   * "Demand of anticipated innovation user" section (P2-3263) and the Megatrends question (P2-3264)
   * stop being shown. Results in the 2025 phase (and earlier) keep both, with their stored answers —
   * the epic's governing rule is that previous phases must render exactly as they did.
   *
   * Gated on the reporting phase YEAR, not on the portfolio: `isP25()` answers "which portfolio",
   * and the two are not interchangeable — the test environment holds 2025-phase results inside the
   * P25 portfolio, which a portfolio gate would strip the section from.
   */
  InnovationDevFormReduction: 2026,

  /**
   * SIDS revision (P2-3295): from the 2026 cycle the Innovation Use 2030 block is titled
   * "2030 Use Projection" and carries the projection tooltip. Phases <= 2025 keep the legacy
   * long title verbatim — backward compatibility is absolute for this epic.
   *
   * Gated on the reporting phase YEAR, not on the portfolio: prtest holds 2025-phase results
   * inside the P25 portfolio, and `isP25()` would rename the section for those too.
   */
  InnovationUse2030Projection: 2026,

  /**
   * SIDS revision (P2-3272 Part 4): from the 2026 cycle the "Innovation Developer" field of
   * Innovation Development is pre-filled from the Lead contact person captured in General
   * Information, and its long guidance note is dropped. Phases <= 2025 keep the empty field and
   * the note verbatim.
   *
   * Gated on the reporting phase YEAR, not on the portfolio: prtest holds 2025-phase results
   * inside the P25 portfolio, and `isP25()` would pre-fill and strip the note for those too.
   */
  InnovationDeveloperAutoFill: 2026
} as const;
