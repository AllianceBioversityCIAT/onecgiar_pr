export interface SPProgress {
  initiativeId: number;
  initiativeCode: string;
  initiativeName: string;
  initiativeShortName: string;
  portfolioId: number;
  portfolioName: string;
  portfolioAcronym: string;
  entityTypeCode: string;
  entityTypeName: string;
  totalResults: number;
  progress: number;
  plannedKpis?: number;
  replicatedResults?: number;
  newResults?: number;
  versions: Version[];
}

export interface Version {
  versionId: number;
  phaseName: string;
  phaseYear: number;
  totalResults: number;
  plannedKpis?: number;
  replicatedResults?: number;
  newResults?: number;
  statuses: Status[];
}

export interface Status {
  statusId: number;
  statusName: string;
  count: number;
}
