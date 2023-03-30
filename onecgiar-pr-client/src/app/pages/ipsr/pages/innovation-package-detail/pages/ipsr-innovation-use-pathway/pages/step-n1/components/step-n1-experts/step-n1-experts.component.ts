import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-experts',
  templateUrl: './step-n1-experts.component.html',
  styleUrls: ['./step-n1-experts.component.scss']
})
export class StepN1ExpertsComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
