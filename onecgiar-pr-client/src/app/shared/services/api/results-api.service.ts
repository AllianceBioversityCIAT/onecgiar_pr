import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParamsOptions } from '@angular/common/http';
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
import { ElasticResult, Source } from '../../interfaces/elastic.interface';
import { KnowledgeProductBodyMapped } from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/model/KnowledgeProductBodyMapped';
import { KnowledgeProductSaveDto } from '../../../pages/results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/model/knowledge-product-save.dto';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient, private saveButtonSE: SaveButtonService) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  currentResultId: number | string = null;
  private readonly elasicCredentials = `Basic ${btoa(`${environment.elastic.username}:${environment.elastic.password}`)}`;
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

  GET_FindResultsElastic(search?: string) {
    const elasticSearchString = (search ?? '')
      .split(' ')
      .map(s => `${s}*`)
      .join(' ');
    const searchQuery = `?q=${elasticSearchString?.length > 0 ? elasticSearchString : '*'}`;
    const options = { headers: new HttpHeaders({ Authorization: this.elasicCredentials }) };
    return this.http.get<ElasticResult>(`${environment.elastic.baseUrl}${searchQuery}`, options).pipe(
      map(resp =>
        (resp?.hits?.hits ?? []).map(h => {
          return { probability: h._score, ...h._source } as Source & { probability: number };
        })
      )
    );
  }

  POST_resultCreateHeader(body: ResultBody) {
    return this.http.post<any>(`${this.apiBaseUrl}create/header`, body).pipe(this.saveButtonSE.isCreatingPipe());
  }

  GET_allGenderTag() {
    return this.http.get<any>(`${this.apiBaseUrl}gender-tag-levels/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.full_name = `(${institution?.id - 1}) ${institution?.title}`));
        return resp;
      })
    );
  }

  GET_newInstitutionTypes() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions-type/new`);
  }

  GET_legacyInstitutionTypes() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions-type/legacy`);
  }

  GET_allInstitutionTypes() {
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
    return this.http.get<any>(`${this.apiBaseUrl}get/general-information/result/${this.currentResultId}`).pipe(this.saveButtonSE.isSavingSectionPipe());
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

  PATCH_knowledgeProductSection(body: KnowledgeProductSaveDto) {
    return this.http.patch<any>(`${this.apiBaseUrl}results-knowledge-products/upsert/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_partnersSection() {
    return this.http.get<any>(`${this.apiBaseUrl}results-by-institutions/partners/result/${this.currentResultId}`).pipe(
      map(resp => {
        if (resp?.response?.mqap_institutions) {
          resp?.response?.mqap_institutions.map(resp => {
            console.log(resp?.user_matched_institution?.deliveries);
            if (!resp?.user_matched_institution?.deliveries?.length) resp.user_matched_institution.deliveries = [3];
          });
        }
        return resp;
      }),
      this.saveButtonSE.isSavingSectionPipe()
    );
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
        // console.log(resp);
        resp.response.map(center => {
          center.lead_center = center.code;
          center.full_name = `<strong>${center.acronym} - </strong> ${center.name}`;
        });
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
    return this.http.get<any>(`${this.apiBaseUrl}results-knowledge-products/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isSavingSectionPipe());
  }

  PATCH_resyncKnowledgeProducts() {
    return this.http.patch<any>(`${this.apiBaseUrl}results-knowledge-products/resync/${this.currentResultId}`, null).pipe(this.saveButtonSE.isSavingSectionPipe());
  }

  POST_createWithHandle(body) {
    return this.http.post<any>(`${this.apiBaseUrl}results-knowledge-products/create`, body).pipe(this.saveButtonSE.isCreatingPipe());
  }

  GET_toc() {
    return this.http.get<any>(`${this.apiBaseUrl}toc/get/result/${this.currentResultId}`).pipe(
      map(resp => {
        // console.log(resp.response);
        resp?.response?.contributing_initiatives.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name || ''}</strong> - ${initiative?.initiative_name}`));
        return resp;
      }),
      this.saveButtonSE.isSavingSectionPipe()
    );
  }

  PATCH_innovationUse(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/innovation-use/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_innovationUse() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/innovation-use/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isSavingSectionPipe());
  }

  PATCH_capacityDevelopent(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/capacity-developent/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_capacityDevelopent() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/capacity-developent/get/result/${this.currentResultId}`).pipe(
      this.saveButtonSE.isSavingSectionPipe(),
      map((resp: any) => {
        resp?.response?.institutions?.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym}</strong> - ${institution?.institutions_name}`));
        return resp;
      })
    );
  }

  GET_capdevsTerms() {
    return this.http.get<any>(`${this.apiBaseUrl}capdevs-terms/get/all`);
  }

  GET_capdevsDeliveryMethod() {
    return this.http.get<any>(`${this.apiBaseUrl}capdevs-delivery-methods/get/all`);
  }

  GET_AllInitiatives() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/initiatives`).pipe(
      map(resp => {
        // console.log(resp);
        resp?.response.map(initiative => (initiative.initiative_id = initiative?.id));
        resp?.response.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name}</strong> - ${initiative?.name}`));
        return resp;
      })
    );
  }

  GET_clarisaInnovationType() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-type/get/all`);
  }

  GET_clarisaInnovationCharacteristics() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-characteristics/get/all`);
  }

  GET_clarisaInnovationReadinessLevels() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-readiness-levels/get/all`);
  }

  PATCH_innovationDev(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/innovation-dev/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_innovationDev() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/innovation-dev/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isSavingSectionPipe());
  }

  PATCH_policyChanges(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/policy-changes/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_policyChanges() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/policy-changes/get/result/${this.currentResultId}`).pipe(
      this.saveButtonSE.isSavingSectionPipe(),
      map((resp: any) => {
        resp?.response?.institutions?.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym}</strong> - ${institution?.institutions_name}`));
        return resp;
      })
    );
  }

  GET_clarisaPolicyTypes() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/policy-types/get/all`);
  }

  GET_clarisaPolicyStages() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/policy-stages/get/all`);
  }

  GET_AllClarisaImpactAreaIndicators() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/impact-area-indicators/get/all`);
  }

  GET_AllLarisaImpactArea() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/impact-area/get/all`);
  }

  GET_AllglobalTarget() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/global-target/get/all`);
  }

  GET_AllMeliaStudies() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/melia-study-type/get/all`);
  }

  POST_createRequest(body) {
    console.log(this.currentResultId);
    return this.http.post<any>(`${this.apiBaseUrl}request/create/${this.currentResultId}`, body);
  }

  GET_allRequest() {
    return this.http.get<any>(`${this.apiBaseUrl}request/get/all`);
  }

  PATCH_updateRequest(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}request/update`, body);
  }

  GET_requestStatus() {
    return this.http.get<any>(`${this.apiBaseUrl}request/get/status`);
  }

  POST_updateRequest(body) {
    return this.http.post<any>(`${this.apiBaseUrl}map/legacy`, body);
  }
}
