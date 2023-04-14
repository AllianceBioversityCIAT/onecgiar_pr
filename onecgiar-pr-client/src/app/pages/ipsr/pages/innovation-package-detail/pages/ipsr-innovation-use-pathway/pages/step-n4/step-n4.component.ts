import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { IpsrStep4Body } from './model/Ipsr-step-4-body.model';

@Component({
  selector: 'app-step-n4',
  templateUrl: './step-n4.component.html',
  styleUrls: ['./step-n4.component.scss']
})
export class StepN4Component implements OnInit {
  ipsrStep4Body = new IpsrStep4Body();
  constructor(public ipsrDataControlSE: IpsrDataControlService) {}
  radioOptions = [
    { id: true, name: 'Yes' },
    { id: false, name: 'No, not necessary at this stage' }
  ];
  ngOnInit(): void {}
  workshopDescription() {
    return `A template participant list can be downloaded <a href=""  class="open_route" target="_blank">here</a>`;
  }
}
