import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-step-n1-scaling-ambition-blurb',
  templateUrl: './step-n1-scaling-ambition-blurb.component.html',
  styleUrls: ['./step-n1-scaling-ambition-blurb.component.scss']
})
export class StepN1ScalingAmbitionBlurbComponent {
  @Input() body = new IpsrStep1Body();
  constructor(private messageSE: MessageService) {}
  onCopy() {
    this.messageSE.add({ key: 'copykey', severity: 'info', summary: 'Copied', detail: 'Description copied' });
  }
}
