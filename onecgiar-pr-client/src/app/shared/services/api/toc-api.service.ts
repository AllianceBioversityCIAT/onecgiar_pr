import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TocApiService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'toc/';
  apiBaseUrlV2 = environment.apiBaseUrl + 'v2/toc/';
  GET_AllTocLevels(isP25: boolean = false) {
    const dynamicApiBaseURl = isP25 ? this.apiBaseUrlV2 : this.apiBaseUrl;
    return this.http.get<any>(`${dynamicApiBaseURl}level/get/all`);
  }

  GET_tocLevelsByconfig(result_id, initiativeId, levelId, isP25: boolean = false) {
    const dynamicApiBaseURl = isP25 ? this.apiBaseUrlV2 : this.apiBaseUrl;
    return this.http.get<any>(`${dynamicApiBaseURl}result/${result_id}/initiative/${initiativeId}/level/${levelId}`).pipe(
      map(resp => {
        resp?.response.map(
          innovation =>
            (innovation.extraInformation = `<strong>${innovation.wp_short_name}</strong> <br> <div class="select_item_description">${innovation.title}</div>`)
        );
        return resp;
      })
    );
  }

  GET_fullInitiativeToc(resultId) {
    return this.http.get<any>(`${this.apiBaseUrl}result/get/full-initiative-toc/result/${resultId}`);
  }

  GET_fullInitiativeTocByinitId(initiativeId) {
    return this.http.get<any>(`${this.apiBaseUrl}result/get/full-initiative-toc/initiative/${initiativeId}`);
  }
}
