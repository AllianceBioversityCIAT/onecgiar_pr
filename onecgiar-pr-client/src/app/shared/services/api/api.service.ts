import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';
import { CustomizedAlertsFsService } from '../customized-alerts-fs.service';
import { AuthService } from './auth.service';
import { CustomizedAlertsFeService } from '../customized-alerts-fe.service';
import { DataControlService } from '../data-control.service';
import { forkJoin } from 'rxjs';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { WordCounterService } from '../word-counter.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(public resultsSE: ResultsApiService, public alertsFs: CustomizedAlertsFsService, public authSE: AuthService, public alertsFe: CustomizedAlertsFeService, public dataControlSE: DataControlService, public resultsListFilterSE: ResultsListFilterService, public wordCounterSE: WordCounterService) {}

  updateUserData() {
    forkJoin([this.authSE.GET_allRolesByUser(), this.authSE.GET_initiativesByUser()]).subscribe(resp => {
      const [GET_allRolesByUser, GET_initiativesByUser] = resp;
      this.dataControlSE.myInitiativesList = GET_initiativesByUser?.response;
      this.dataControlSE.myInitiativesList.map(myInit => {
        myInit.role = GET_allRolesByUser?.response?.initiative?.find(initRole => initRole?.initiative_id == myInit?.initiative_id)?.description;
        myInit.name = myInit.official_code;
        myInit.official_code_short_name = myInit.official_code + ' ' + myInit.short_name;
      });
      this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
    });
  }

  clearAll() {
    this.dataControlSE.myInitiativesList = [];
  }

  updateResultsList() {
    this.resultsSE.getAllResultsWithUseRole(this.authSE.localStorageUser.id).subscribe(resp => {
      this.dataControlSE.resultsList = resp.response;
      console.log(this.dataControlSE.resultsList);
    });
  }
}
