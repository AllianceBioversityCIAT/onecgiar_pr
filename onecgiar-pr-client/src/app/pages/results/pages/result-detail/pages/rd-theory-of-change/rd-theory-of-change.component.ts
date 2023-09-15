import { Component } from '@angular/core';
import { TheoryOfChangeBody, donorInterfaceToc, resultToResultInterfaceToc } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';
import { RdTheoryOfChangesServicesService } from './rd-theory-of-changes-services.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-rd-theory-of-change',
  templateUrl: './rd-theory-of-change.component.html',
  styleUrls: ['./rd-theory-of-change.component.scss']
})
export class RdTheoryOfChangeComponent {
  theoryOfChangeBody = new TheoryOfChangeBody();
  contributingInitiativesList = [];
  primaryText = ' - <strong>Primary</strong> ';
  disabledText = 'To remove this center, please contact your librarian';
  getConsumed = false;
  psub = '';
  contributingInitiativeNew = [];
  currentInitOfficialCode = null;
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public centersSE: CentersService, public institutionsSE: InstitutionsService, public greenChecksSE: GreenChecksService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}
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
    this.theoryOfChangesServices.body = [];
    await this.api.resultsSE.GET_toc().subscribe({
      next: ({ response }) => {
        this.theoryOfChangeBody = response;
        console.log(this.theoryOfChangeBody);
        setTimeout(() => {
          this.getConsumed = true;
        }, 100);
        if (this.theoryOfChangeBody?.result_toc_result) this.psub = `${this.theoryOfChangeBody?.result_toc_result.official_code} ${this.theoryOfChangeBody?.result_toc_result.short_name}`;
        this.theoryOfChangeBody?.contributing_and_primary_initiative.forEach(init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`));
        this.currentInitOfficialCode = this.theoryOfChangeBody.result_toc_result.official_code;
        // this.theoryOfChangeBody.result_toc_result;
        this.theoryOfChangeBody.impactsTarge.map(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
        this.theoryOfChangeBody.sdgTargets.map(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
      },
      error: err => {
        this.getConsumed = true;
        console.error(err);
      }
    });
  }

  get disabledCenters() {
    return this.theoryOfChangeBody.contributing_center.filter(center => center.from_cgspace);
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
    this.theoryOfChangeBody.bodyNewTheoryOfChanges = this.theoryOfChangesServices.body;
    this.theoryOfChangeBody.bodyActionArea = this.theoryOfChangesServices.resultActionArea;

    const initiativesAux = this.theoryOfChangeBody.contributing_and_primary_initiative.concat(this.contributingInitiativeNew);
    this.theoryOfChangeBody.contributing_initiatives = initiativesAux.filter(init => init.id != this.theoryOfChangeBody.result_toc_result.initiative_id);
    console.log(this.theoryOfChangeBody);
    const saveSection = () => {
      this.api.resultsSE.POST_toc(this.theoryOfChangeBody).subscribe(resp => {
        //(resp);
        this.getConsumed = false;
        // this.theoryOfChangeBody.result_toc_result.initiative_id = null;
        this.theoryOfChangesServices.body = [];
        this.currentInitOfficialCode != newInitOfficialCode ? location.reload() : this.getSectionInformation();
        this.contributingInitiativeNew = [];
      });
    };
    const newInit = this.theoryOfChangeBody.contributing_and_primary_initiative.find(init => init.id == this.theoryOfChangeBody.result_toc_result.initiative_id);
    const newInitOfficialCode = newInit?.official_code;
    if (this.currentInitOfficialCode != newInitOfficialCode)
      return this.api.alertsFe.show({ id: 'primary-submitter', title: 'Change in primary submitter', description: `The <strong>${newInitOfficialCode}</strong> will now be the primary submitter of this result and will have exclusive editing rights for all sections and submission. <strong>${this.currentInitOfficialCode}</strong> will lose editing and submission rights but will remain as a contributing Initiative in this result. <br> <br> Please ensure that the new primary submitter of this result is aware of this change.`, status: 'success', confirmText: 'Proceed' }, () => {
        saveSection();
      });

    return saveSection();
  }

  someEditable() {
    return Boolean(document.querySelector('.global-editable'));
  }
  onSelectContributingInitiative() {
    //();
    //('onSelectContributingInitiative');
    console.log(this.contributingInitiativeNew);

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

  onRemoveContribuiting(index) {
    this.contributingInitiativeNew.splice(index, 1);
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
