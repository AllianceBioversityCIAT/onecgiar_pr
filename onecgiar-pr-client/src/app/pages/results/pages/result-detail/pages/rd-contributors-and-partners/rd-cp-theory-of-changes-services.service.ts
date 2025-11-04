import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Injectable({
  providedIn: 'root'
})
export class RdCpTheoryOfChangesServicesService {
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
  fieldsManagerSE = inject(FieldsManagerService);

  constructor(public api: ApiService) {}

  get_versionDashboard(initiative) {
    this.api.resultsSE.get_vesrsionDashboard(initiative.initiative_id, this.fieldsManagerSE.isP25()).subscribe({
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
