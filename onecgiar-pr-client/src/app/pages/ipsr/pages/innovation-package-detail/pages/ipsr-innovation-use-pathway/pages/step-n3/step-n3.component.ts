import { Component, OnInit } from '@angular/core';
import { IpsrStep3Body } from './model/Ipsr-step-3-body.model';

@Component({
  selector: 'app-step-n3',
  templateUrl: './step-n3.component.html',
  styleUrls: ['./step-n3.component.scss']
})
export class StepN3Component implements OnInit {
  ipsrStep3Body = new IpsrStep3Body();
  radioOptions = [
    { id: 1, name: 'Yes, an expert workshop was organized' },
    { id: 2, name: 'No expert workshop was organized' }
  ];
  constructor() {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {}
  onSaveSection() {}

  readinessLevelSelfAssessmentText() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a> to see the definition of all readiness levels`;
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a> to see the definition of all readiness levels`;
  }
}
