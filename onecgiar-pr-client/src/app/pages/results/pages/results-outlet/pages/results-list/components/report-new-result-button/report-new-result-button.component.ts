import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-report-new-result-button',
  templateUrl: './report-new-result-button.component.html',
  styleUrls: ['./report-new-result-button.component.scss']
})
export class ReportNewResultButtonComponent {
  platformIsClosed = environment.platformIsClosed;
  constructor(public api: ApiService) {}
}
