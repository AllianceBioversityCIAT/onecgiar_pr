import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';
import { CustomizedAlertsFsService } from '../customized-alerts-fs.service';
import { AuthService } from './auth.service';
import { CustomizedAlertsFeService } from '../customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(public resultsSE: ResultsApiService, public alertsFs: CustomizedAlertsFsService, public authSE: AuthService, public alertsFe: CustomizedAlertsFeService) {}
}
