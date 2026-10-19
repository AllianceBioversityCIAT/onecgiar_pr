/** Covered / total KPI counts. */
export interface CoverageCount {
  total: number;
  covered: number;
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
