// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-3)

/** The three counts shared by `totals`, every `byProgram` item and every `byCenter` item. */
export interface ProjectCounts {
  mapped: number;
  withBilateralResults: number;
  w1w2Contributors: number;
}

/** One Program or Accelerator of the open portfolio (unordered on the wire; zeros included). */
export interface ProjectsByProgram extends ProjectCounts {
  code: string;
  shortName: string;
  name: string;
}

/** One owning Center (only mapped > 0); `code` is `null` for the Unassigned bucket. */
export interface ProjectsByCenter extends ProjectCounts {
  code: string | null;
  acronym: string | null;
  name: string | null;
}

/** `response` of GET api/results-framework-reporting/portfolio/bilateral-projects. */
export interface PortfolioBilateralProjects {
  versionId: number;
  phaseName: string | null;
  phaseYear: number;
  totals: ProjectCounts;
  byProgram: ProjectsByProgram[];
  byCenter: ProjectsByCenter[];
  /** Projects with W3/Bilateral results but no approved P/A mapping (not counted anywhere else). */
  unmappedWithBilateralResults: number;
}
