import { Component, Input } from '@angular/core';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ipsr-green-check',
  standalone: true,
  templateUrl: './ipsr-green-check.component.html',
  styleUrls: ['./ipsr-green-check.component.scss'],
  imports: [CommonModule]
})
export class IpsrGreenCheckComponent {
  @Input() objectReference: string;

  constructor(public ipsrCompletenessStatusSE: IpsrCompletenessStatusService) {}
}
