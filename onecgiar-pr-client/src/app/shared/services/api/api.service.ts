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
    forkJoin([this.authSE.GET_allRolesByUser(), this.authSE.GET_initiativesByUser()]).subscribe(
      resp => {
        const [GET_allRolesByUser, GET_initiativesByUser] = resp;
        //? Update role list
        // this.rolesSE.roles = GET_allRolesByUser.response;
        //?
        this.dataControlSE.myInitiativesList = GET_initiativesByUser?.response;
        this.dataControlSE.myInitiativesLoaded = true;
        this.qaSE.$qaFirstInitObserver?.next();
        this.dataControlSE.myInitiativesList.map(myInit => {
          myInit.role = GET_allRolesByUser?.response?.initiative?.find(initRole => initRole?.initiative_id == myInit?.initiative_id)?.description;
          myInit.name = myInit.official_code;
          myInit.official_code_short_name = myInit.official_code + ' ' + myInit.short_name;
        });
        this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        callback();
      },
      err => {
        this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList);
        this.dataControlSE.myInitiativesLoaded = true;
      }
    );
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

  updateResultsList() {
    this.resultsListSE.showLoadingResultSpinner = true;
    this.resultsSE.GET_AllResultsWithUseRole(this.authSE.localStorageUser.id).subscribe({
      next: resp => {
        this.dataControlSE.resultsList = resp.response;
        this.resultsListSE.showLoadingResultSpinner = false;

        this.dataControlSE.resultsList.forEach((result: any) => {
          result.full_status_name_html = `<div>${result.status_name} ${result.inQA ? '<div class="in-qa-tag">In QA</div>' : ''}</div>`;
        });
      },
      error: err => {
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
        ({
          name: this.authSE.localStorageUser.user_name,
          email: this.authSE.localStorageUser.email
        });
        window['Tawk_API'].setAttributes(
          {
            name: this.authSE.localStorageUser.user_name,
            email: this.authSE.localStorageUser.email
          },
          err => {}
        );
      };

      window['Tawk_API'].onChatEnded = function () {
        window['Tawk_API'].hideWidget();
        window['Tawk_API'].minimize();
        //('ENDING CHAT');
      };
    } catch (error) {
      //(error);
    }
  }
  setTitle(title) {
    this.titleService.setTitle(title);
  }
}
