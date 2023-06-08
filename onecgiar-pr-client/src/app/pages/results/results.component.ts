import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { IpsrDataControlService } from '../ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent {
  constructor(private ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}
  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Results');
    this.ipsrDataControlSE.inIpsr = false;
    this.api.rolesSE.platformIsClosed = environment.resultModuleIsClosed;
  }
}
