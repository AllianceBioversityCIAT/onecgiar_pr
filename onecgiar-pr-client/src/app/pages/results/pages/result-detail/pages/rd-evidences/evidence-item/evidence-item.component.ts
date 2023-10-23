import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss']
})
export class EvidenceItemComponent {
  @Input() evidence: EvidencesCreateInterface;
  @Input() index: number;
  @Input() isSuppInfo: boolean;
  @Input() isOptional: boolean = false;
  @Output() deleteEvent = new EventEmitter();

  eTExample = null;

  evidencesType = [
    { id: 1, name: 'Link' },
    { id: 2, name: 'Upload file' }
  ];

  constructor(public dataControlSE: DataControlService, public api: ApiService) {}
}
