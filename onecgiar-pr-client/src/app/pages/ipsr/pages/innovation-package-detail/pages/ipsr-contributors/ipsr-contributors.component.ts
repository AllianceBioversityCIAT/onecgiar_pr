import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody, resultToResultInterfaceToc } from './model/contributorsBody';

@Component({
  selector: 'app-ipsr-contributors',
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss']
})
export class IpsrContributorsComponent {
  contributorsBody = new ContributorsBody();

  constructor(public api: ApiService, public rolesSE: RolesService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.api.setTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
  }

  getSectionInformation() {
    this.api.resultsSE.GETContributorsByIpsrResultId().subscribe(({ response }) => {
      console.log(response);
      this.contributorsBody = response;
      this.contributorsBody.contributors_result_toc_result.map(item => (item.planned_result = Boolean(item.planned_result)));
    });
  }

  onSaveSection() {
    console.log(this.contributorsBody);
    this.api.resultsSE.PATCHContributorsByIpsrResultId(this.contributorsBody).subscribe(({ response }) => {
      console.log(response);
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
