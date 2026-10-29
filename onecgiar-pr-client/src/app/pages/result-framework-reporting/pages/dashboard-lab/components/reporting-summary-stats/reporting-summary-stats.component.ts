import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ReportingSummaryStats {
  programsCount: number;
  aowsCount: number;
  /** KPIs planned (a count, no-target rows included) — KTO-DD-3. */
  totalKpis: number;
  /** KPIs with a target: the only ratio denominator ("KPIs with evidence x of N"). Falls back to `totalKpis` when absent. */
  targetedKpis?: number;
  reportedKpis: number;
  plannedKpis?: number;
  zeroTargetKpis?: number;
}

export type ReportingSummaryStatsVariant = 'inline' | 'panel';

@Component({
  selector: 'app-reporting-summary-stats',
  standalone: true,
  templateUrl: './reporting-summary-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportingSummaryStatsComponent {
  readonly stats = input.required<ReportingSummaryStats>();
  readonly loading = input(false);
  /** `inline` = former band grid above AoW cards; `panel` = vertical stack inside the insights rail. */
  readonly variant = input<ReportingSummaryStatsVariant>('inline');

  /** @akili-spec changes/kpi-progress-target-only */
  totalKpisTitle(stats: ReportingSummaryStats): string | null {
    const planned = stats.plannedKpis;
    if (planned === null || planned === undefined) return null;
    const zeroTarget = stats.zeroTargetKpis ?? 0;
    if (zeroTarget <= 0) return `${planned} planned`;
    return `${planned} planned · excludes ${this.countLabel(zeroTarget, 'KPI')} with no target set`;
  }

  /** Ratio denominator for "KPIs with evidence": the targeted set (KTO-DD-3). */
  targetedOf(stats: ReportingSummaryStats): number {
    return stats.targetedKpis ?? stats.totalKpis;
  }

  evidencePercentage(stats: ReportingSummaryStats): number {
    const targeted = this.targetedOf(stats);
    return targeted > 0 ? Math.round((stats.reportedKpis / targeted) * 100) : 0;
  }

  private countLabel(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }
}
