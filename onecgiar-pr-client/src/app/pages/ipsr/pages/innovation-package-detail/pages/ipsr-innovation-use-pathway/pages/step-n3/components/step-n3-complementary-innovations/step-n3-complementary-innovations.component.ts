import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep3Body } from '../../model/Ipsr-step-3-body.model';

@Component({
  selector: 'app-step-n3-complementary-innovations',
  templateUrl: './step-n3-complementary-innovations.component.html',
  styleUrls: ['./step-n3-complementary-innovations.component.scss']
})
export class StepN3ComplementaryInnovationsComponent implements OnInit {
  @Input() rangesOptions: any[] = [];
  @Input() body = new IpsrStep3Body();
  ci = {
    index: 0,
    previous: () => !(this.ci.index > 0) || this.ci.index--,
    next: () => !(this.ci.index < this.body.result_ip_result_complementary?.length - 1) || this.ci.index++
  };
  constructor() {}

  ngOnInit(): void {}

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels`;
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`;
  }
}
