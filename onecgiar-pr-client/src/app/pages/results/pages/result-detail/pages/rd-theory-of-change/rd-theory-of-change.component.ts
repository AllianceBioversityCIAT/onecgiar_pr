import { Component } from '@angular/core';
import { TheoryOfChangeBody } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';

@Component({
  selector: 'app-rd-theory-of-change',
  templateUrl: './rd-theory-of-change.component.html',
  styleUrls: ['./rd-theory-of-change.component.scss']
})
export class RdTheoryOfChangeComponent {
  theoryOfChangeBody = new TheoryOfChangeBody();
  constructor(private api: ApiService, public resultLevelSE: ResultLevelService) {}
  ngOnInit(): void {
    this.requestEvent();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  addBilateralContribution() {
    this.theoryOfChangeBody.ccc.push({});
  }
  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
  addPrimary(center) {
    this.theoryOfChangeBody.ddd.map(center => (center.primary = false));
    center.primary = true;
  }
}
