import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class TocApiService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'toc/';
  GET_AllTocLevels() {
    return this.http.get<any>(`${this.apiBaseUrl}level/get/all`);
  }

  GET_tocLevelsByresultId(initiativeId, levelId) {
    return this.http.get<any>(`${this.apiBaseUrl}result/get/all/initiative/${initiativeId}/level/${levelId}`);
  }

  GET_fullInitiativeToc(resultId) {
    return this.http.get<any>(`${this.apiBaseUrl}result/get/full-initiative-toc/result/${resultId}`);
  }
}
