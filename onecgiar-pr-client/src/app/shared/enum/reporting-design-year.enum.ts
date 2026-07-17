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
  GeographicLocationRedesign: 2026
} as const;
