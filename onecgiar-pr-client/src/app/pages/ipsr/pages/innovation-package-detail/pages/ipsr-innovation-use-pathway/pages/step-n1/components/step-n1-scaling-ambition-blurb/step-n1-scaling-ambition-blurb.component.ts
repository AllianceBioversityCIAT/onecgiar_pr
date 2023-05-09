import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-scaling-ambition-blurb',
  templateUrl: './step-n1-scaling-ambition-blurb.component.html',
  styleUrls: ['./step-n1-scaling-ambition-blurb.component.scss']
})
export class StepN1ScalingAmbitionBlurbComponent implements OnInit {
  @Input() body = new IpsrStep1Body();
  constructor() {}

  ngOnInit(): void {}
}
