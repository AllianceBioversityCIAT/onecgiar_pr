import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RdTheoryOfChangesServicesService {
  targetsIndicators: any = [];
  impactAreasTargets: any = [];
  sdgTargest: any = [];
  actionAreaOutcome: any = [];
  isSdg: boolean;
  isImpactArea: boolean;
  body: intefacesTheoryOfChanges[] = [];
  resultActionArea: any = [];
  theoryOfChangeBody: any = [];
  primarySubmitter: any = null;

  constructor() {}

  getPrimarySubmitter() {
    return (this.primarySubmitter = this.theoryOfChangeBody?.contributing_and_primary_initiative.filter(item => item.initiative_role_id === '1')[0]);
  }
}

export class intefacesTheoryOfChanges {
  targetsIndicators: any[];
  impactAreasTargets: any[];
  sdgTargest: any[];
  actionAreaOutcome: any[];
  isSdg: boolean;
  isImpactArea: boolean;
  initiative: number;
  resultId: number;
  is_sdg_action_impact: string;
}
