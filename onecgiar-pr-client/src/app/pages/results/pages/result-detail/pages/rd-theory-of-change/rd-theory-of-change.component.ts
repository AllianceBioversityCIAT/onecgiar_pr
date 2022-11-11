import { Component } from '@angular/core';
import { TheoryOfChangeBody, donorInterfaceToc } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-rd-theory-of-change',
  templateUrl: './rd-theory-of-change.component.html',
  styleUrls: ['./rd-theory-of-change.component.scss']
})
export class RdTheoryOfChangeComponent {
  theoryOfChangeBody = new TheoryOfChangeBody();
  contributingInitiativesList = [];
  constructor(private api: ApiService, public resultLevelSE: ResultLevelService, public centersSE: CentersService, public institutionsSE: InstitutionsService) {}
  ngOnInit(): void {
    this.requestEvent();
    this.getSectionInformation();
    this.GET_AllWithoutResults();
  }
  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllWithoutResults().subscribe(({ response }) => {
      // console.log(response);
      this.contributingInitiativesList = response;
    });
  }
  getSectionInformation() {
    this.api.resultsSE.GET_toc().subscribe(
      ({ response }) => {
        console.log(response);
        this.theoryOfChangeBody = response;
      },
      err => {
        console.log(err);
      }
    );
  }
  onSaveSection() {
    console.log(this.theoryOfChangeBody);
    this.api.resultsSE.POST_toc(this.theoryOfChangeBody).subscribe(resp => {
      console.log(resp);
    });
  }
  addBilateralContribution() {
    this.theoryOfChangeBody.contributing_np_projects.push(new donorInterfaceToc());
    console.log(this.theoryOfChangeBody.contributing_np_projects);
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
    this.theoryOfChangeBody.contributing_center.map(center => (center.primary = false));
    center.primary = true;
  }
  // TODO Add first selection as primaty
}
