import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-result-framework-reporting',
  templateUrl: './result-framework-reporting.component.html',
  standalone: false
})
export class ResultFrameworkReportingComponent implements OnInit {
  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results Framework & Reporting');
    this.router.navigate(['/result']);
  }
}
