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
  platformIsClosed = environment.platformIsClosed;
  contributingInitiativesList = [];
  constructor(public api: ApiService, public rolesSE: RolesService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.GET_AllWithoutResults();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllWithoutResults().subscribe(({ response }) => {
      this.contributingInitiativesList = response;
      console.log(response);
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GETContributorsByIpsrResultId().subscribe(({ response }) => {
      console.log(response);
      this.contributorsBody = response;
    });
  }

  onSelectContributingInitiative() {
    // console.log();
    // console.log('onSelectContributingInitiative');
    this.contributorsBody.contributing_initiatives?.map((resp: any) => {
      // console.log(resp);
      // console.log(this.contributorsBody.contributors_result_toc_result);
      const contributorFinded = this.contributorsBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id == resp.id);
      // console.log(contributorFinded);
      const contributorToPush = new resultToResultInterfaceToc();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.contributorsBody.contributors_result_toc_result?.push(contributorToPush);
      // console.log(contributorFinded);
    });
  }

  onRemoveContributingInitiative(e) {
    // console.clear();
    // console.log(e);
    const contributorFinded = this.contributorsBody.contributors_result_toc_result?.findIndex((result: any) => result?.initiative_id == e.remove.id);
    this.contributorsBody.contributors_result_toc_result.splice(contributorFinded, 1);
    // console.log(contributorFinded);
  }

  onSaveSection() {}
}
