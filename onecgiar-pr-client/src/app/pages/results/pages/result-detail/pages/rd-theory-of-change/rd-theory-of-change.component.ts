import { Component } from '@angular/core';
import { TheoryOfChangeBody, donorInterfaceToc, resultToResultInterfaceToc } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';

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
  psub = '';
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public centersSE: CentersService, public institutionsSE: InstitutionsService, public greenChecksSE: GreenChecksService) {}
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
  async getSectionInformation() {
    await this.api.resultsSE.GET_toc().subscribe(
      ({ response }) => {
        this.theoryOfChangeBody = response;
        //(this.theoryOfChangeBody);
        setTimeout(() => {
          this.getConsumed = true;
        }, 100);
        if (this.theoryOfChangeBody?.result_toc_result) this.psub = `${this.theoryOfChangeBody?.result_toc_result.official_code} ${this.theoryOfChangeBody?.result_toc_result.short_name}`;

        // this.theoryOfChangeBody.result_toc_result;
      },
      err => {
        this.getConsumed = true;
        console.log(err);
      }
    );
  }

  get validateGranTitle() {
    //(this.theoryOfChangeBody.contributing_np_projects);
    for (const iterator of this.theoryOfChangeBody.contributing_np_projects) {
      const evidencesFinded = this.theoryOfChangeBody.contributing_np_projects.filter(evidence => evidence.grant_title == iterator.grant_title);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    return !!this.theoryOfChangeBody.contributing_np_projects.find(evidence => !evidence.grant_title);
  }

  onSaveSection() {
    //(this.theoryOfChangeBody);
    this.api.resultsSE.POST_toc(this.theoryOfChangeBody).subscribe(resp => {
      //(resp);
      this.getConsumed = false;
      this.getSectionInformation();
    });
  }

  someEditable() {
    return Boolean(document.querySelector('.global-editable'));
  }
  onSelectContributingInitiative() {
    //();
    //('onSelectContributingInitiative');
    this.theoryOfChangeBody.contributing_initiatives?.map((resp: any) => {
      //(resp);
      //(this.theoryOfChangeBody.contributors_result_toc_result);
      const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id == resp.id);
      //(contributorFinded);
      const contributorToPush = new resultToResultInterfaceToc();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.theoryOfChangeBody.contributors_result_toc_result?.push(contributorToPush);
      //(contributorFinded);
    });
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContributingInitiative(e) {
    // console.clear();
    //(e);
    const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.findIndex((result: any) => result?.initiative_id == e.remove.id);
    this.theoryOfChangeBody.contributors_result_toc_result.splice(contributorFinded, 1);
    //(contributorFinded);
  }
  addBilateralContribution() {
    this.theoryOfChangeBody.contributing_np_projects.push(new donorInterfaceToc());
    //(this.theoryOfChangeBody.contributing_np_projects);
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
    //(index);
    this.theoryOfChangeBody?.contributing_center.splice(index, 1);
  }

  deleteEvidence(index) {
    //(index);
    this.theoryOfChangeBody.contributing_np_projects.splice(index, 1);
  }

  validatePrimarySelection() {
    if (this.theoryOfChangeBody.contributing_center.length === 1) this.theoryOfChangeBody.contributing_center[0].primary = true;
  }
}
