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
  }

  getSectionInformation() {
    this.api.resultsSE.GETContributorsByIpsrResultId().subscribe(({ response }) => {
      console.log(response);
      this.contributorsBody = response;
    });
  }

  onSaveSection() {}
}
