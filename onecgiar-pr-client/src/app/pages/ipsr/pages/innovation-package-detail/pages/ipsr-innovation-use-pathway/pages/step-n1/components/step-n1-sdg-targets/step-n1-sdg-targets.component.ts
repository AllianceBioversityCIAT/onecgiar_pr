import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-sdg-targets',
  templateUrl: './step-n1-sdg-targets.component.html',
  styleUrls: ['./step-n1-sdg-targets.component.scss']
})
export class StepN1SdgTargetsComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
