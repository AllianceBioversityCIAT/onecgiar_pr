/**
 * Reporting-cycle year from which a given UI redesign applies.
 *
 * Centralizes phase-gated layout logic so that adding a future threshold (2027, …)
 * is a one-line change here instead of scattered year comparisons across templates.
 *
 * A result is rendered with the redesigned UI when its reporting phase year
 * (`currentResult.phase_year`) is >= the value below; earlier phases keep the legacy UI.
 */
export enum ReportingDesignYear {
  /**
   * Contributors & Partners ToC section redesign (P2-3036) ships in the 2026 cycle.
   * Results in the 2025 phase (and earlier) keep the legacy labels, fields and validations.
   */
  ContributorsPartnersRedesign = 2026
}
