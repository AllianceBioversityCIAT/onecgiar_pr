import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { IpsrDataControlService } from '../ipsr/services/ipsr-data-control.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent {
  constructor(private titleService: Title, private ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit(): void {
    this.titleService.setTitle('Results');
    this.ipsrDataControlSE.inIpsr = false;
  }
}
