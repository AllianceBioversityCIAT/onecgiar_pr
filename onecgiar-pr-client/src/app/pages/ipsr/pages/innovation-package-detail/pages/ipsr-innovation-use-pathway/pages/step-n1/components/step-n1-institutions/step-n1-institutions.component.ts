import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-institutions',
  templateUrl: './step-n1-institutions.component.html',
  styleUrls: ['./step-n1-institutions.component.scss']
})
export class StepN1InstitutionsComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
