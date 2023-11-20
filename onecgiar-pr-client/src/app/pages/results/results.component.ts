import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {
  constructor(private ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results');
    this.ipsrDataControlSE.inIpsr = false;
    this.api.rolesSE.platformIsClosed = this.api.globalVariablesSE.get?.result_is_closed;
  }
}
