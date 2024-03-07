import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../ipsr/services/ipsr-data-control.service';
import { ApiService } from '../../../app/shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-results',
  standalone: true,
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
  imports: [CommonModule, RouterOutlet]
})
export class ResultsComponent implements OnInit {
  constructor(
    private ipsrDataControlSE: IpsrDataControlService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results');
    this.ipsrDataControlSE.inIpsr = false;
    this.api.rolesSE.platformIsClosed =
      this.api.globalVariablesSE.get?.result_is_closed;
  }
}
