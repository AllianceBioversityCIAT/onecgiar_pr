import { Component, OnInit, Input } from '@angular/core';
import { resultToResultInterfaceToc, ContributorsBody } from '../../model/contributorsBody';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-ipsr-contributors-toc',
  templateUrl: './ipsr-contributors-toc.component.html',
  styleUrls: ['./ipsr-contributors-toc.component.scss']
})
export class IpsrContributorsTocComponent implements OnInit {
  @Input() contributorsBody = new ContributorsBody();
  contributingInitiativesList = [];
  constructor(public api: ApiService, public rolesSE: RolesService) {}

  ngOnInit(): void {
    this.GET_AllWithoutResults();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllWithoutResults().subscribe(({ response }) => {
      this.contributingInitiativesList = response;
    });
  }

  get getcontributingInitiativesList() {
    return this.contributingInitiativesList.filter(init => init.id != this.contributorsBody.result_toc_result.initiative_id);
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }
}
