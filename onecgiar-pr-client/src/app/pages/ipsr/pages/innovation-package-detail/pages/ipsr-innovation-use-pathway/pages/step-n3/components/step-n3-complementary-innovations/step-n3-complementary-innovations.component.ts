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

  rangeLevel1Required = true;
  updateRangeLevel1(bodyItem) {
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    this.rangeLevel1Required = readiness_level_evidence_based_index != 0;
  }
  rangeLevel2Required = true;
  updateRangeLevel2(bodyItem) {
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    this.rangeLevel2Required = use_level_evidence_based_index != 0;
  }

  allFieldsRequired(bodyItem) {
    this.updateRangeLevel1(bodyItem);
    this.updateRangeLevel2(bodyItem);
    const attrListTovalidate = ['readiness_level_evidence_based', 'use_level_evidence_based'];
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    if (readiness_level_evidence_based_index != 0) attrListTovalidate.push('readinees_evidence_link');
    if (use_level_evidence_based_index != 0) attrListTovalidate.push('use_evidence_link');
    // bodyItem['required_evidence'] ?

    bodyItem.readiness_level_evidence_based;
    bodyItem.use_level_evidence_based;

    let oneEmpty = false;
    attrListTovalidate.forEach((attr: any) => {
      if (bodyItem[attr] === null || bodyItem[attr] === undefined || bodyItem[attr] === '') oneEmpty = true;
    });
    //(oneEmpty);
    return !oneEmpty;
  }
}
