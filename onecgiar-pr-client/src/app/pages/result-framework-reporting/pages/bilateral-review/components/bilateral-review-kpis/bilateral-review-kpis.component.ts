// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-R-6, BRT-AC-4, BRT-AC-5)
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';

/** The four KPI values the strip renders — always over the SEARCH-FILTERED list (design.md §6.2). */
export interface BilateralReviewKpis {
  projects: number;
  centers: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * KPI strip for the Bilateral review tab: Bilateral projects · Contributing centers · Pending
 * review (a toggle, equivalent to the Pending chip, `BRT-R-6`) · Decided this list (Approved +
 * Rejected, split as sublabel). Markup/classes mirror `reporting-summary-stats` (grid, card
 * shell, `animate-pulse` skeleton) — `dashboard-lab/components/reporting-summary-stats/`.
 */
@Component({
  selector: 'app-bilateral-review-kpis',
  standalone: true,
  templateUrl: './bilateral-review-kpis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralReviewKpisComponent {
  readonly kpis = input.required<BilateralReviewKpis>();
  readonly loading = input(false);
  readonly pendingActive = input(false);
  readonly togglePending = output<void>();

  readonly copy = BILATERAL_REVIEW_COPY.kpis;

  decidedSublabel(kpis: BilateralReviewKpis): string {
    return this.copy.decidedSublabel(kpis.approved, kpis.rejected);
  }
}
