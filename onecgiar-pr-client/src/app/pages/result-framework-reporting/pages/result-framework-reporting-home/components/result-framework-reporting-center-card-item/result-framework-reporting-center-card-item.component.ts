import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface CenterHomeItem {
  center_id: string;
  center_name: string;
  center_acronym: string;
}

@Component({
  selector: 'app-result-framework-reporting-center-card-item',
  imports: [CommonModule, RouterModule],
  templateUrl: './result-framework-reporting-center-card-item.component.html',
  styleUrl: './result-framework-reporting-center-card-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingCenterCardItemComponent {
  @Input() item!: CenterHomeItem;
}
