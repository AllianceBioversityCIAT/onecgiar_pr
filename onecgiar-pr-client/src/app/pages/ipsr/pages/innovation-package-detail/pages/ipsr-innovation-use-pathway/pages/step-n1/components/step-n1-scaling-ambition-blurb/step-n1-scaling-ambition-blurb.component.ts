import { Component, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { PrToastService } from 'src/app/shared/components/pr-toast';

@Component({
    selector: 'app-step-n1-scaling-ambition-blurb',
    templateUrl: './step-n1-scaling-ambition-blurb.component.html',
    styleUrls: ['./step-n1-scaling-ambition-blurb.component.scss'],
    standalone: false
})
export class StepN1ScalingAmbitionBlurbComponent {
  @Input() body = new IpsrStep1Body();
  constructor(public messageSE: PrToastService) {}
  onCopy() {
    this.messageSE.add({ key: 'copykey', severity: 'info', summary: 'Copied', detail: 'Description copied' });
  }
}
