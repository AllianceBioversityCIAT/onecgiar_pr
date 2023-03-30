import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-innovaton-use',
  templateUrl: './step-n1-innovaton-use.component.html',
  styleUrls: ['./step-n1-innovaton-use.component.scss']
})
export class StepN1InnovatonUseComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
