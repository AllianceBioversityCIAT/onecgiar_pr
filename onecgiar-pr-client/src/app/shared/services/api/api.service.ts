import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';
import { CustomizedAlertsFsService } from '../customized-alerts-fs.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(public resultsApiService: ResultsApiService, public alertsFs: CustomizedAlertsFsService) {}
}
