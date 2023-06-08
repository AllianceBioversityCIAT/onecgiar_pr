import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ipsr',
  templateUrl: './ipsr.component.html',
  styleUrls: ['./ipsr.component.scss']
})
export class IpsrComponent {
  constructor(public api: ApiService, private ipsrDataControlSE: IpsrDataControlService) {
    this.ipsrDataControlSE.inIpsr = true;
    this.api.rolesSE.platformIsClosed = environment.IPSRModuleIsClosed;
  }
}
