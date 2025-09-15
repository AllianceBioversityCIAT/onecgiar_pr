import { Component, OnInit, Input } from '@angular/core';
import { ContributorsBody } from '../../model/contributorsBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-ipsr-contributors-toc',
  templateUrl: './ipsr-contributors-toc.component.html',
  styleUrls: ['./ipsr-contributors-toc.component.scss'],
  standalone: false
})
export class IpsrContributorsTocComponent implements OnInit {
  @Input() contributorsBody = new ContributorsBody();
  @Input() disabledOptions = [];
  contributingInitiativesList = [];

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

  ngOnInit(): void {
    this.GET_AllWithoutResults();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GETInnovationPackageDetail().subscribe(({ response }) => {
      this.api.resultsSE.GET_AllWithoutResults(response.portfolio).subscribe(({ response }) => {
        this.contributingInitiativesList = response;
      });
    });
  }

  get getcontributingInitiativesList() {
    return this.contributingInitiativesList.filter(init => init.id != this.contributorsBody.result_toc_result.initiative_id);
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContribuiting(index) {
    this.contributorsBody.contributingInitiativeNew.splice(index, 1);
  }
}
