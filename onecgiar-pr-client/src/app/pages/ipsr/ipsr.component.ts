import { Component } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-ipsr',
  standalone: true,
  templateUrl: './ipsr.component.html',
  styleUrls: ['./ipsr.component.scss'],
  imports: [CommonModule, RouterOutlet]
})
export class IpsrComponent {
  constructor(
    public api: ApiService,
    private ipsrDataControlSE: IpsrDataControlService
  ) {
    this.ipsrDataControlSE.inIpsr = true;
    this.api.rolesSE.platformIsClosed =
      this.api.globalVariablesSE.get?.ipsr_is_closed;
  }
}
