import { Injectable } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

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
  planned_result = null;
  result_toc_result = null;
  indicatorView = false;
  showOutcomeLevel = true;
  fullInitiativeToc = null;

  constructor(public api: ApiService) {}

  validateEOI(initiative) {
    this.showOutcomeLevel = false;

    if (!this.planned_result) {
      initiative.toc_level_id = 3;
    }

    this.indicatorView = false;
    setTimeout(() => {
      this.showOutcomeLevel = true;
    }, 100);
  }

  get_versionDashboard(initiative) {
    this.api.resultsSE.get_vesrsionDashboard(initiative.toc_result_id, initiative.initiative_id).subscribe({
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
