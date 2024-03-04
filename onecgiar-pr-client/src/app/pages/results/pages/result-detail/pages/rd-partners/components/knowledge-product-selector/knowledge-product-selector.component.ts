import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { RdPartnersService } from '../../rd-partners.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { CommonModule } from '@angular/common';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-knowledge-product-selector',
  standalone: true,
  templateUrl: './knowledge-product-selector.component.html',
  styleUrls: ['./knowledge-product-selector.component.scss'],
  imports: [CommonModule, FormsModule, AlertStatusComponent, PrSelectComponent]
})
export class KnowledgeProductSelectorComponent {
  authorAffiliationsList: any[] = [{ part: { code: 5 } }];

  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  alertStatusMessage: string = `Partner organizations you collaborated with or are currently collaborating with to generate this result. <li>Please note that CGIAR Centers are not listed here. They are directly linked to <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li>`;

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rdPartnersSE: RdPartnersService,
    public rolesSE: RolesService
  ) {}

  institutions_institutions_type_name(partner) {
    //('institutions_institutions_type_name');
    const insts = this.institutionsSE.institutionsList;
    const institutionFinded = insts.find(
      institution =>
        institution.institutions_id ==
        partner.user_matched_institution.institutions_id
    );
    partner.user_matched_institution.institutions_type_name =
      institutionFinded?.institutions_type_name;
  }
}
