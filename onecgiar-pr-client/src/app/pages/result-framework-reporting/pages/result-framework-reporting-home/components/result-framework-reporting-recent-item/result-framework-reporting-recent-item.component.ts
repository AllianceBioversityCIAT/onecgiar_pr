import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RecentActivity } from '../../../../../../shared/interfaces/recentActivity.interface';
import { FormatTimeAgoPipe } from '../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result-framework-reporting-recent-item',
  imports: [PrTooltipDirectiveModule, FormatTimeAgoPipe, RouterLink],
  templateUrl: './result-framework-reporting-recent-item.component.html',
  styleUrl: './result-framework-reporting-recent-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingRecentItemComponent {
  @Input() item?: RecentActivity;

  getResultUrl() {
    const url = `/result/result-detail/${this.item?.resultCode}/general-information`;
    return url;
  }

  getTooltipText() {
    return `View result: ${this.item?.resultCode} - ${this.item?.resultTitle}`;
  }
}
