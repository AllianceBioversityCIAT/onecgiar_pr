import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent {
  sections = [
    { path: 'fact-sheet', icon: '', name: 'Fact sheet' },
    { path: 'initiative-progress-and-key-results', icon: '', name: 'Initiative progress & Key results' }
    // { path: 'ipi-external-partners', icon: '', name: 'Impact pathway integration - External partners' },
    // { path: 'ipi-cgiar-portfolio-linkages', icon: '', name: 'Impact pathway integration - CGIAR portfolio linkages' },
    // { path: 'key-result-story', icon: '', name: 'Key result story' }
  ];
  constructor(private titleService: Title, public api: ApiService, public typeOneReportSE: TypeOneReportService) {}
  ngOnInit(): void {
    this.api.rolesSE.validateReadOnly();
    this.titleService.setTitle('Type one report');
    this.GET_AllInitiatives();
  }
  onRemoveinit(option) {}

  allInitiatives = [];
  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return this.selectFirstInitiative();
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
      this.typeOneReportSE.initiativeSelected = this.allInitiatives[0]?.official_code;
      this.typeOneReportSE.sanitizeUrl();
    });
  }
  selectFirstInitiative() {
    this.typeOneReportSE.initiativeSelected = this.api.dataControlSE.myInitiativesList[0]?.official_code;
    this.typeOneReportSE.sanitizeUrl();
  }
  selectInitiativeEvent() {
    this.typeOneReportSE.showTorIframe = false;
    setTimeout(() => {
      this.typeOneReportSE.showTorIframe = true;
    }, 200);
    this.typeOneReportSE.sanitizeUrl();
  }
}
