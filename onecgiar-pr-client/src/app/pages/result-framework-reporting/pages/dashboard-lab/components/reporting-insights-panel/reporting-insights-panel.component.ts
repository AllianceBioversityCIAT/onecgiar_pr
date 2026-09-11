import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import {
  ReportingSummaryStats,
  ReportingSummaryStatsComponent
} from '../reporting-summary-stats/reporting-summary-stats.component';

/**
 * JIRA-style right rail for the four Reporting summary cards — keeps the AoW list full-width
 * until the user explicitly asks for programme scope / target / evidence figures.
 */
@Component({
  selector: 'app-reporting-insights-panel',
  standalone: true,
  imports: [ReportingSummaryStatsComponent],
  templateUrl: './reporting-insights-panel.component.html',
  styleUrls: ['./reporting-insights-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportingInsightsPanelComponent {
  readonly open = input.required<boolean>();
  readonly stats = input.required<ReportingSummaryStats>();
  readonly loading = input(false);
  readonly programCode = input('');

  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
