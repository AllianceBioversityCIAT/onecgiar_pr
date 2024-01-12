/* eslint-disable camelcase */
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';
import { Router } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { PhasesService } from '../../shared/services/global/phases.service';
import { TypePneReportRouting } from '../../shared/routing/routing-data';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent implements OnInit {
  sections: any = [
    // { path: 'fact-sheet', icon: '', name: 'Fact sheet', underConstruction: true },
    // { path: 'initiative-progress-and-key-results', icon: '', name: 'Initiative progress & Key results', underConstruction: true },
    // { path: 'impact-pathway-integration', icon: '', name: 'Impact pathway integration' },
    // { path: 'ipi-external-partners', icon: '', name: 'Impact pathway integration - External partners' },
    // { path: 'ipi-cgiar-portfolio-linkages', icon: '', name: 'Impact pathway integration - CGIAR portfolio linkages' },
    // { path: 'key-result-story', icon: '', name: 'Key result story', underConstruction: true }
  ];

  constructor(public api: ApiService, public typeOneReportSE: TypeOneReportService, private rolesSE: RolesService, public router: Router, public phasesSE: PhasesService) {}

  ngOnInit(): void {
    TypePneReportRouting.forEach((section: any) => (section.prName ? this.sections.push({ ...section, name: section.prName }) : null));

    this.api.rolesSE.validateReadOnly();
    this.api.dataControlSE.detailSectionTitle('Type one report');
    this.GET_AllInitiatives();
    this.getThePhases();
  }

  getThePhases() {
    const autoSelectOpenPhases = (phases: any[]) => {
      const openPhase = phases.find((phase: any) => phase.status);
      this.typeOneReportSE.phaseSelected = openPhase?.id;
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
      this.typeOneReportSE.sanitizeUrl();
    });
  }

  selectFirstInitiative() {
    this.typeOneReportSE.initiativeSelected = this.api.dataControlSE.myInitiativesList[0]?.official_code;
    this.typeOneReportSE.sanitizeUrl();
  }

  selectInitiativeEvent() {
    const currentUrl = this.router.url;
    this.router.navigateByUrl(`/type-one-report/ipi-cgiar-portfolio-linkages`).then(() => {
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
