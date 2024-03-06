import { Component, OnInit, Input } from '@angular/core';
import { ContributorsBody } from '../../model/contributorsBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TocInitiativeOutComponent } from '../../../../../../../results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ipsr-contributors-toc',
  standalone: true,
  templateUrl: './ipsr-contributors-toc.component.html',
  styleUrls: ['./ipsr-contributors-toc.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    TocInitiativeOutComponent,
    PrMultiSelectComponent
  ]
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
    return this.contributingInitiativesList.filter(
      init => init.id != this.contributorsBody.result_toc_result.initiative_id
    );
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }
}
