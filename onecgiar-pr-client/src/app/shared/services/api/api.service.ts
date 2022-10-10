import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';
import { CustomizedAlertsFsService } from '../customized-alerts-fs.service';
import { AuthService } from './auth.service';
import { CustomizedAlertsFeService } from '../customized-alerts-fe.service';
import { DataControlService } from '../data-control.service';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(public resultsSE: ResultsApiService, public alertsFs: CustomizedAlertsFsService, public authSE: AuthService, public alertsFe: CustomizedAlertsFeService, public dataControlSE: DataControlService) {}

  updateUserData() {
    forkJoin([this.authSE.GET_allRolesByUser(), this.authSE.GET_initiativesByUser()]).subscribe(resp => {
      const [GET_allRolesByUser, GET_initiativesByUser] = resp;
      this.dataControlSE.myInitiativesList = GET_initiativesByUser?.response;
      this.dataControlSE.myInitiativesList.map(myInit => (myInit.role = GET_allRolesByUser?.response?.initiative?.find(initRole => initRole?.initiative_id == myInit?.id)?.description));
    });
  }
}
