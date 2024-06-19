import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { RdPartnersService } from '../../rd-partners.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-knowledge-product-selector',
  templateUrl: './knowledge-product-selector.component.html',
  styleUrls: ['./knowledge-product-selector.component.scss']
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
    const insts = this.institutionsSE.institutionsList;

    const institutionFinded = insts.find(institution => institution.institutions_id == partner.institutions_id);

    // if (institutionFinded.institutions_id !== partner.institutions_id) {
    //   partner.is_predicted = false;
    // }
    partner.obj_institutions.obj_institution_type_code.name = institutionFinded?.institutions_type_name;
    partner.obj_institutions.website_link = institutionFinded?.website_link;
  }

  generateDescription(partner) {
    const confidenceLevel = partner.result_kp_mqap_institution_obj.confidant;
    return `The confidence level for the predicted match is <span class="confidenceLevel">${confidenceLevel}%</span>. Feel free to select a different partner only if necessary.`;
  }
}
