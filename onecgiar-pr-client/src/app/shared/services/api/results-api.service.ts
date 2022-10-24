import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs';
import { ResultBody } from '../../interfaces/result.interface';
import { GeneralInfoBody } from '../../../pages/results/pages/result-detail/pages/rd-general-information/models/generalInfoBody';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  currentResultId: number | string = null;
  GET_AllResultLevel() {
    return this.http.get<any>(`${this.apiBaseUrl}levels/all`);
  }
  GET_TypeByResultLevel() {
    return this.http.get<any>(`${this.apiBaseUrl}type-by-level/get/all`);
  }
  GET_AllResults() {
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

  GET_allGenderTag() {
    return this.http.get<any>(`${this.apiBaseUrl}gender-tag-levels/all`);
  }

  GET_institutionTypes() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions-type/all`);
  }

  GET_allInstitutions() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions/all`);
  }

  GET_generalInformationByResultId() {
    return this.http.get<any>(`${this.apiBaseUrl}get/general-information/result/${this.currentResultId}`);
  }
  PATCH_generalInformation(body: GeneralInfoBody) {
    return this.http.patch<any>(`${this.apiBaseUrl}create/general-information`, body);
  }
}
