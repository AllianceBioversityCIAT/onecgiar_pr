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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private titleService: Title, public resultsSE: ResultsApiService, public alertsFs: CustomizedAlertsFsService, private qaSE: QualityAssuranceService, public authSE: AuthService, public alertsFe: CustomizedAlertsFeService, public dataControlSE: DataControlService, public resultsListFilterSE: ResultsListFilterService, public wordCounterSE: WordCounterService, public rolesSE: RolesService, public tocApiSE: TocApiService, public ipsrListFilterService: IpsrListFilterService) {}
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
        this.dataControlSE.myInitiativesLoaded = true;
      }
    );
  }

  clearAll() {
    this.dataControlSE.myInitiativesList = [];
  }

  updateResultsList() {
    this.resultsSE.GET_AllResultsWithUseRole(this.authSE.localStorageUser.id).subscribe(resp => {
      this.dataControlSE.resultsList = resp.response;
      // //(this.dataControlSE.resultsList);
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
