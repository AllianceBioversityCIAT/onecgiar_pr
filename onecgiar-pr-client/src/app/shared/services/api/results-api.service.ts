import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  getAllResultLevel() {
    return this.http.get<any>(`${this.apiBaseUrl}result-levels/all`);
  }
  getAllResults() {
    return this.http.get<any>(`${this.apiBaseUrl}get/all-results`);
  }
}
