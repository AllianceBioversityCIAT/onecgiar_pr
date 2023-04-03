import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-impact-areas',
  templateUrl: './step-n1-impact-areas.component.html',
  styleUrls: ['./step-n1-impact-areas.component.scss']
})
export class StepN1ImpactAreasComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
