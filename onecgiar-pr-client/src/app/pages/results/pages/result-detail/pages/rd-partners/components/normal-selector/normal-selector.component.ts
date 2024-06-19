import { Component } from '@angular/core';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from '../../rd-partners.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-normal-selector',
  templateUrl: './normal-selector.component.html',
  styleUrls: ['./normal-selector.component.scss']
})
export class NormalSelectorComponent {
  resultCode = this?.api?.dataControlSE?.currentResult?.result_code;
  versionId = this?.api?.dataControlSE?.currentResult?.version_id;

  alertStatusMessage: string = `Partner organizations you collaborated with or are currently collaborating with to generate this result. <li>Please note that CGIAR Centers are not listed here. They are directly linked to <a class="open_route" href="/result/result-detail/${this.resultCode}/theory-of-change?phase=${this.versionId}" target="_blank">Section 2, Theory of Change</a>.</li>`;
  disableOptions: any[] = null;

  partnerUniqueTypes = [];

  constructor(public api: ApiService, public rolesSE: RolesService, public rdPartnersSE: RdPartnersService, public institutionsSE: InstitutionsService, public greenChecksSE: GreenChecksService, public dataControlSE: DataControlService) {}

  getDisableOptions() {
    this.disableOptions = [];

    if (this.rdPartnersSE?.partnersBody?.mqap_institutions) {
      this.disableOptions = this.rdPartnersSE.partnersBody.mqap_institutions.map(element => element);
    }
  }

  getOnlyPartnerTypes() {
    const partnerTypes = this.rdPartnersSE.partnersBody.institutions.map(element => element?.institutions_type_name);
    this.partnerUniqueTypes = Array.from(new Set(partnerTypes));
  }
}
