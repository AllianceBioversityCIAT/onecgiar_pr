import { Component } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tor-partnerships',
  standalone: true,
  templateUrl: './tor-partnerships.component.html',
  styleUrls: ['./tor-partnerships.component.scss'],
  imports: [CommonModule]
})
export class TorPartnershipsComponent {
  constructor(public typeOneReportSE: TypeOneReportService) {
    this.typeOneReportSE.currentBiPage = 4;
    this.typeOneReportSE.sanitizeUrl();
  }

  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }
}
