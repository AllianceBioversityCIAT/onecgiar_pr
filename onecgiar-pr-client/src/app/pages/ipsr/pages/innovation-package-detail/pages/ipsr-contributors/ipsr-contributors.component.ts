import { Component, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';

@Component({
  selector: 'app-ipsr-contributors',
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss']
})
export class IpsrContributorsComponent implements OnInit {
  contributorsBody = new ContributorsBody();

  constructor(public api: ApiService, public rolesSE: RolesService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
  }

  getSectionInformation() {
    this.api.resultsSE.GETContributorsByIpsrResultId().subscribe(({ response }) => {
      this.contributorsBody = response;
      this.contributorsBody.contributors_result_toc_result.forEach(item => (item.planned_result = Boolean(item.planned_result)));
      this.contributorsBody.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));
    });
  }

  onSaveSection() {
    this.api.resultsSE.PATCHContributorsByIpsrResultId(this.contributorsBody).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
    this.api.dataControlSE.findClassTenSeconds('alert-event-2').then(resp => {
      try {
        document.querySelector('.alert-event-2').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
}
