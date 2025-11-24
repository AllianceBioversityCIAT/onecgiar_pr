export interface EntityDetails {
  initiative: Initiative;
  parentUnit: Unit;
  units: Unit[];
  metadata: Metadata;
}

export interface Initiative {
  id: number;
  officialCode: string;
  name: string;
  shortName: string;
}

export interface Metadata {
  activeYear: number;
  portfolio: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  composeCode: string;
  level: number;
  year: number;
  parentId?: string;
  progress: number;
  progressDetails?: {
    targetValueSum: number;
    actualAchievedValueSum: number;
  };
}
