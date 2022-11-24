import { Component, OnInit } from '@angular/core';
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
  constructor(public api: ApiService, public institutionsSE: InstitutionsService, public rdPartnersSE: RdPartnersService, public rolesSE: RolesService) {}

  institutions_name(institution_id) {
    const insts = JSON.parse(JSON.stringify(this.institutionsSE.institutionsList));
    const institutionFinded = insts.find(institution => institution.institutions_id == institution_id);
    return institutionFinded?.institutions_name;
  }

  institutions_institutions_type_name(institution_id) {
    const insts = JSON.parse(JSON.stringify(this.institutionsSE.institutionsList));
    const institutionFinded = insts.find(institution => institution.institutions_id == institution_id);
    return institutionFinded?.institutions_type_name;
  }
}
