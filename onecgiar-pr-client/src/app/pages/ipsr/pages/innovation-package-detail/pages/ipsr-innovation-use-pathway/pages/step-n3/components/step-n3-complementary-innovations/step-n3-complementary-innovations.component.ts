import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep3Body } from '../../model/Ipsr-step-3-body.model';

@Component({
  selector: 'app-step-n3-complementary-innovations',
  templateUrl: './step-n3-complementary-innovations.component.html',
  styleUrls: ['./step-n3-complementary-innovations.component.scss']
})
export class StepN3ComplementaryInnovationsComponent implements OnInit {
  @Input() body = new IpsrStep3Body();
  constructor() {}

  ngOnInit(): void {}

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a> to see the definition of all readiness levels`;
  }
}
