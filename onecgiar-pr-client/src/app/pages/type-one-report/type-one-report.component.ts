/* eslint-disable camelcase */
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';
import { Router } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { PhasesService } from '../../shared/services/global/phases.service';
import { TypePneReportRouting } from '../../shared/routing/routing-data';
import { GlobalVariablesService } from '../../shared/services/global-variables.service';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent implements OnInit {
  sections: any = [];
  phaseNameLoaded = '';

  constructor(public api: ApiService, public typeOneReportSE: TypeOneReportService, private rolesSE: RolesService, public router: Router, public phasesSE: PhasesService, public globalVariablesSE: GlobalVariablesService) {}

  ngOnInit(): void {
    TypePneReportRouting.forEach((section: any, index) => (section.prName ? this.sections.push({ ...section, name: `Section ${index + 1}: ${section.prName}` }) : null));

    this.api.rolesSE.validateReadOnly();
    this.api.dataControlSE.detailSectionTitle('Type one report');
    this.GET_AllInitiatives();
    this.getThePhases();
  }

  getThePhases() {
    const autoSelectOpenPhases = (phases: any[]) => {
      let openPhase = phases.find((phase: any) => phase.status) || phases.find((phase: any) => phase.id == this.globalVariablesSE.get.t1r_default_phase);
      this.typeOneReportSE.phaseSelected = openPhase?.id;
      this.typeOneReportSE.phaseDefaultId = openPhase?.id;
      this.phaseNameLoaded = openPhase?.phase_name_status;
    };

    const useLoadedPhases = () => {
      autoSelectOpenPhases(this.phasesSE.phases.reporting);
      this.typeOneReportSE.reportingPhases = this.phasesSE.phases.reporting;
    };

    const listenWhenPhasesAreLoaded = () => {
      this.phasesSE.getPhasesObservable().subscribe((phases: any[]) => {
        this.typeOneReportSE.reportingPhases = phases;
        autoSelectOpenPhases(this.typeOneReportSE.reportingPhases);
      });
    };

    if (this.phasesSE.phases.reporting.length) {
      useLoadedPhases();
    } else {
      listenWhenPhasesAreLoaded();
    }
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return this.selectFirstInitiative();
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.typeOneReportSE.allInitiatives = response;
      this.typeOneReportSE.initiativeSelected = this.typeOneReportSE.allInitiatives[0]?.official_code;
      this.typeOneReportSE.currentInitiativeShortName = this.getInitiativeShortName(this.typeOneReportSE.initiativeSelected);
      this.typeOneReportSE.sanitizeUrl();
    });
  }

  selectFirstInitiative() {
    this.typeOneReportSE.initiativeSelected = this.api.dataControlSE.myInitiativesList[0]?.official_code;
    this.typeOneReportSE.sanitizeUrl();
  }

  getInitiativeShortName(official_code) {
    const list = this.api.rolesSE.isAdmin ? this.typeOneReportSE.allInitiatives : this.api.dataControlSE.myInitiativesList;
    return list.find(init => init.official_code == official_code)?.short_name;
  }

  selectInitiativeEvent() {
    this.typeOneReportSE.currentInitiativeShortName = this.getInitiativeShortName(this.typeOneReportSE.initiativeSelected);
    const currentUrl = this.router.url;
    this.router.navigateByUrl(`/type-one-report/white`).then(() => {
      console.log('navigate');
      setTimeout(() => {
        this.router.navigateByUrl(currentUrl);
      }, 100);
    });
    this.typeOneReportSE.showTorIframe = false;
    setTimeout(() => {
      this.typeOneReportSE.showTorIframe = true;
    }, 200);
    this.typeOneReportSE.sanitizeUrl();
  }
}
