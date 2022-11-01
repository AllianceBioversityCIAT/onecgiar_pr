import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss']
})
export class EvidenceItemComponent {
  @Input() evidence: any;
  @Input() index: any;
  constructor() {}
}
