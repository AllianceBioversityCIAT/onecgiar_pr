import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';

@Component({
  selector: 'app-ipsr',
  templateUrl: './ipsr.component.html',
  styleUrls: ['./ipsr.component.scss'],
  standalone: false
})
export class IpsrComponent implements OnInit, OnDestroy {
  private readonly dataControlSE = inject(DataControlService);

  constructor(
    public api: ApiService,
    private ipsrDataControlSE: IpsrDataControlService
  ) {}

  ngOnInit(): void {
    this.ipsrDataControlSE.inIpsr = true;
    this.api.rolesSE.platformIsClosed = this.api.globalVariablesSE.get?.ipsr_is_closed;
    // The Spartan sidebar carries all navigation + actions here, so hide the top header.
    this.dataControlSE.hideMainNav.set(true);
    this.dataControlSE.hideHeaderChrome.set(true);
  }

  ngOnDestroy(): void {
    this.dataControlSE.hideMainNav.set(false);
    this.dataControlSE.hideHeaderChrome.set(false);
  }
}
