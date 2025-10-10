import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RecentActivity } from '../../../../../../shared/interfaces/recentActivity.interface';
import { FormatTimeAgoPipe } from '../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';

@Component({
  selector: 'app-result-framework-reporting-recent-item',
  imports: [FormatTimeAgoPipe],
  templateUrl: './result-framework-reporting-recent-item.component.html',
  styleUrl: './result-framework-reporting-recent-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingRecentItemComponent {
  @Input() item?: RecentActivity;
}
