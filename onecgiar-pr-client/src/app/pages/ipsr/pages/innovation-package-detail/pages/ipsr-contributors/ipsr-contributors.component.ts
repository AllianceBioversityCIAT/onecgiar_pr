import { Component, OnInit, inject } from '@angular/core';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';
import { RdTheoryOfChangesServicesService } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { RdContributorsAndPartnersService } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

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
  contributingInitiativesList = [];
  fieldsManagerSE = inject(FieldsManagerService);
  disabledText = 'To remove this center, please contact your librarian';
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

  getTocLogicp25() {}

  getSectionInformation() {
    console.log(this.fieldsManagerSE.isP25());
    this.api.resultsSE.GETContributorsByIpsrResultId(this.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.contributorsBody = response;
      this.contributorsBody.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

      this.fieldsManagerSE.isP25() ? this.getTocLogicp25() : this.getTocLogic();

      this.disabledOptions = [
        ...(this.contributorsBody?.contributing_initiatives.accepted_contributing_initiatives || []),
        ...(this.contributorsBody?.contributing_initiatives.pending_contributing_initiatives || [])
      ];

      this.contributorsBody.contributingInitiativeNew = [];
      console.log(response);
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
      }
    };

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
