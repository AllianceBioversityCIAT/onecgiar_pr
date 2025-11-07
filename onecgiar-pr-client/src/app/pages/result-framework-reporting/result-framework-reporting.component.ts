import { Component, inject, OnInit } from '@angular/core';
import { ResultFrameworkReportingHomeService } from './pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ApiService } from '../../shared/services/api/api.service';

@Component({
  selector: 'app-result-framework-reporting',
  templateUrl: './result-framework-reporting.component.html',
  standalone: false
})
export class ResultFrameworkReportingComponent implements OnInit {
  api = inject(ApiService);
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results Framework & Reporting');
    this.resultFrameworkReportingHomeService.getScienceProgramsProgress();
    this.resultFrameworkReportingHomeService.getRecentActivity();
  }
}
