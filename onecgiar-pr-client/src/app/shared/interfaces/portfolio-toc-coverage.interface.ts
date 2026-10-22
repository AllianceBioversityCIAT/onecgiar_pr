// @akili-spec changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure (TND-T-2)
/**
 * Covered / total KPI counts (total and covered count only KPIs with a target).
 * `noTarget` = KPIs without a target, excluded from both; optional so an older server reads as 0 (TND-DD-3).
 */
export interface CoverageCount {
  total: number;
  covered: number;
  noTarget?: number;
}

/** One Program or Accelerator of the open portfolio (unordered on the wire). */
export interface PortfolioTocCoverageProgram extends CoverageCount {
  code: string;
  shortName: string;
  name: string;
  outputs: CoverageCount;
  outcomes: CoverageCount;
}

/** `response` of GET api/results-framework-reporting/toc-results/portfolio-coverage. */
export interface PortfolioTocCoverage {
  versionId: number;
  phaseName: string | null;
  reportingYear: number;
  programs: PortfolioTocCoverageProgram[];
  portfolio: CoverageCount;
}
