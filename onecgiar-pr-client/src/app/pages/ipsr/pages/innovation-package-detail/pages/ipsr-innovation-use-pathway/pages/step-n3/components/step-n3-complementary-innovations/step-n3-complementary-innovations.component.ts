import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep3Body } from '../../model/Ipsr-step-3-body.model';

@Component({
    selector: 'app-step-n3-complementary-innovations',
    templateUrl: './step-n3-complementary-innovations.component.html',
    styleUrls: ['./step-n3-complementary-innovations.component.scss'],
    standalone: false
})
export class StepN3ComplementaryInnovationsComponent implements OnInit {
  @Input() rangesOptions: any[] = [];
  @Input() innovationUseList: any[] = [];
  @Input() body = new IpsrStep3Body();
  open = false;
  rangeLevel1Required = true;
  rangeLevel2Required = true;

  constructor() {}

  ngOnInit(): void {
    this.body.result_ip_result_complementary[0].open = false;
  }

  toggleCollapseItem(e, bodyItem) {
    bodyItem.open = e;
  }

  readinessLevelSelfAssessmentText() {
    return `<li><a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels</li>
    <li><strong>YOUR READINESS SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>.</strong></li>`;
  }
  useLevelDelfAssessment() {
    return `<li><a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels</li>
    <li><strong>YOUR USE SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`;
  }

  updateRangeLevel1(bodyItem) {
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    this.rangeLevel1Required = readiness_level_evidence_based_index != 0;
    return this.rangeLevel1Required;
  }

  updateRangeLevel2(bodyItem) {
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    this.rangeLevel2Required = use_level_evidence_based_index != 0;
    return this.rangeLevel2Required;
  }

  allFieldsRequired(bodyItem) {
    this.updateRangeLevel1(bodyItem);
    this.updateRangeLevel2(bodyItem);
    const attrListTovalidate = ['readiness_level_evidence_based', 'use_level_evidence_based'];
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    if (readiness_level_evidence_based_index != 0) attrListTovalidate.push('readinees_evidence_link');
    if (use_level_evidence_based_index != 0) attrListTovalidate.push('use_evidence_link');
    return attrListTovalidate.every((attr: any) => bodyItem[attr]);
  }
}
