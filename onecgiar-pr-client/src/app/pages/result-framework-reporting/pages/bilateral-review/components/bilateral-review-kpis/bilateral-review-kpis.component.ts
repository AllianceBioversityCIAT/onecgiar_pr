// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-R-6, BRT-AC-4, BRT-AC-5)
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-6, AC-6, design.md §6.2, DD-2)
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';

/** The five KPI values the stat bar renders — always over the SEARCH-FILTERED list (design.md §6.2). */
export interface BilateralReviewKpis {
  projects: number;
  centers: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Stat bar for the Bilateral review tab (BRP-R-6, BRP-DD-2 — rewrite of the four-card KPI grid in
 * place, SAME inputs/outputs so the page contract holds unchanged): one line at >= 900px, wraps
 * below it — bilateral projects · contributing centers · pending review (a toggle, equivalent to
 * the Pending chip, `BRT-R-6`) · decided (Approved + Rejected, sublabel). Host carries
 * `data-testid="bilateral-review-statbar"` (BRP-AC-6) so the ≤44px gate measures the component
 * itself, not a page wrapper — the page no longer wraps this in its own padded `<div>`.
 */
@Component({
  selector: 'app-bilateral-review-kpis',
  standalone: true,
  templateUrl: './bilateral-review-kpis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'bilateral-review-statbar' }
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
