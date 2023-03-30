import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-action-area-outcomes',
  templateUrl: './step-n1-action-area-outcomes.component.html',
  styleUrls: ['./step-n1-action-area-outcomes.component.scss']
})
export class StepN1ActionAreaOutcomesComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
