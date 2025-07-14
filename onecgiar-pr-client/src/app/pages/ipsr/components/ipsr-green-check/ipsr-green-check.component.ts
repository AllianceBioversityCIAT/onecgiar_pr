import { Component, Input } from '@angular/core';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';

@Component({
    selector: 'app-ipsr-green-check',
    templateUrl: './ipsr-green-check.component.html',
    styleUrls: ['./ipsr-green-check.component.scss'],
    standalone: false
})
export class IpsrGreenCheckComponent {
  @Input() objectReference: string;

  constructor(public ipsrCompletenessStatusSE: IpsrCompletenessStatusService) {}
}
