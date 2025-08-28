import { Component, OnDestroy } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
    selector: 'app-tor-portfolio-linkages',
    templateUrl: './tor-portfolio-linkages.component.html',
    styleUrls: ['./tor-portfolio-linkages.component.scss'],
    standalone: false
})
export class TorPortfolioLinkagesComponent implements OnDestroy {
  constructor(public typeOneReportSE: TypeOneReportService) {
    this.typeOneReportSE.currentBiPage = 5;
    this.typeOneReportSE.sanitizeUrl();
  }
  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }
}
