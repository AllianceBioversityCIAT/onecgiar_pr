import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-report-new-result-button',
  standalone: true,
  templateUrl: './report-new-result-button.component.html',
  styleUrls: ['./report-new-result-button.component.scss'],
  imports: [CommonModule, PrButtonComponent]
})
export class ReportNewResultButtonComponent {
  constructor(public api: ApiService) {}
}
