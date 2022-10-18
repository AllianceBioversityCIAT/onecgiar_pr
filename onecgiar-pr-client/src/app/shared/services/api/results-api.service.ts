import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultBody } from '../../interfaces/result';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  GET_AllResultLevel() {
    return this.http.get<any>(`${this.apiBaseUrl}levels/all`);
  }
  GET_TypeByResultLevel() {
    return this.http.get<any>(`${this.apiBaseUrl}type-by-level/get/all`);
  }
  getAllResults() {
    return this.http.get<any>(`${this.apiBaseUrl}get/all`);
  }
  GET_AllResultsWithUseRole(userId) {
    return this.http.get<any>(`${this.apiBaseUrl}get/all/roles/${userId}`).pipe(
      map(resp => {
        resp.response.map(result => (result.id = Number(result.id)));
        return resp;
      })
    );
  }
  POST_resultCreateHeader(body: ResultBody) {
    return this.http.post<any>(`${this.apiBaseUrl}create/header`, body);
  }
}
