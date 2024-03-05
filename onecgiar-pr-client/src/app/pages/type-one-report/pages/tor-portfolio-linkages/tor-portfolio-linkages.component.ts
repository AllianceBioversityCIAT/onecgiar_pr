import { Component } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tor-portfolio-linkages',
  standalone: true,
  templateUrl: './tor-portfolio-linkages.component.html',
  styleUrls: ['./tor-portfolio-linkages.component.scss'],
  imports: [CommonModule]
})
export class TorPortfolioLinkagesComponent {
  constructor(public typeOneReportSE: TypeOneReportService) {
    this.typeOneReportSE.currentBiPage = 5;
    this.typeOneReportSE.sanitizeUrl();
  }
  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }
}
