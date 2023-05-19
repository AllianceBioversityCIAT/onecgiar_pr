import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pdf-actions',
  templateUrl: './pdf-actions.component.html',
  styleUrls: ['./pdf-actions.component.scss'],
  providers: [MessageService]
})
export class PdfActionsComponent {
  @Output() copyEvent = new EventEmitter();
  constructor(private messageSE: MessageService, private api: ResultsApiService) {}
  copyLink() {
    this.copyEvent.emit();
  }

  get link() {
    return `${environment.frontBaseUrl}/reports/result-details/${this.api.currentResultCode}?phase=1`;
  }
}
