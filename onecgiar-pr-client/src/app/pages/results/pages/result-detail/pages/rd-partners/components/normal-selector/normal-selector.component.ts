import { Component } from '@angular/core';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from '../../rd-partners.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { EventType } from '../../../../../../../../shared/interfaces/event-type.dto';

@Component({
  selector: 'app-normal-selector',
  templateUrl: './normal-selector.component.html',
  styleUrls: ['./normal-selector.component.scss']
})
export class NormalSelectorComponent {
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  disableOptions: any[] = null;

  partnerUniqueTypes = [];

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdPartnersService,
    public institutionsSE: InstitutionsService,
    public greenChecksSE: GreenChecksService,
    public dataControlSE: DataControlService
  ) {}

  getDisableOptions() {
    this.disableOptions = [];

    if (this.rdPartnersSE?.partnersBody?.mqap_institutions) {
      this.disableOptions = this.rdPartnersSE.partnersBody.mqap_institutions.map(element => element);
    }
  }

  getOnlyPartnerTypes() {
    const partnerTypes = this.rdPartnersSE.partnersBody.institutions?.map(element => element?.obj_institutions.obj_institution_type_code.name);
    this.partnerUniqueTypes = Array.from(new Set(partnerTypes));
  }

  emitPartnerEvent(partner) {
    if (this.rdPartnersSE.leadPartnerId === partner) {
      this.rdPartnersSE.leadPartnerId = null;
    }
    this.rdPartnersSE.setPossibleLeadPartners(true);
  }

  updateLeadData() {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner) {
      this.rdPartnersSE.partnersBody.is_lead_by_partner = false;
      this.rdPartnersSE.disableLeadPartner = true;
    } else {
      this.rdPartnersSE.disableLeadPartner = false;
    }
  }
}
