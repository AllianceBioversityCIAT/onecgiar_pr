import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { environment } from '../../../../../../../environments/environment';
import { IpsrDataControlService } from '../../../../../ipsr/services/ipsr-data-control.service';

@Component({
  selector: 'app-pdf-actions',
  templateUrl: './pdf-actions.component.html',
  styleUrls: ['./pdf-actions.component.scss'],
  providers: [MessageService]
})
export class PdfActionsComponent {
  @Output() copyEvent = new EventEmitter();
  @Input() horizontal?: boolean = false;

  constructor(private api: ResultsApiService, public ipsrDataControlSE: IpsrDataControlService) {}

  copyLink() {
    this.copyEvent.emit();
  }

  get link() {
    if (this.ipsrDataControlSE.inIpsr) {
      return `${environment.frontBaseUrl}reports/result-details/${this.ipsrDataControlSE.resultInnovationCode}/ipsr?phase=${this.ipsrDataControlSE.resultInnovationPhase}`;
    }

    return `${environment.frontBaseUrl}reports/result-details/${this.api.currentResultCode}/result?phase=${this.api.currentResultPhase}`;
  }
}
