import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-result-framework-reporting-recent-item',
  imports: [],
  templateUrl: './result-framework-reporting-recent-item.component.html',
  styleUrl: './result-framework-reporting-recent-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingRecentItemComponent {
  @Input() item?: any;
}
