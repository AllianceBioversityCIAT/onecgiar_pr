import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep3Body } from '../../model/Ipsr-step-3-body.model';

@Component({
  selector: 'app-step-n3-complementary-innovations',
  templateUrl: './step-n3-complementary-innovations.component.html',
  styleUrls: ['./step-n3-complementary-innovations.component.scss']
})
export class StepN3ComplementaryInnovationsComponent {
  @Input() rangesOptions: any[] = [];
  @Input() innovationUseList: any[] = [];
  @Input() body = new IpsrStep3Body();
  open = false;

  constructor() {}

  ngOnInit(): void {
    this.body.result_ip_result_complementary[0].open = false;
  }

  toggleCollapseItem(e, bodyItem) {
    bodyItem.open = e;
  }

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels`;
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`;
  }

  allFieldsRequired(bodyItem) {
    const attrListTovalidate = ['readiness_level_evidence_based', 'readinees_evidence_link', 'use_level_evidence_based', 'use_evidence_link'];
    let oneEmpty = false;
    attrListTovalidate.forEach((attr: any) => {
      if (bodyItem[attr] === null || bodyItem[attr] === undefined || bodyItem[attr] === '') oneEmpty = true;
    });
    // console.log(oneEmpty);
    return !oneEmpty;
  }
}
