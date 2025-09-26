import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';

@Component({
  selector: 'app-result-framework-reporting',
  templateUrl: './result-framework-reporting.component.html',
  standalone: false
})
export class ResultFrameworkReportingComponent implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results Framework & Reporting');
  }
}
