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
   * P2-3301 (same defect as P2-3276 in `app-estimates`): these were class-field initializers, so they
   * were read ONCE while the component was being constructed. `result-detail` resets
   * `dataControlSE.currentResult` on entry and only fills it when the async `GET_resultById` resolves,
   * so both froze as `undefined` and the note rendered
   * `/result/result-detail/undefined/theory-of-change?phase=undefined` — a 404 that bounced the user
   * home with a raw "Result not found" dialog. As getters they are re-evaluated on every change
   * detection, and they fall back to the code and phase `result-detail` assigns synchronously from the
   * route, so the link is correct even on a direct URL entry or a refresh.
   *
   * They read `currentResultSignal()` first on purpose: `GET_resultById` writes the plain
   * `currentResult` field and the signal together, and this template has no other reactive read, so
   * without the signal the view is never marked dirty and the note keeps rendering the stale link even
   * though the getter would now return the right value (same lesson as P2-3322).
   */
  get resultCode() {
    return (
      this.api.dataControlSE?.currentResultSignal()?.result_code ??
      this.api.dataControlSE?.currentResult?.result_code ??
      this.api.resultsSE?.currentResultCode
    );
  }

  get versionId() {
    return (
      this.api.dataControlSE?.currentResultSignal()?.version_id ??
      this.api.dataControlSE?.currentResult?.version_id ??
      this.api.resultsSE?.currentResultPhase
    );
  }

  /**
   * A getter, not a field: the template binds it into `app-alert-status`, so it has to be rebuilt on
   * every change detection pass. Frozen as a string it would keep the `undefined` link even with the
   * getters above.
   */
  get alertStatusMessage(): string {
    return `Partner organizations you collaborated with or are currently collaborating with to generate this result. <li>Please note that CGIAR Centers are not listed here. They are directly linked to <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li>`;
  }

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
