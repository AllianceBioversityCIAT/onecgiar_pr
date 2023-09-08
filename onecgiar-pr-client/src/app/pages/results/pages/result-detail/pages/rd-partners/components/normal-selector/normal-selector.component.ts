import { Component, Input, OnInit } from '@angular/core';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { PartnersBody } from '../../models/partnersBody';
import { RdPartnersService } from '../../rd-partners.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-normal-selector',
  templateUrl: './normal-selector.component.html',
  styleUrls: ['./normal-selector.component.scss']
})
export class NormalSelectorComponent {
  constructor(public rolesSE: RolesService, public rdPartnersSE: RdPartnersService, public institutionsSE: InstitutionsService, public greenChecksSE: GreenChecksService, public dataControlSE: DataControlService) {}
  public disableOptions: any[] = null;
  getDisableOptions() {
    this.disableOptions = [];
    this.rdPartnersSE.partnersBody.mqap_institutions.forEach(element => {
      this.disableOptions.push(element?.user_matched_institution);
    });
  }
}
