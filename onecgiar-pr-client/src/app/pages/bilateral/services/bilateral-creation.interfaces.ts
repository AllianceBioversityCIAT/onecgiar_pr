import { Injectable } from '@angular/core';

export interface BilateralProject {
  id: number;
  shortName: string;
  fullName: string;
  summary: string | null;
  description: string | null;
  leadCenter: {
    id: number;
    name: string;
    acronym: string;
  } | null;
  sciencePrograms: ScienceProgramMapping[];
  /**
   * `BIL-POM-OQ-1` correction (2026-09-22) — count of W1/W2 (`source='Result'`) results that
   * tag this project as a contributor (`results_by_projects`), independent of any lead
   * bilateral project attribution. Only populated when the caller passes `versionId` to
   * `GET_bilateralProjects`; otherwise always `0`.
   */
  w1w2ContributorCount: number;
}

export interface ScienceProgramMapping {
  programId: number;
  programCode: string;
  allocation: string | null;
  spName: string;
  spShortName: string;
}

export interface BilateralResultCreateDto {
  result_type_id: number;
  result_level_id: number;
  version_id: number;
  source: 'API';
  status_id: number;
  title?: string;
  description?: string;
}
