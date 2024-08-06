import { Component, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';
import { RdTheoryOfChangesServicesService } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-changes-services.service';

@Component({
  selector: 'app-ipsr-contributors',
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss']
})
export class IpsrContributorsComponent implements OnInit {
  contributorsBody = new ContributorsBody();
  disabledOptions = [];

  constructor(public api: ApiService, public rolesSE: RolesService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
  }

  getSectionInformation() {
    this.api.resultsSE.GETContributorsByIpsrResultId().subscribe(({ response }) => {
      this.contributorsBody = response;
      this.contributorsBody.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

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

      this.disabledOptions = [
        ...(this.contributorsBody?.contributing_initiatives.accepted_contributing_initiatives || []),
        ...(this.contributorsBody?.contributing_initiatives.pending_contributing_initiatives || [])
      ];

      this.contributorsBody.contributingInitiativeNew = [];
    });
  }

  onSaveSection() {
    this.contributorsBody.result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;

    this.contributorsBody.contributors_result_toc_result = this.theoryOfChangesServices.contributors_result_toc_result;

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

    this.api.resultsSE.PATCHContributorsByIpsrResultId(sendedData).subscribe(({ response }) => {
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
