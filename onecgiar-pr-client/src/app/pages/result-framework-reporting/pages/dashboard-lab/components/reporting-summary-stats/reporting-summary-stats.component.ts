import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ReportingSummaryStats {
  programsCount: number;
  aowsCount: number;
  totalKpis: number;
  reportedKpis: number;
  plannedKpis?: number;
  zeroTargetKpis?: number;
}

@Component({
  selector: 'app-reporting-summary-stats',
  standalone: true,
  templateUrl: './reporting-summary-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportingSummaryStatsComponent {
  readonly stats = input.required<ReportingSummaryStats>();
  readonly loading = input(false);

  totalKpisTitle(stats: ReportingSummaryStats): string | null {
    const planned = stats.plannedKpis;
    if (planned === null || planned === undefined) return null;
    const zeroTarget = stats.zeroTargetKpis ?? 0;
    if (zeroTarget <= 0) return `${planned} planned`;
    return `${planned} planned · excludes ${this.countLabel(zeroTarget, 'zero-target KPI')}`;
  }

  evidencePercentage(stats: ReportingSummaryStats): number {
    return stats.totalKpis > 0 ? Math.round((stats.reportedKpis / stats.totalKpis) * 100) : 0;
  }

  private countLabel(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }
}
