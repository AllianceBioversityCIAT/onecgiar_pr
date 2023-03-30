import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-consensus-and-consultation',
  templateUrl: './step-n1-consensus-and-consultation.component.html',
  styleUrls: ['./step-n1-consensus-and-consultation.component.scss']
})
export class StepN1ConsensusAndConsultationComponent {
  @Input() body = new IpsrStep1Body();
  constructor() {}
}
