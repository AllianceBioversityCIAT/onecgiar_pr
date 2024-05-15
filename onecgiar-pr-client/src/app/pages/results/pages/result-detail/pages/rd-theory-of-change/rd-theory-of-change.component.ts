import { Component, OnInit } from '@angular/core';
import { resultTocResultsInterface, TheoryOfChangeBody, donorInterfaceToc } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';
import { RdTheoryOfChangesServicesService } from './rd-theory-of-changes-services.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-rd-theory-of-change',
  templateUrl: './rd-theory-of-change.component.html',
  styleUrls: ['./rd-theory-of-change.component.scss']
})
export class RdTheoryOfChangeComponent implements OnInit {
  theoryOfChangeBody = new TheoryOfChangeBody();
  contributingInitiativesList = [];
  primaryText = ' - <strong>Primary</strong> ';
  disabledText = 'To remove this center, please contact your librarian';
  getConsumed = false;
  contributingInitiativeNew = [];
  cgspaceDisabledList: any = [];
  contributingCenterOptions = [];

  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public centersSE: CentersService, public institutionsSE: InstitutionsService, public greenChecksSE: GreenChecksService, public theoryOfChangesServices: RdTheoryOfChangesServicesService, public dataControlSE: DataControlService) {}

  ngOnInit(): void {
    this.requestEvent();
    this.getSectionInformation();
    this.GET_AllWithoutResults();
    this.getContributingCenterOptions();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllWithoutResults().subscribe(({ response }) => {
      this.contributingInitiativesList = response;
    });
  }

  disabledCenters() {
    this.cgspaceDisabledList = this.theoryOfChangeBody.contributing_center.filter(center => center.from_cgspace);
  }

  async getContributingCenterOptions() {
    this.contributingCenterOptions = await this.centersSE.getData();
  }

  async getSectionInformation() {
    this.theoryOfChangesServices.body = [];
    this.api.resultsSE.GET_toc().subscribe({
      next: ({ response }) => {
        this.theoryOfChangeBody = response;

        this.theoryOfChangeBody?.contributing_and_primary_initiative.forEach(init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`));

        if (this.theoryOfChangeBody?.impactsTarge) this.theoryOfChangeBody?.impactsTarge.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
        if (this.theoryOfChangeBody?.sdgTargets) this.theoryOfChangeBody?.sdgTargets.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));

        this.theoryOfChangesServices.theoryOfChangeBody = this.theoryOfChangeBody;

        if (this.theoryOfChangeBody?.result_toc_result?.result_toc_results !== null) {
          this.theoryOfChangesServices.result_toc_result = this.theoryOfChangeBody?.result_toc_result;
          this.theoryOfChangesServices.result_toc_result.planned_result = this.theoryOfChangeBody?.result_toc_result?.result_toc_results[0].planned_result ?? null;
          this.theoryOfChangesServices.result_toc_result.showMultipleWPsContent = true;
        }

        if (this.theoryOfChangeBody?.contributors_result_toc_result !== null) {
          this.theoryOfChangesServices.contributors_result_toc_result = this.theoryOfChangeBody?.contributors_result_toc_result;
          this.theoryOfChangesServices.contributors_result_toc_result.forEach((tab: any, index) => {
            tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
            tab.index = index;
            tab.showMultipleWPsContent = true;
          });
        }

        this.theoryOfChangeBody.changePrimaryInit = this.theoryOfChangeBody?.result_toc_result.initiative_id;

        this.disabledCenters();

        setTimeout(() => {
          this.getConsumed = true;
        }, 50);
      },
      error: err => {
        this.getConsumed = true;
        console.error(err);
      }
    });
  }

  get validateGranTitle() {
    for (const iterator of this.theoryOfChangeBody.contributing_np_projects) {
      const evidencesFinded = this.theoryOfChangeBody.contributing_np_projects.filter(evidence => evidence.grant_title == iterator.grant_title);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    return !!this.theoryOfChangeBody.contributing_np_projects.find(evidence => !evidence.grant_title);
  }

  onSaveSection() {
    this.theoryOfChangeBody.bodyActionArea = this.theoryOfChangesServices.resultActionArea;
    this.theoryOfChangeBody.contributing_initiatives = [...this.theoryOfChangeBody.contributing_initiatives, ...this.contributingInitiativeNew];
    this.theoryOfChangeBody.result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;
    this.theoryOfChangeBody.contributors_result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.contributors_result_toc_result;

    this.theoryOfChangeBody.result_toc_result.result_toc_results = this.theoryOfChangeBody.result_toc_result.result_toc_results.length === 1 ? this.theoryOfChangeBody.result_toc_result.result_toc_results : this.theoryOfChangeBody?.result_toc_result?.result_toc_results.filter(result => result.toc_result_id !== null);

    const saveSection = () => {
      this.api.resultsSE.POST_toc(this.theoryOfChangeBody).subscribe(resp => {
        this.getConsumed = false;
        this.theoryOfChangeBody?.result_toc_result?.initiative_id !== this.theoryOfChangeBody.changePrimaryInit ? location.reload() : this.getSectionInformation();
        this.contributingInitiativeNew = [];
      });
    };

    const newInit = this.theoryOfChangeBody.contributing_and_primary_initiative.find(init => init.id === this.theoryOfChangeBody?.changePrimaryInit);
    const newInitOfficialCode = newInit?.official_code;

    if (this.theoryOfChangeBody?.result_toc_result?.official_code !== newInitOfficialCode)
      return this.api.alertsFe.show({ id: 'primary-submitter', title: 'Change in primary submitter', description: `The <strong>${newInitOfficialCode}</strong> will now be the primary submitter of this result and will have exclusive editing rights for all sections and submission. <strong>${this.theoryOfChangeBody?.result_toc_result?.official_code}</strong> will lose editing and submission rights but will remain as a contributing Initiative in this result. <br> <br> Please ensure that the new primary submitter of this result is aware of this change.`, status: 'success', confirmText: 'Proceed' }, () => {
        saveSection();
      });

    return saveSection();
  }

  someEditable() {
    return Boolean(document.querySelector('.global-editable'));
  }

  onSelectContributingInitiative() {
    this.theoryOfChangeBody?.contributing_initiatives.forEach((resp: any) => {
      const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id === resp.id);
      const contributorToPush = new resultTocResultsInterface();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.theoryOfChangeBody.contributors_result_toc_result?.push(contributorToPush);
    });
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContributingInitiative(e) {
    const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.findIndex((result: any) => result?.initiative_id === e.remove.id);
    this.theoryOfChangeBody.contributors_result_toc_result.splice(contributorFinded, 1);
    this.theoryOfChangeBody.contributing_and_primary_initiative = this.theoryOfChangeBody.contributing_and_primary_initiative.filter(init => init.id !== e.remove.id);
  }

  onRemoveContribuiting(index) {
    this.contributingInitiativeNew.splice(index, 1);
  }

  addBilateralContribution() {
    this.theoryOfChangeBody.contributing_np_projects.push(new donorInterfaceToc());
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  addPrimary(center) {
    this.theoryOfChangeBody?.contributing_center.forEach(center => (center.primary = false));
    center.primary = true;
  }

  deletContributingCenter(index) {
    this.theoryOfChangeBody?.contributing_center.splice(index, 1);
  }

  deleteEvidence(index) {
    this.theoryOfChangeBody.contributing_np_projects.splice(index, 1);
  }

  validatePrimarySelection() {
    if (this.theoryOfChangeBody.contributing_center.length === 1) this.theoryOfChangeBody.contributing_center[0].primary = true;
  }
}
