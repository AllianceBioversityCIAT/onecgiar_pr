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
