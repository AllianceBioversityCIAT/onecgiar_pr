import { Component } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';

@Component({
  selector: 'app-ipsr',
  templateUrl: './ipsr.component.html',
  styleUrls: ['./ipsr.component.scss']
})
export class IpsrComponent {
  constructor(public api: ApiService, private ipsrDataControlSE: IpsrDataControlService) {
    this.ipsrDataControlSE.inIpsr = true;
    this.api.rolesSE.platformIsClosed = this.api.globalVariablesSE.get?.ipsr_is_closed;
  }
}
