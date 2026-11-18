// @akili-spec changes/portfolio-overview-revamp/global-filters (GLF-T-2, design 4.1)

/** `[resultId, projectId]` — one active link, W1/W2 and W3 alike. */
export type ResultProjectLink = [number, number];

/** `[resultId, centerCode]` — one active `results_center` row, lead or contributing. */
export type ResultCenterLink = [number, string];

export interface DimensionProject {
  id: number;
  shortName: string | null;
  fullName: string | null;
}

export interface DimensionCenter {
  code: string;
  acronym: string | null;
  name: string | null;
}

/** Newest rejection of one Rejected result (spec changes/portfolio-rejection-reason-export, PRE-R-8). */
export interface DimensionRejection {
  resultId: number;
  comment: string | null;
  programCode: string | null;
  programName: string | null;
  /** `YYYY-MM-DD`, formatted by the server (DD-7). */
  rejectedAt: string;
}

/** `response` of GET api/results-framework-reporting/portfolio/result-dimensions (admin only). */
export interface PortfolioResultDimensions {
  versionId: number;
  phaseName: string | null;
  /** Positional pairs, each appearing once. */
  projectLinks: ResultProjectLink[];
  centerLinks: ResultCenterLink[];
  projects: DimensionProject[];
  centers: DimensionCenter[];
  /** Project ids linked to at least one W3/Bilateral result: the Project filter's options. */
  w3ProjectIds: number[];
  /** One entry per Rejected result of the version that has a rejection record (the export's reason columns). */
  rejections: DimensionRejection[];
}
