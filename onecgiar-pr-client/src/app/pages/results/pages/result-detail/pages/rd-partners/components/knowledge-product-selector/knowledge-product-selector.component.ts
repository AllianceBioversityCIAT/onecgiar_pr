import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { RdPartnersService } from '../../rd-partners.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { UnmappedMQAPInstitutionDto } from '../../models/partnersBody';

@Component({
  selector: 'app-knowledge-product-selector',
  templateUrl: './knowledge-product-selector.component.html',
  styleUrls: ['./knowledge-product-selector.component.scss'],
  standalone: false
})
export class KnowledgeProductSelectorComponent implements OnInit {
  authorAffiliationsList: any[] = [{ part: { code: 5 } }];

  /**
   * P2-3301: same defect that was fixed in the 2026 selector. These were class-field initializers, so
   * they were read ONCE while the component was being constructed, before `GET_resultById` had filled
   * `currentResult`. Both froze as `undefined` and the note rendered a link to
   * `/result/result-detail/undefined/theory-of-change?phase=undefined`, which 404s and bounces the user
   * home with a raw "Result not found" dialog. The signal is read first because this template has no
   * other reactive read: without it the view is never marked dirty and the stale link stays painted.
   * The message is a getter too, otherwise it would keep the values captured at construction time.
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

  get alertStatusMessage(): string {
    return `Partner organizations you collaborated with or are currently collaborating with to generate this result. </br>Please note that CGIAR Centers are not listed here. They are directly linked to <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.`;
  }

  sourceLabel: string = '';

  deliveryOptions = [
    { id: 1, name: 'Scaling' },
    { id: 2, name: 'Demand' },
    { id: 3, name: 'Innovation' },
    { id: 4, name: 'Other' }
  ];

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rdPartnersSE: RdPartnersService,
    public rolesSE: RolesService
  ) {}

  ngOnInit(): void {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe((res: any) => {
      const response = res?.response;
      const sourceFromMetadata = response?.metadata?.find(m => m?.source)?.source;
      const rawSource = response?.metadataCG?.source ?? sourceFromMetadata ?? response?.repo ?? null;

      const normalized = (rawSource || '').toString().trim().toUpperCase();
      if (normalized === 'MELSPACE') {
        this.sourceLabel = 'MELSpace';
      } else if (normalized === 'CGSPACE') {
        this.sourceLabel = 'CGSpace';
      } else {
        this.sourceLabel = '';
      }
    });
  }

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
