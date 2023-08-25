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
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';
import { getInnovationComInterface } from '../../../../../../onecgiar-pr-server/src/api/ipsr/ipsr.repository';
import { Observable } from 'rxjs';
import { IpsrCompletenessStatusService } from '../../../pages/ipsr/services/ipsr-completeness-status.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../enum/api.enum';

@Injectable({
  providedIn: 'root'
})
export class ResultsApiService {
  constructor(public http: HttpClient, private saveButtonSE: SaveButtonService, public ipsrDataControlSE: IpsrDataControlService) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  currentResultId: number | string = null;
  currentResultCode: number | string = null;
  currentResultPhase: number | string = null;
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
        resp.response.map(result => {
          result.id = Number(result.id);
          result.result_code = Number(result.result_code);
          result.full_name = `${result.create_last_name} ${result.create_first_name}`;
        });
        return resp;
      })
    );
  }
  PATCH_DeleteResult(resultIdToDelete: string | number) {
    return this.http.patch<any>(`${this.apiBaseUrl}delete/${resultIdToDelete}`, null);
  }

  GET_FindResultsElastic(search?: string, type?: string) {
    const body = {
      size: 20,
      query: {
        bool: {
          must: [
            {
              match_bool_prefix: {
                title: {
                  query: search ?? '',
                  operator: 'and'
                }
              }
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        {
                          match: {
                            type: type ?? ''
                          }
                        },
                        {
                          match: {
                            is_legacy: true
                          }
                        }
                      ]
                    }
                  },
                  {
                    bool: {
                      must: [
                        {
                          match: {
                            is_legacy: false
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      sort: [
        {
          'id.keyword': {
            order: 'asc'
          }
        }
      ]
    };
    const options = { headers: new HttpHeaders({ Authorization: this.elasicCredentials }) };
    return this.http.post<ElasticResult>(`${environment.elastic.baseUrl}`, body, options).pipe(
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

  GET_allChildlessInstitutionTypes() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions-type/childless`);
  }

  GET_allInstitutions() {
    return this.http.get<any>(`${this.apiBaseUrl}get/institutions/all`).pipe(
      map(resp => {
        resp.response.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym || ''}</strong> ${institution?.institutions_acronym ? ' - ' : ''} ${institution?.institutions_name} - ${institution?.headquarter_name}`));
        return resp;
      })
    );
  }

  GET_generalInformationByResultId() {
    return this.http.get<any>(`${this.apiBaseUrl}get/general-information/result/${this.currentResultId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
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

  GET_ostMeliaStudiesByResultId() {
    return this.http.get<any>(`${this.apiBaseUrl}melia-studies/get/all/result/${this.currentResultId}`);
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
            //(resp?.user_matched_institution?.deliveries);
            if (!resp?.user_matched_institution?.deliveries?.length) resp.user_matched_institution.deliveries = [3];
          });
        }
        return resp;
      }),
      this.saveButtonSE.isGettingSectionPipe()
    );
  }

  GET_AllPrmsGeographicScope() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/geographic-scope/get/all/prms`);
  }

  GET_ClarisaQaToken(offcial_code) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/clarisa/qa/token/${offcial_code}`);
  }

  GET_AllCLARISARegions() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/regions/get/all`);
  }

  POST_partnerRequest(body: PartnersRequestBody) {
    //(`${environment.apiBaseUrl}api/clarisa/partner-request/${this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.resultInnovationId : this.currentResultId}`);
    return this.http.post<any>(`${environment.apiBaseUrl}api/clarisa/partner-request/${this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.resultInnovationId : this.currentResultId}`, body);
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
        //(resp);
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
        //(resp.response);
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

  GET_resultsLinked(isIpsr: boolean) {
    return this.http.get<any>(`${this.apiBaseUrl}linked/get/${isIpsr ? this.ipsrDataControlSE.resultInnovationId : this.currentResultId}`);
  }

  POST_resultsLinked(body: LinksToResultsBody, isIpsr: boolean) {
    return this.http.post<any>(`${this.apiBaseUrl}linked/create/${isIpsr ? this.ipsrDataControlSE.resultInnovationId : this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_evidences() {
    return this.http.get<any>(`${this.apiBaseUrl}evidences/get/${this.currentResultId}`);
  }

  POST_evidences(body: EvidencesBody) {
    return this.http.post<any>(`${this.apiBaseUrl}evidences/create/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  POST_toc(body: TheoryOfChangeBody) {
    console.log(body);

    return this.http.post<any>(`${this.apiBaseUrl}toc/create/toc/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_mqapValidation(handle) {
    return this.http.get<any>(`${this.apiBaseUrl}results-knowledge-products/mqap?handle=${handle}`);
  }

  GET_resultknowledgeProducts() {
    return this.http.get<any>(`${this.apiBaseUrl}results-knowledge-products/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCH_resyncKnowledgeProducts() {
    return this.http.patch<any>(`${this.apiBaseUrl}results-knowledge-products/resync/${this.currentResultId}`, null).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  POST_createWithHandle(body) {
    return this.http.post<any>(`${this.apiBaseUrl}results-knowledge-products/create`, body).pipe(this.saveButtonSE.isCreatingPipe());
  }

  GET_toc() {
    return this.http.get<any>(`${this.apiBaseUrl}toc/get/result/${this.currentResultId}`).pipe(
      map(resp => {
        //(resp.response);
        resp?.response?.contributing_initiatives.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name || ''}</strong> - ${initiative?.initiative_name}`));
        return resp;
      }),
      this.saveButtonSE.isGettingSectionPipe()
    );
  }

  Get_indicator(id_toc, init) {
    return this.http.get<any>(`${this.apiBaseUrl}toc/get/indicator/${id_toc}/result/${this.currentResultId}/initiative/${init}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCH_innovationUse(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/innovation-use/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_innovationUse() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/innovation-use/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCH_capacityDevelopent(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/capacity-developent/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_capacityDevelopent() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/capacity-developent/get/result/${this.currentResultId}`).pipe(
      this.saveButtonSE.isGettingSectionPipe(),
      map((resp: any) => {
        resp?.response?.institutions?.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym || ''}</strong> ${institution?.institutions_acronym ? ' - ' : ''} ${institution?.institutions_name}`));
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
        //(resp);
        resp?.response.map(initiative => (initiative.initiative_id = initiative?.id));
        resp?.response.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name}</strong> - ${initiative?.name}`));
        return resp;
      })
    );
  }

  GET_clarisaInnovationType() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-type/get/all`).pipe(
      map(resp => {
        resp?.response.map(innovation => (innovation.extraInformation = `<strong>${innovation.name}</strong> <br> <div class="select_item_description">${innovation.definition}</div>`));
        //(resp.response);
        return resp;
      })
    );
  }

  GET_clarisaInnovationCharacteristics() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-characteristics/get/all`).pipe(
      map(resp => {
        resp?.response.map(innovation => (innovation.extraInformation = `<strong>${innovation.name}</strong> <br> <div class="select_item_description">${innovation.definition}</div>`));
        //(resp.response);
        return resp;
      })
    );
  }

  GET_clarisaInnovationReadinessLevels() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-readiness-levels/get/all`);
  }

  PATCH_innovationDev(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/innovation-dev/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_innovationDev() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/innovation-dev/get/result/${this.currentResultId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCH_policyChanges(body) {
    return this.http.patch<any>(`${this.apiBaseUrl}summary/policy-changes/create/result/${this.currentResultId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GET_policyChanges() {
    return this.http.get<any>(`${this.apiBaseUrl}summary/policy-changes/get/result/${this.currentResultId}`).pipe(
      this.saveButtonSE.isGettingSectionPipe(),
      map((resp: any) => {
        resp?.response?.institutions?.map(institution => (institution.full_name = `(Id:${institution?.institutions_id}) <strong>${institution?.institutions_acronym || ''}</strong> ${institution?.institutions_acronym ? ' - ' : ''} ${institution?.institutions_name}`));
        return resp;
      })
    );
  }

  GET_clarisaPolicyTypes() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/policy-types/get/all`);
  }

  GET_clarisaPolicyStages() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/policy-stages/get/all`).pipe(
      map(resp => {
        //(resp.response);
        resp?.response.map(stage => (stage.full_name = `<strong>${stage.name}</strong> - ${stage.definition}`));
        return resp;
      })
    );
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

  GET_allClarisaMeliaStudyTypes() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/melia-study-type/get/all`);
  }

  POST_createRequest(body) {
    return this.http.post<any>(`${this.apiBaseUrl}request/create/${this.currentResultId}`, body);
  }

  GET_allRequest() {
    return this.http.get<any>(`${this.apiBaseUrl}request/get/all`);
  }

  GET_reportingList(initDate: string = '2022-12-01') {
    const init = new Date(initDate);
    const today = new Date();
    return this.http.get<any>(`${this.apiBaseUrl}get/reporting/list/date/${init.toISOString()}/${today.toISOString()}`);
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

  GET_greenChecksByResultId() {
    return this.http.get<any>(`${this.apiBaseUrl}results-validation/get/green-checks/${this.currentResultId}`);
  }

  PATCH_greenChecksByResultId() {
    return this.http.patch<any>(`${this.apiBaseUrl}results-validation/save/green-checks/${this.currentResultId}`, {});
  }

  PATCH_submit(comment) {
    return this.http.patch<any>(`${this.apiBaseUrl}submissions/submit/${this.currentResultId}`, { comment });
  }

  PATCH_unsubmit(comment) {
    return this.http.patch<any>(`${this.apiBaseUrl}submissions/unsubmit/${this.currentResultId}`, { comment });
  }

  POST_reportSesultsCompleteness(initiatives: any[], rol_user?) {
    return this.http.post<any>(`${this.apiBaseUrl}admin-panel/report/results/completeness`, { rol_user, initiatives }).pipe(
      map(resp => {
        //(resp.responee);
        resp?.response.map(result => {
          result.full_name = `${result.result_title} ${result.result_code} ${result.official_code} ${result.result_type_name}`;
          result.full_name_html = `<div class="completeness-${result.is_submitted == 1 ? 'submitted' : 'editing'} completeness-state">${result.is_submitted == 1 ? 'Submitted' : 'Editing'}</div> <strong>Result code: (${result.result_code})</strong> - ${result.result_title}  - <strong>Official code: (${result.official_code})</strong> - <strong>Result Type: (${result.result_type_name})</strong>`;
          result.result_code = Number(result.result_code);
          result.completeness = Number(result.completeness);
          result.general_information_value = Number(result?.general_information?.value);
          result.theory_of_change_value = Number(result?.theory_of_change.value);
          result.partners_value = Number(result?.partners.value);
          result.geographic_location_value = Number(result?.geographic_location.value);
          result.links_to_results_value = Number(result?.links_to_results.value);
          result.evidence_value = Number(result?.evidence.value);
          result.section_seven_value = Number(result?.section_seven.value);
        });
        return resp;
      })
    );
  }

  GET_historicalByResultId(resultId) {
    return this.http.get<any>(`${this.apiBaseUrl}admin-panel/report/results/${resultId}/submissions`);
  }

  GET_reportUsers() {
    return this.http.get<any>(`${this.apiBaseUrl}admin-panel/report/users`).pipe(
      map(resp => {
        //(resp.response);
        resp?.response.map(user => {
          user.full_name = `${user.user_id} ${user.user_first_name} ${user.user_last_name} ${user.user_email} ${user.initiative_name} ${user.official_code} ${user.initiative_role_name}`;
          user.init_name_official_code = `${user?.official_code ? '(' + user?.official_code + ') ' : ''}${user?.initiative_name}`;
        });
        return resp;
      })
    );
  }

  GET_resultIdToCode(resultCode, phase: any = null) {
    return this.http.get<any>(`${this.apiBaseUrl}get/transform/${resultCode}?phase=${phase}`);
  }

  POST_excelFullReport(resultCodes: any[]) {
    return this.http.post<any>(`${this.apiBaseUrl}admin-panel/report/results/excel-full-report`, { resultCodes });
  }

  GET_factSheetByInitiativeId(initiativeId) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/type-one-report/fact-sheet/initiative/${initiativeId}`);
  }

  GET_keyResultStoryInitiativeId(initiativeId) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/type-one-report/key-result-story/initiative/${initiativeId}`);
  }

  GET_excelFullReportByInitiativeId(initiativeId) {
    return this.http.get<any>(`${this.apiBaseUrl}admin-panel/report/results/excel-full-report/${initiativeId}`);
  }

  PATCH_primaryImpactAreaKrs(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/type-one-report/primary/primary-impact-area/create`, body);
  }

  GETallInnovations(initiativesList) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/ipsr/all-innovations`, initiativesList);
  }

  GETInnovationByResultId(resultId) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation/${resultId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  POSTResultInnovationPackage(body) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/create-header`, body).pipe(this.saveButtonSE.isCreatingPipe());
  }

  GETAllInnovationPackages() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/all-innovation-packages`);
  }

  PATCHIpsrGeneralInfo(body, resulId) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/general-information/${resulId}`, body).pipe(this.saveButtonSE.isCreatingPipe());
  }

  GETContributorsByIpsrResultId() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/contributors/get/${this.ipsrDataControlSE.resultInnovationId}`).pipe(
      map(resp => {
        //(resp.response);
        resp?.response?.contributing_initiatives.map(initiative => (initiative.full_name = `${initiative?.official_code} - <strong>${initiative?.short_name || ''}</strong> - ${initiative?.initiative_name}`));
        return resp;
      }),
      this.saveButtonSE.isGettingSectionPipe()
    );
  }

  PATCHContributorsByIpsrResultId(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/contributors/save/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GETInnovationPackageDetail() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-package-detail/${this.ipsrDataControlSE.resultInnovationId}`);
  }

  GETInnovationPathwayByStepOneResultId() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get-step-one/${this.ipsrDataControlSE.resultInnovationId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCHInnovationPathwayByStepOneResultId(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-one/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  PATCHInnovationPathwayByStepOneResultIdNextStep(body, descrip) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-one/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipeNextStep(descrip));
  }

  GETAllClarisaActionAreasOutcomes() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/action-areas-outcomes/all`);
  }

  GETAllClarisaSdgsTargets() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/sdgs-targets/all`);
  }

  GETAllActorsTypes() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/actors/type/all`);
  }

  GETInstitutionsTypeTree() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/institutions-type/tree`);
  }

  DELETEInnovationPackage(resultId) {
    return this.http.delete<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/${resultId}`);
  }
  GETinnovationpathwayStepTwo() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovations`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  GETInnovationPathwayStepTwoInnovationSelect() {
    console.log(this.ipsrDataControlSE.resultInnovationId);

    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-two/${this.ipsrDataControlSE.resultInnovationId}`);
  }

  GETAllInnovationPackagingExpertsExpertises() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-packaging-experts/expertises`);
  }

  getAllInnoPaActiveBackstopping() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/active-backstopping`);
  }
  getAllInnoPaConsensusInitiativeWorkPackage() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/consensus-initiative-work-package`);
  }
  getAllInnoPaRegionalIntegrated() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/regional-integrated`);
  }
  getAllInnoPaRegionalLeadership() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/regional-leadership`);
  }
  getAllInnoPaRelevantCountry() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/relevant-country`);
  }

  PATCHComplementaryInnovation(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-two/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  PATCHComplementaryInnovationPrevious(body, descrip) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-two/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipeNextStep(descrip));
  }

  GETComplementaryById(idInnovationPackages) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovation/${idInnovationPackages}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  GETComplementataryInnovationFunctions() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/complementary-innovations-functions`);
  }

  POSTNewCompletaryInnovation(body) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/complementary-innovation/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  GETInnovationPathwayByRiId() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-three/${this.ipsrDataControlSE.resultInnovationId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCHInnovationPathwayByRiId(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-three/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  PATCHInnovationPathwayByRiIdNextPrevius(body, descrip) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-three/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipeNextStep(descrip));
  }

  GETAllClarisaInnovationReadinessLevels() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-readiness-levels/get/all`);
  }

  GETAllClarisaInnovationUseLevels() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/innovation-use-levels`);
  }

  GETInnovationPathwayStepFourByRiId() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/get/step-four/${this.ipsrDataControlSE.resultInnovationId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCHInnovationPathwayStepFourByRiId(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  PATCHInnovationPathwayStepFourByRiIdPrevious(body, descrip) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/${this.ipsrDataControlSE.resultInnovationId}`, body).pipe(this.saveButtonSE.isSavingPipeNextStep(descrip));
  }

  GETAllResultsInnovationPackageUnitTime() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-package/unit-time`);
  }

  PATCHInnovationPathwayStep4Partners(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/partners/${this.ipsrDataControlSE.resultInnovationId}`, body);
  }

  PATCHInnovationPathwayStep4BilateralsnonPooledProjects(idNonPoolen, body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/non-pooled-projects/${idNonPoolen}`, body);
  }

  PATCHInnovationPathwayStep4Bilaterals(body) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/save/step-four/bilaterals/${this.ipsrDataControlSE.resultInnovationId}`, body);
  }

  getCompletenessStatus(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-validation-module/get/green-checks/${this.ipsrDataControlSE.resultInnovationId}`);
  }

  getSubNationalLevelOne(isoAlpha) {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/first-order-administrative-division/iso-alpha-2/${isoAlpha}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  getSubNationalLevelTwo(isoAlpha, adminCode) {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/second-order-administrative-division/iso-alpha-2/${isoAlpha}/admin-code-1/${adminCode}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PATCHsubmissionsSubmitIpsr(comment) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/submissions/submit-ipsr/${this.ipsrDataControlSE.resultInnovationId}`, { comment });
  }

  PATCHSubmissionsUnsubmitIpsr(comment) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/submissions/unsubmit-ipsr/${this.ipsrDataControlSE.resultInnovationId}`, { comment });
  }

  getStepTwoComentariesInnovation() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  PostStepTwoComentariesInnovation(body) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/createInnovationEnablers`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  PostStepTwoComentariesInnovationPrevius(body, descrip) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/createInnovationEnablers`, body).pipe(this.saveButtonSE.isSavingPipeNextStep(descrip));
  }

  getStepTwoComentariesInnovationId() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/results-innovation-packages-enabler-type/${this.ipsrDataControlSE.resultInnovationId}`).pipe(this.saveButtonSE.isGettingSectionPipe());
  }

  getAssessedDuringExpertWorkshop() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/ipsr/assessed-during-expert-workshop`);
  }

  PATCHcomplementaryinnovation(body, idResult) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/updated/complementary-innovation/${idResult}`, body).pipe(this.saveButtonSE.isSavingPipe());
  }

  DELETEcomplementaryinnovation(idResult) {
    return this.http.delete<any>(`${environment.apiBaseUrl}api/ipsr/innovation-pathway/delete/complementary-innovation/${idResult}`);
  }

  GET_versioning(status, modules) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/versioning?status=${status}&module=${modules}`).pipe(
      map(resp => {
        resp?.response.map(phase => (phase.phase_name_status = `${phase.phase_name} - (${phase.status ? 'Open' : 'Closed'})`));
        return resp;
      })
    );
  }

  PATCH_versioningProcess(id) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/versioning/phase-change/process/result/${id}`, null);
  }

  PATCH_updatePhase(id, phase) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/versioning/${id}`, phase);
  }

  DELETE_updatePhase(id) {
    return this.http.delete<any>(`${environment.apiBaseUrl}api/versioning/${id}`);
  }

  POST_createPhase(phase) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/versioning`, phase);
  }

  GET_tocPhases() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/toc-phases`);
  }

  GET_resultYears() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/years`);
  }

  GET_questionsInnovationDevelopment() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/questions/innovation-development/${this.currentResultId}`);
  }

  GET_investmentDiscontinuedOptions() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/investment-discontinued-options`);
  }

  GET_versioningResult() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/versioning/result/${this.ipsrDataControlSE.inIpsr ? this.ipsrDataControlSE.resultInnovationId : this.currentResultId}`);
  }

  PATCH_versioningAnnually() {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/versioning/execute/annual/replicate`, {});
  }

  GET_numberOfResultsByResultType(statusId, resultTypeId) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/versioning/number/results/status/${statusId}/result-type/${resultTypeId}`);
  }
}
