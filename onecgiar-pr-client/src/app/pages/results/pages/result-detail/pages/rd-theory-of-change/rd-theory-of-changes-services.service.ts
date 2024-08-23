import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class RdTheoryOfChangesServicesService {
  impactAreasTargets: any = [];
  sdgTargest: any = [];
  actionAreaOutcome: any = [];
  isSdg: boolean;
  isImpactArea: boolean;
  body: intefacesTheoryOfChanges[] = [];
  resultActionArea: any = [];
  theoryOfChangeBody: any = [];
  planned_result = null;
  result_toc_result = null;
  contributors_result_toc_result = null;
  fullInitiativeToc = null;

  constructor(public api: ApiService) {}

  get_versionDashboard(initiative) {
    this.api.resultsSE.get_vesrsionDashboard(initiative.initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response?.version_id;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}

export class intefacesTheoryOfChanges {
  impactAreasTargets: any[];
  sdgTargest: any[];
  actionAreaOutcome: any[];
  isSdg: boolean;
  isImpactArea: boolean;
  initiative: number;
  resultId: number;
  is_sdg_action_impact: string;
}
