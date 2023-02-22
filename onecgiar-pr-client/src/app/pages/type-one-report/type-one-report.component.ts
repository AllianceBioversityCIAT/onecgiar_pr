import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';
import { Router } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent {
  sections = [
    { path: 'fact-sheet', icon: '', name: 'Fact sheet', underConstruction: true },
    { path: 'initiative-progress-and-key-results', icon: '', name: 'Initiative progress & Key results', underConstruction: true },
    { path: 'impact-pathway-integration', icon: '', name: 'Impact pathway integration' },
    // { path: 'ipi-external-partners', icon: '', name: 'Impact pathway integration - External partners' },
    // { path: 'ipi-cgiar-portfolio-linkages', icon: '', name: 'Impact pathway integration - CGIAR portfolio linkages' },
    { path: 'key-result-story', icon: '', name: 'Key result story', underConstruction: true }
  ];
  constructor(private titleService: Title, public api: ApiService, public typeOneReportSE: TypeOneReportService, private rolesSE: RolesService, private router: Router) {}
  ngOnInit(): void {
    this.api.rolesSE.validateReadOnly();
    this.titleService.setTitle('Type one report');
    this.GET_AllInitiatives();
    // if (!this.rolesSE.isAdmin) this.router.navigate(['/result/results-outlet/results-list']);
  }
  onRemoveinit(option) {}

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
    let currentUrl = this.router.url;
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
