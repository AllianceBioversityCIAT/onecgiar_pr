import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { NonPooledProjectDto, PartnersBody } from './models/partnersBody';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';

@Component({
  selector: 'app-rd-partners',
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss']
})
export class RdPartnersComponent implements OnInit {
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  alertStatusMessage: string = `Partner organization or CG Center that you collaborated with or are currently collaborating with to generate this result.`;
  cgCentersMessage: string = `This section displays CGIAR Center partners as they appear in <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li> Should you identify any inconsistencies, please update Section 2`;

  disabledText = 'To remove this center, please contact your librarian';

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdPartnersService,
    private customizedAlertsFeSE: CustomizedAlertsFeService,
    public centersSE: CentersService
  ) {}

  async ngOnInit() {
    this.rdPartnersSE.partnersBody = new PartnersBody();
    this.rdPartnersSE.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(_resp => {
      try {
        document.querySelectorAll('.alert-event').forEach(element => {
          element.addEventListener('click', _e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.rdPartnersSE.getSectionInformation();
        });
      }
    );
  }

  deleteEvidence(index: number) {
    this.rdPartnersSE.partnersBody.contributing_np_projects.splice(index, 1);
  }

  addBilateralContribution() {
    this.rdPartnersSE.partnersBody.contributing_np_projects.push(new NonPooledProjectDto());
  }

  deleteContributingCenter(index: number, updateComponent: boolean = false) {
    if (updateComponent) {
      this.rdPartnersSE.updatingLeadData = true;
    }

    const deletedCenter = this.rdPartnersSE.partnersBody?.contributing_center.splice(index, 1);
    if (deletedCenter.length === 1 && this.rdPartnersSE.leadCenterCode === deletedCenter[0].code) {
      //always should happen
      this.rdPartnersSE.leadCenterCode = null;
    }
    if (updateComponent) {
      setTimeout(() => {
        this.rdPartnersSE.updatingLeadData = false;
      }, 50);
    }
  }

  get validateGranTitle() {
    for (const iterator of this.rdPartnersSE.partnersBody.contributing_np_projects) {
      const evidencesFinded = this.rdPartnersSE.partnersBody.contributing_np_projects.filter(
        evidence => evidence.grant_title == iterator.grant_title
      );
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    return !!this.rdPartnersSE.partnersBody.contributing_np_projects.find(evidence => !evidence.grant_title);
  }

  onSaveSection() {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner) {
      this.rdPartnersSE.partnersBody.institutions = [];
    }

    //('leadPartner', this.rdPartnersSE.leadPartnerId);
    //('leadCenter', this.rdPartnersSE.leadCenterCode);
    if (this.rdPartnersSE.partnersBody.is_lead_by_partner) {
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = this.rdPartnersSE.leadPartnerId === mqap.institutions_id;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        //('institution', i);
        //('is leading result');
        i.is_leading_result = this.rdPartnersSE.leadPartnerId === i.institutions_id;
      });
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => (center.is_leading_result = false));
    } else {
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => {
        center.is_leading_result = this.rdPartnersSE.leadCenterCode === center.code;
      });
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = false;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = false;
      });
    }

    this.api.resultsSE.PATCH_partnersSection(this.rdPartnersSE.partnersBody).subscribe(_resp => {
      this.rdPartnersSE.getSectionInformation(null, true);
    });
  }

  getMessageLead() {
    const entity = this.rdPartnersSE.partnersBody.is_lead_by_partner ? 'partner' : 'CG Center';
    return `Please select the ${entity} leading this result. <b>Only ${entity}s already added in this section can be selected as the result lead.</b>`;
  }
}
