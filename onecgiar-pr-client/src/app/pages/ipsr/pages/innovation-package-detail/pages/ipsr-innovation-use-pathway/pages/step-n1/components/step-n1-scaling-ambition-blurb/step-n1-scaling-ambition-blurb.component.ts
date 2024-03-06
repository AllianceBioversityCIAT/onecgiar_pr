import { Component, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-step-n1-scaling-ambition-blurb',
  standalone: true,
  templateUrl: './step-n1-scaling-ambition-blurb.component.html',
  styleUrls: ['./step-n1-scaling-ambition-blurb.component.scss'],
  imports: [ToastModule],
  providers: [MessageService]
})
export class StepN1ScalingAmbitionBlurbComponent {
  @Input() body = new IpsrStep1Body();

  constructor(public messageSE: MessageService) {}

  onCopy() {
    this.messageSE.add({
      key: 'copykey',
      severity: 'info',
      summary: 'Copied',
      detail: 'Description copied'
    });
  }
}
