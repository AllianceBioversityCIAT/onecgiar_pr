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
  InnovationDevFormReduction: 2026
} as const;
