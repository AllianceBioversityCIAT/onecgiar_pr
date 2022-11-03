import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss']
})
export class EvidenceItemComponent {
  @Input() evidence: any;
  @Input() index: number;
  @Input() isSuppInfo: boolean;
  @Output() deleteEvent = new EventEmitter();
  constructor() {}
}
