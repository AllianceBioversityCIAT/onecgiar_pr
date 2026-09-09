import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { UnmappedMQAPInstitutionDto } from '../../../../models/contributorsAndPartnersBody';

@Component({
  selector: 'app-knowledge-product-selector',
  templateUrl: './knowledge-product-selector.component.html',
  styleUrls: ['./knowledge-product-selector.component.scss'],
  standalone: false
})
export class CPKnowledgeProductSelectorComponent {
  authorAffiliationsList: any[] = [{ part: { code: 5 } }];

  /**
   * P2-3301 follow-up: P25 has no navigable "Theory of Change" section (not in this portfolio's
   * result-detail sidebar — `routing-data.ts` only exposes `theory-of-change` for P22), and P25's own
   * section order makes "Contributors & partners" section 2, not Theory of Change. The P22-derived
   * copy this note used to carry ("...are directly linked to Section 2, Theory of Change") was
   * therefore both mislabeled and pointed at a dead end for this portfolio, so the CGIAR Centers /
   * Theory of Change sentence was dropped rather than re-fixed. `resultCode`/`versionId` getters and
   * the deep link they built are gone with it — nothing else in this component read them.
   */
  alertStatusMessage = 'Partner organizations you collaborated with or are currently collaborating with to generate this result.';

  deliveryOptions = [
    { id: 1, name: 'Scaling' },
    { id: 2, name: 'Demand' },
    { id: 3, name: 'Innovation' },
    { id: 4, name: 'Other' }
  ];

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rdPartnersSE: RdContributorsAndPartnersService,
    public rolesSE: RolesService
  ) {}

  institutions_institutions_type_name(partner) {
    const insts = this.institutionsSE.institutionsList;

    const institutionFinded = insts.find(institution => institution.institutions_id == partner.institutions_id);

    partner.obj_institutions.obj_institution_type_code.name = institutionFinded?.institutions_type_name;
    partner.obj_institutions.website_link = institutionFinded?.website_link;
  }

  generateDescription(partner: UnmappedMQAPInstitutionDto) {
    const confidenceLevel = partner.result_kp_mqap_institution_object.confidant;

    if (partner.is_predicted) {
      return `The confidence level for the predicted match is <span class="text-blue-500 font-weight-600">${confidenceLevel}%</span>. Feel free to select a different partner only if necessary.`;
    } else {
      return `We couldn't find a matching partner for this author affiliation. Please check the partners list or <a class='open_route alert-event'>request</a> to add it if needed.`;
    }
  }
}
