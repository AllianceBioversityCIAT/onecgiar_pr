export interface ReportingTocContext {
  reportingYear: number;
  phaseUuid: string;
  versionId?: number;
  phaseName?: string | null;
}

export interface ReportingTocContextResolutionError extends Error {
  response: Record<string, unknown>;
  status: number;
}
