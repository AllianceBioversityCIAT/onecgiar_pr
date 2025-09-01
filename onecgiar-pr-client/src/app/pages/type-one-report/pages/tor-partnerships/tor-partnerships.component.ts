import { Component, OnDestroy } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
    selector: 'app-tor-partnerships',
    templateUrl: './tor-partnerships.component.html',
    styleUrls: ['./tor-partnerships.component.scss'],
    standalone: false
})
export class TorPartnershipsComponent implements OnDestroy {
  constructor(public typeOneReportSE: TypeOneReportService) {
    this.typeOneReportSE.currentBiPage = 4;
    this.typeOneReportSE.sanitizeUrl();
  }

  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }
}
