import { Component, OnInit } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-init-progress-and-key-results',
  templateUrl: './tor-init-progress-and-key-results.component.html',
  styleUrls: ['./tor-init-progress-and-key-results.component.scss']
})
export class TorInitProgressAndKeyResultsComponent {
  full_screen = false;
  constructor(public typeOneReportSE: TypeOneReportService) {}
}
