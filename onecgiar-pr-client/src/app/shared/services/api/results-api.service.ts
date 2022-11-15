import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map, tap, catchError, of, retry, throwError } from 'rxjs';
import { ResultBody } from '../../interfaces/result.interface';
import { GeneralInfoBody } from '../../../pages/results/pages/result-detail/pages/rd-general-information/models/generalInfoBody';
import { PartnersBody } from 'src/app/pages/results/pages/result-detail/pages/rd-partners/models/partnersBody';
import { GeographicLocationBody } from '../../../pages/results/pages/result-detail/pages/rd-geographic-location/models/geographicLocationBody';
import { LinksToResultsBody } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/models/linksToResultsBody';
import { PartnersRequestBody } from '../../../pages/results/pages/result-detail/components/partners-request/models/partnersRequestBody.model';
import { EvidencesBody } from '../../../pages/results/pages/result-detail/pages/rd-evidences/model/evidencesBody.model';
import { TheoryOfChangeBody } from '../../../pages/results/pages/result-detail/pages/rd-theory-of-change/model/theoryOfChangeBody';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient, private saveButtonSE: SaveButtonService) {}
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
    return this.http.get<any>(`${this.apiBaseUrl}gender-tag-levels/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.full_name = `(${institution?.id - 1}) ${institution?.title}`));
        return resp;
      })
    );
  }

  GET_institutionTypes() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions-type/all`);
  }

  GET_allInstitutions() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym}</strong> - ${institution?.institutions_name} - ${institution?.headquarter_name}`));
        return resp;
      })
    );
  }

  GET_generalInformationByResultId() {
    return this.http.get<any>(`${this.apiBaseUrl}get/general-information/result/${this.currentResultId}`);
  }

  PATCH_generalInformation(body: GeneralInfoBody) {
    this.saveButtonSE.showSaveSpinner();
    return this.http.patch<any>(`${this.apiBaseUrl}create/general-information`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_resultById() {
    return this.http.get<any>(`${this.apiBaseUrl}get/${this.currentResultId}`);
  }

  GET_depthSearch(title: string) {
    return this.http.get<any>(`${this.apiBaseUrl}get/depth-search/${title}`);
  }

  PATCH_partnersSection(body: PartnersBody) {
    return this.http.patch<any>(`${this.apiBaseUrl}results-by-institutions/create/partners/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }
  GET_partnersSection() {
    return this.http.get<any>(`${this.apiBaseUrl}results-by-institutions/partners/result/${this.currentResultId}`);
  }

  GET_AllPrmsGeographicScope() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/geographic-scope/get/all/prms`);
  }

  GET_AllCLARISARegions() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/regions/get/all`);
  }

  POST_partnerRequest(body: PartnersRequestBody) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/clarisa/partner-request/${this.currentResultId}`, body);
  }

  GET_AllCLARISACountries() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/countries/get/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.full_name = `${institution?.iso_alpha_2} - ${institution?.name}`));
        return resp;
      })
    );
  }

  GET_AllCLARISACenters() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/centers/get/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.lead_center = institution.code));
        return resp;
      })
    );
  }

  GET_AllWithoutResults() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/initiatives/get/all/without/result/${this.currentResultId}`).pipe(
      map(resp => {
        // console.log(resp.response);
        resp.response.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name}</strong> - ${initiative?.name}`));
        return resp;
      })
    );
  }

  PATCH_geographicSection(body: GeographicLocationBody) {
    return this.http.patch<any>(`${this.apiBaseUrl}update/geographic/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_geographicSection() {
    return this.http.get<any>(`${this.apiBaseUrl}get/geographic/${this.currentResultId}`);
  }

  GET_resultsLinked() {
    return this.http.get<any>(`${this.apiBaseUrl}linked/get/${this.currentResultId}`);
  }

  POST_resultsLinked(body: LinksToResultsBody) {
    return this.http.post<any>(`${this.apiBaseUrl}linked/create/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_evidences() {
    return this.http.get<any>(`${this.apiBaseUrl}evidences/get/${this.currentResultId}`);
  }

  POST_evidences(body: EvidencesBody) {
    return this.http.post<any>(`${this.apiBaseUrl}evidences/create/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  POST_toc(body: TheoryOfChangeBody) {
    return this.http.post<any>(`${this.apiBaseUrl}toc/create/toc/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_mqapValidation(handle) {
    return this.http.get<any>(`${this.apiBaseUrl}results-knowledge-products/mqap?handle=${handle}`);
  }

  GET_resultknowledgeProducts() {
    return this.http.get<any>(`${this.apiBaseUrl}results-knowledge-products/get/result/${this.currentResultId}`);
  }

  POST_createWithHandle(body) {
    return this.http.post<any>(`${this.apiBaseUrl}results-knowledge-products/create`, body);
  }

  GET_toc() {
    return this.http.get<any>(`${this.apiBaseUrl}toc/get/result/${this.currentResultId}`).pipe(
      map(resp => {
        // console.log(resp.response);
        resp?.response?.contributing_initiatives.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name || ''}</strong> - ${initiative?.initiative_name}`));
        return resp;
      })
    );
  }
}

// 200 no existe
// 201 ya existte en bd
