// @akili-spec changes/my-work-board (MWB-T-4, MWB-R-4, R-6, design.md §6.2, §6.3, DD-6)
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgrammeResultRow } from '../../../programme-results/services/programme-results.service';
import { firstMissingRoute, MY_WORK_SECTION_MAP, sectionLabel } from '../../my-work-section-map';
import { STATUS_META } from '../../../result-framework-reporting-home/status-meta';
import { SmartNavigationService } from '../../../../../../shared/services/smart-navigation.service';

/** The four visual variants `MWB-R-4` names. Derived, never passed in — a caller only says
 *  whether this card sits in the Editing column (`inEditingColumn`); the card works out which of
 *  the three Editing-column shapes applies from the row's own `completeness`. */
export type MyWorkCardVariant = 'editing' | 'ready' | 'unknown' | 'waiting-closed';

const NOT_STARTED_CHIP_CLASS = 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]';

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * One board card (`MWB-R-4`, `MWB-R-6`). Pure renderer + one navigation seam (`Router`) — NO API
 * service is injected here (`MWB-DD-6`, `MWB-R-4` "BUT it must NOT compute completeness
 * client-side from any per-result `green-checks/:id` call"): `completeness` arrives as data on
 * `row`, this component never fetches it. No `draggable` attribute anywhere in the template.
 */
@Component({
  selector: 'app-my-work-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-work-card.component.html',
  styleUrls: ['./my-work-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyWorkCardComponent {
  private readonly router = inject(Router);
  private readonly smartNav = inject(SmartNavigationService);

  readonly row = input.required<ProgrammeResultRow>();
  /** Whether this card is rendered inside the Editing column — the only column that shows
   *  completeness at all (`MWB-R-4`). Every other column renders the waiting/closed shape. */
  readonly inEditingColumn = input<boolean>(false);

  /** `MWB-T-3`/`MWB-T-4` forward pointer (a): ready requires a REAL denominator — `total === 0`
   *  (capped rows, IPSR packages, an all-null fold) reads as *Open to check completeness*, never
   *  as ready. */
  readonly variant = computed<MyWorkCardVariant>(() => {
    if (!this.inEditingColumn()) return 'waiting-closed';
    const completeness = this.row().completeness;
    if (!completeness || completeness.total <= 0) return 'unknown';
    if (completeness.complete >= completeness.total) return 'ready';
    return 'editing';
  });

  readonly isEditingVariant = computed(() => this.variant() === 'editing');
  readonly isReadyVariant = computed(() => this.variant() === 'ready');
  readonly isUnknownVariant = computed(() => this.variant() === 'unknown');
  readonly isWaitingClosed = computed(() => this.variant() === 'waiting-closed');

  readonly statusChipClass = computed(() => STATUS_META[this.row().statusId ?? -1]?.chipClass ?? NOT_STARTED_CHIP_CLASS);

  readonly createdLabel = computed(() => formatDate(this.row().created));

  readonly progressPercent = computed(() => {
    const completeness = this.row().completeness;
    if (!completeness || completeness.total <= 0) return 0;
    return Math.round((completeness.complete / completeness.total) * 100);
  });

  /** `MWB-T-2` forward pointer (c): filter `missing` through the section map BEFORE labelling —
   *  an unknown key never renders in the list. */
  readonly missingLabels = computed<string[]>(() => {
    const missing = this.row().completeness?.missing ?? [];
    return missing.filter(name => !!MY_WORK_SECTION_MAP[name]).map(name => sectionLabel(name));
  });

  /** `Continue` (Editing/unknown) and `Review and submit` (ready) share one destination: the
   *  first missing section, or `general-information` when there is none / it is unmapped
   *  (`MWB-R-6`, `firstMissingRoute`'s own fallback). */
  readonly continueRoute = computed(() => firstMissingRoute(this.row().completeness?.missing));

  /** `?phase=<versionId>`, numeric — same shape the Results tab link carries (`MWB-R-6`).
   *  `versionId` arrives as a string on the payload (`version_id: "36"`); coerced here once. */
  readonly continueQueryParams = computed(() => ({ phase: Number(this.row().versionId) }));

  /** `MWB-R-6`: `Continue` is a real `<button>` performing the navigation directly — no `<a>`, no
   *  drag handle, no drop target anywhere on the card. */
  /** Persist My Results as the result-detail Back origin before the remount. */
  rememberOrigin(): void {
    this.smartNav.rememberResultDetailOrigin();
  }

  continue(): void {
    this.rememberOrigin();
    this.router.navigate(['/result', 'result-detail', this.row().code, this.continueRoute()], { queryParams: this.continueQueryParams() });
  }
}
