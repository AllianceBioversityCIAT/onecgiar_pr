import { Component, OnInit, inject, signal } from '@angular/core';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';
import { RdTheoryOfChangesServicesService } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { RdContributorsAndPartnersService } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ResultsCenterDto } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/models/contributorsAndPartnersBody';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';

@Component({
  selector: 'app-ipsr-contributors',
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss'],
  standalone: false
})
export class IpsrContributorsComponent implements OnInit {
  contributorsBody = new ContributorsBody();
  disabledOptions = [];
  rdPartnersSE = inject(RdContributorsAndPartnersService);
  centersSE = inject(CentersService);
  resultLevelSE = inject(ResultLevelService);
  contributingInitiativesList = [];
  fieldsManagerSE = inject(FieldsManagerService);
  innovationUseResultsSE = inject(InnovationUseResultsService);
  disabledText = 'To remove this center, please contact your librarian';
  submitter: string = '';
  result_toc_result = null;
  contributors_result_toc_result = null;
  initiativeIdSignal = signal<any>(null);
  getConsumed = signal<boolean>(false);
  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
    // only for p25
    if (this.fieldsManagerSE.isP25()) {
      this.GET_AllWithoutResults();
      this.rdPartnersSE.loadClarisaProjects();
    }
  }

  GET_AllWithoutResults() {
    const activePortfolio = this.api.dataControlSE.currentResult?.portfolio;
    this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe(({ response }) => {
      this.contributingInitiativesList = response;
    });
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContribuiting(index, isAcceptedArray: boolean) {
    if (isAcceptedArray) {
      this.rdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives.splice(index, 1);
    } else {
      this.rdPartnersSE.contributingInitiativeNew.splice(index, 1);
    }
  }

  deleteContributingCenter(index: number, updateComponent: boolean = false) {
    if (updateComponent) {
      this.rdPartnersSE.updatingLeadData = true;
    }

    const deletedCenter = this.rdPartnersSE.partnersBody?.contributing_center.splice(index, 1);
    if (deletedCenter.length === 1 && this.rdPartnersSE.leadCenterCode === deletedCenter[0].code) {
      //always should happen
      this.rdPartnersSE.leadCenterCode = null;
    }
    if (updateComponent) {
      setTimeout(() => {
        this.rdPartnersSE.updatingLeadData = false;
      }, 50);
    }
  }
  getMessageLead() {
    const entity = this.rdPartnersSE.partnersBody.is_lead_by_partner ? 'partner' : 'CG Center';
    return `Please select the ${entity} leading this result. <b>Only ${entity}s already added in this section can be selected as the result lead.</b>`;
  }

  formatResultLabel(option: any): string {
    if (option?.result_code && option?.name) {
      let phaseInfo = '';
      if (option?.acronym && option?.phase_year) {
        phaseInfo = `(${option.acronym} - ${option.phase_year}) `;
      } else if (option?.acronym) {
        phaseInfo = `(${option.acronym}) `;
      } else if (option?.phase_year) {
        phaseInfo = `(${option.phase_year}) `;
      }

      const resultType = option?.result_type_name || option?.resultTypeName || option?.type_name || '';
      const resultTypeInfo = resultType ? ` (${resultType})` : '';

      const title = option?.title ? ` - ${option.title}` : '';

      return `${phaseInfo}${option.result_code} - ${option.name}${resultTypeInfo}${title}`;
    }
    return option?.title || option?.name || '';
  }

  getTocLogic() {
    this.theoryOfChangesServices.theoryOfChangeBody = this.contributorsBody;

    if (this.contributorsBody?.result_toc_result?.result_toc_results !== null) {
      this.theoryOfChangesServices.result_toc_result = this.contributorsBody?.result_toc_result;
      this.theoryOfChangesServices.result_toc_result.planned_result =
        this.contributorsBody?.result_toc_result?.result_toc_results[0]?.planned_result ?? null;
      this.theoryOfChangesServices.result_toc_result.showMultipleWPsContent = true;
    }

    if (this.contributorsBody?.contributors_result_toc_result !== null) {
      this.theoryOfChangesServices.contributors_result_toc_result = this.contributorsBody?.contributors_result_toc_result;
      this.theoryOfChangesServices.contributors_result_toc_result.forEach((tab: any, index) => {
        tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
        tab.index = index;
        tab.showMultipleWPsContent = true;
      });
    }
  }

  getTocLogicp25(response: any) {
    //     //! TOC
    this.rdPartnersSE.partnersBody.linked_results = response.linked_results || [];
    this.rdPartnersSE.partnersBody?.contributing_and_primary_initiative.forEach(
      init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`)
    );
    this.submitter = this.rdPartnersSE.partnersBody.contributing_and_primary_initiative.find(
      init => init.id === this.rdPartnersSE.partnersBody?.result_toc_result?.initiative_id
    )?.full_name;
    if (this.rdPartnersSE.partnersBody?.impactsTarge)
      this.rdPartnersSE.partnersBody?.impactsTarge.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
    if (this.rdPartnersSE.partnersBody?.sdgTargets)
      this.rdPartnersSE.partnersBody?.sdgTargets.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
    if (this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results !== null) {
      this.result_toc_result = this.rdPartnersSE.partnersBody?.result_toc_result;
      this.result_toc_result.planned_result = this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results[0]?.planned_result ?? null;
      this.result_toc_result.showMultipleWPsContent = true;
    }
    if (this.rdPartnersSE.partnersBody?.contributors_result_toc_result !== null) {
      this.contributors_result_toc_result = this.rdPartnersSE.partnersBody?.contributors_result_toc_result;
      this.contributors_result_toc_result.forEach((tab: any, index) => {
        tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
        tab.index = index;
        tab.showMultipleWPsContent = true;
      });
    }
    this.rdPartnersSE.partnersBody.changePrimaryInit = this.rdPartnersSE.partnersBody?.result_toc_result.initiative_id;
    this.disabledOptions = [
      ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.accepted_contributing_initiatives || []),
      ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.pending_contributing_initiatives || [])
    ];
    this.initiativeIdSignal.set(this.rdPartnersSE.partnersBody?.result_toc_result?.initiative_id);
    this.getConsumed.set(true);
    // //! TOC END
    this.contributorsBody.bilateral_projects.forEach(project => {
      project.fullName = project.obj_clarisa_project.fullName;
    });
  }

  getSectionInformation() {
    this.rdPartnersSE.contributingInitiativeNew = [];
    this.api.resultsSE.GETContributorsByIpsrResultId(this.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.contributorsBody = response;
      this.rdPartnersSE.partnersBody = response;
      this.contributorsBody.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

      this.fieldsManagerSE.isP25() ? this.getTocLogicp25(response) : this.getTocLogic();

      this.disabledOptions = [
        ...(this.contributorsBody?.contributing_initiatives.accepted_contributing_initiatives || []),
        ...(this.contributorsBody?.contributing_initiatives.pending_contributing_initiatives || [])
      ];

      this.contributorsBody.contributingInitiativeNew = [];
      // ! Delete later
      this.rdPartnersSE.partnersBody.result_toc_result.planned_result = false;
    });
  }

  saveTocLogic() {
    this.contributorsBody.result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;

    this.contributorsBody.contributors_result_toc_result = this.theoryOfChangesServices.contributors_result_toc_result;
  }
  saveTocLogicp25() {}

  onSaveSection() {
    this.fieldsManagerSE.isP25() ? this.saveTocLogicp25() : this.saveTocLogic();

    const sendedData = {
      ...this.contributorsBody,
      contributing_initiatives: {
        ...this.contributorsBody.contributing_initiatives,
        pending_contributing_initiatives: [
          ...this.contributorsBody.contributing_initiatives.pending_contributing_initiatives,
          ...this.contributorsBody.contributingInitiativeNew
        ]
      },
      //? map by service
      contributing_center: this.rdPartnersSE.partnersBody.contributing_center,
      bilateral_projects: this.rdPartnersSE.partnersBody.bilateral_projects
      //?
    };

    if (this.fieldsManagerSE.isP25()) {
      sendedData.contributing_initiatives.pending_contributing_initiatives = [
        ...this.rdPartnersSE.contributingInitiativeNew,
        ...this.contributorsBody.contributing_initiatives.pending_contributing_initiatives
      ];
      sendedData.result_toc_result = this.rdPartnersSE.partnersBody.result_toc_result;
    }

    this.api.resultsSE.PATCHContributorsByIpsrResultId(sendedData, this.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.getSectionInformation();
    });
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
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document.querySelector('.alert-event-2').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }
}
