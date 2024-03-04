import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { environment } from '../../../../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ToastModule } from 'primeng/toast';
import { PdfIconComponent } from '../../../../../../shared/icon-components/pdf-icon/pdf-icon.component';

@Component({
  selector: 'app-pdf-actions',
  standalone: true,
  templateUrl: './pdf-actions.component.html',
  styleUrls: ['./pdf-actions.component.scss'],
  providers: [MessageService],
  imports: [
    CommonModule,
    PdfIconComponent,
    TooltipModule,
    ClipboardModule,
    ToastModule
  ]
})
export class PdfActionsComponent {
  @Output() copyEvent = new EventEmitter();
  constructor(
    private messageSE: MessageService,
    private api: ResultsApiService
  ) {}
  copyLink() {
    this.copyEvent.emit();
  }

  get link() {
    return `${environment.frontBaseUrl}reports/result-details/${this.api.currentResultCode}?phase=${this.api.currentResultPhase}`;
  }
}
