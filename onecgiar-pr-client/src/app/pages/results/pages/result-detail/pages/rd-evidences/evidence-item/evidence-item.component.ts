import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss']
})
export class EvidenceItemComponent {
  @Input() evidence: EvidencesCreateInterface;
  @Input() index: number;
  @Input() isSuppInfo: boolean;
  @Output() deleteEvent = new EventEmitter();
  constructor(public dataControlSE: DataControlService) {}
}
