import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';
import { CustomizedAlertsFsService } from '../customized-alerts-fs.service';
import { AuthService } from './auth.service';
import { CustomizedAlertsFeService } from '../customized-alerts-fe.service';
import { DataControlService } from '../data-control.service';
import { forkJoin } from 'rxjs';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { WordCounterService } from '../word-counter.service';
import { RolesService } from '../global/roles.service';
import { TocApiService } from './toc-api.service';
import { QualityAssuranceService } from '../../../pages/quality-assurance/quality-assurance.service';
import { Title } from '@angular/platform-browser';
import { IpsrListFilterService } from '../../../pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { GlobalVariablesService } from '../global-variables.service';
import { EndpointsService } from './endpoints/endpoints.service';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';
import { CurrentResult } from '../../interfaces/current-result.interface';

export interface SearchParams {
  limit?: number;
  page?: number;
  status_id?: string;
  portfolio_id?: string;
  result_type_id?: string;
  submitter_id?: string;
  version_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private titleService: Title,
    public endpointsSE: EndpointsService,
    public resultsListSE: ResultsListService,
    public resultsSE: ResultsApiService,
    public alertsFs: CustomizedAlertsFsService,
    private qaSE: QualityAssuranceService,
    public authSE: AuthService,
    public alertsFe: CustomizedAlertsFeService,
    public dataControlSE: DataControlService,
    public resultsListFilterSE: ResultsListFilterService,
    public wordCounterSE: WordCounterService,
    public rolesSE: RolesService,
    public tocApiSE: TocApiService,
    public ipsrListFilterService: IpsrListFilterService,
    public globalVariablesSE: GlobalVariablesService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}
  isStepTwoTwo: boolean = false;
  isStepTwoOne: boolean = false;

  updateUserData(callback) {
    if (!this.authSE?.localStorageUser?.id) return;
    forkJoin([this.authSE.GET_allRolesByUser(), this.authSE.GET_initiativesByUser(), this.authSE.GET_initiativesByUserByPortfolio()]).subscribe({
      next: resp => {
        const [GET_allRolesByUser, GET_initiativesByUser, GET_initiativesByUserByPortfolio] = resp;
        this.dataControlSE.myInitiativesList = GET_initiativesByUser?.response;
        this.dataControlSE.myInitiativesListReportingByPortfolio = GET_initiativesByUserByPortfolio?.response?.reporting;
        this.dataControlSE.myInitiativesListIPSRByPortfolio = GET_initiativesByUserByPortfolio?.response?.ipsr;
        this.dataControlSE.myInitiativesLoaded = true;
        this.qaSE.$qaFirstInitObserver?.next();
        this.dataControlSE.myInitiativesList.forEach(myInit => {
          myInit.role = GET_allRolesByUser?.response?.initiative?.find(initRole => initRole?.initiative_id == myInit?.initiative_id)?.description;
          myInit.name = myInit.official_code;
          myInit.official_code_short_name = myInit.official_code + ' ' + myInit.short_name;
        });
        this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        callback();
      },
      error: err => {
        this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.dataControlSE.myInitiativesLoaded = true;
        console.error(err);
      }
    });
  }

  GETInnovationPackageDetail() {
    this.resultsSE.GETInnovationPackageDetail().subscribe(({ response }) => {
      response.initiative_id = response?.inititiative_id;
      response.official_code = response?.initiative_official_code;
      this.rolesSE.validateReadOnly(response);
      this.dataControlSE.currentResult = response;
      const is_phase_open = response?.is_phase_open;

      switch (is_phase_open) {
        case 0:
          this.rolesSE.readOnly = !this.rolesSE.isAdmin;
          break;

        case 1:
          if (this.dataControlSE.currentResult.status_id !== '1' && !this.rolesSE.isAdmin) this.rolesSE.readOnly = true;
          if (response?.is_discontinued) this.rolesSE.readOnly = response?.is_discontinued;
          break;
      }

      this.ipsrDataControlSE.initiative_id = response?.inititiative_id;
      this.ipsrDataControlSE.resultInnovationPhase = response?.version_id;
      this.ipsrDataControlSE.detailData = response;
    });
  }

  clearAll() {
    this.dataControlSE.myInitiativesList = [];
  }

  updateResultsList(searchParams?: SearchParams) {
    this.resultsListSE.showLoadingResultSpinner = true;
    this.resultsSE.GET_AllResultsWithUseRole(this.authSE.localStorageUser.id, searchParams).subscribe({
      next: resp => {
        this.dataControlSE.resultsList = resp.response.items;
        this.dataControlSE.resultsList.forEach((result: any) => {
          result.full_status_name_html = `<div>${result.status_name} ${result.inQA ? '<div class="in-qa-tag">In QA</div>' : ''}</div>`;
        });

        this.resultsListSE.showLoadingResultSpinner = false;
      },
      error: err => {
        console.error(err);
        this.resultsListSE.showLoadingResultSpinner = false;
      }
    });
  }

  setTWKAttributes() {
    try {
      window['Tawk_API'] = window['Tawk_API'] || {};

      window['Tawk_LoadStart'] = new Date();

      // pass attributes to tawk.to on widget load
      window['Tawk_API'].onLoad = () => {
        window['Tawk_API'].setAttributes(
          {
            name: this.authSE.localStorageUser.user_name,
            email: this.authSE.localStorageUser.email
          },
          err => {
            console.error(err);
          }
        );
      };

      window['Tawk_API'].onChatEnded = function () {
        window['Tawk_API'].hideWidget();
        window['Tawk_API'].minimize();
      };
    } catch (error) {
      console.error(error);
    }
  }

  setTitle(title) {
    this.titleService.setTitle(title);
  }

  shouldShowUpdate(result: CurrentResult): boolean {
    const initiativeMap = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    const hasInitiatives = initiativeMap.length > 0;
    const isPastPhase = this.isPastReportingPhase(result);

    if (this.rolesSE.isAdmin) {
      return hasInitiatives && isPastPhase;
    }

    return this.isUserIncludedInAnyInitiative(result) && isPastPhase;
  }

  isPastReportingPhase(result: CurrentResult): boolean {
    const phaseYear = this.dataControlSE.reportingCurrentPhase?.phaseYear;
    return typeof result?.phase_year === 'number' && typeof phaseYear === 'number' && result.phase_year < phaseYear;
  }

  isUserIncludedInAnyInitiative(result: CurrentResult): boolean {
    const mapIds = this.getInitiativeIdsFromMap(result);
    const userInitiativeIds = this.getUserInitiativeIds(result);
    return mapIds.some(entityId => userInitiativeIds.includes(entityId));
  }

  getInitiativeIdsFromMap(result: CurrentResult): Array<string | number> {
    const mapArray = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    return mapArray.map((item: any) => item?.entityId).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }

  getUserInitiativeIds(result: CurrentResult): Array<string | number> {
    const userArray = Array.isArray(result?.initiative_entity_user) ? result.initiative_entity_user : [];
    return userArray.map((item: any) => item?.initiative_id).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }
}
