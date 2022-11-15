import { Component } from '@angular/core';
import { TheoryOfChangeBody, donorInterfaceToc, resultToResultInterfaceToc } from './model/theoryOfChangeBody';
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
  primaryText = ' - <strong>Primary</strong> ';
  getConsumed = false;
  constructor(private api: ApiService, public resultLevelSE: ResultLevelService, public centersSE: CentersService, public institutionsSE: InstitutionsService) {}
  ngOnInit(): void {
    this.requestEvent();
    this.getSectionInformation();
    this.GET_AllWithoutResults();
  }
  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllWithoutResults().subscribe(({ response }) => {
      this.contributingInitiativesList = response;
    });
  }
  getSectionInformation() {
    this.api.resultsSE.GET_toc().subscribe(
      ({ response }) => {
        this.getConsumed = true;
        this.theoryOfChangeBody = response;
        // this.theoryOfChangeBody.result_toc_result['initiative_id'] = this.theoryOfChangeBody.result_toc_result['inititiative_id'];
        console.log(this.theoryOfChangeBody);
      },
      err => {
        this.getConsumed = true;
        console.log(err);
      }
    );
  }

  onSaveSection() {
    console.log(this.theoryOfChangeBody);
    this.api.resultsSE.POST_toc(this.theoryOfChangeBody).subscribe(resp => {
      console.log(resp);
      this.getSectionInformation();
    });
  }
  onSelectContributingInitiative() {
    this.theoryOfChangeBody.contributing_initiatives?.map((resp: any) => {
      // console.log(resp);
      console.log(this.theoryOfChangeBody.contributors_result_toc_result);
      const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id == resp.id);
      // console.log(contributorFinded);
      let contributorToPush = new resultToResultInterfaceToc();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.theoryOfChangeBody.contributors_result_toc_result?.push(contributorToPush);
      console.log(contributorFinded);
    });
    // console.log(this.theoryOfChangeBody.contributing_initiatives);
    // console.log(this.theoryOfChangeBody.contributors_result_toc_result);
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

  deletContributingCenter(index) {
    console.log(index);
    this.theoryOfChangeBody?.contributing_center.splice(index, 1);
  }

  deleteEvidence(index) {
    console.log(index);
    this.theoryOfChangeBody.contributing_np_projects.splice(index, 1);
  }

  validatePrimarySelection() {
    if (this.theoryOfChangeBody.contributing_center.length === 1) this.theoryOfChangeBody.contributing_center[0].primary = true;
  }
}
