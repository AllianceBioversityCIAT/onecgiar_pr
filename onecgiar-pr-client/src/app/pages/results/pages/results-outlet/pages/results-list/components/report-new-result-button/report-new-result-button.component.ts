import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-report-new-result-button',
  templateUrl: './report-new-result-button.component.html',
  styleUrls: ['./report-new-result-button.component.scss'],
  standalone: false
})
export class ReportNewResultButtonComponent {
  constructor(public api: ApiService) {}
}
