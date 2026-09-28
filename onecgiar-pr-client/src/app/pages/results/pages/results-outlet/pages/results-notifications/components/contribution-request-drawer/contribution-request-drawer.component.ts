// @akili-spec contribution-request-drawer (CRD-T-1, CRD-T-2)
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideX } from '@ng-icons/lucide';
import { HlmSheetImports } from '@spartan/sheet';
import { HlmButton } from '@spartan/button';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';

/** design.md §6.2 `headerParts`: pre-built sentence pieces, reusing the row's own requester/responder resolution. */
export interface ContributionRequestDrawerHeaderParts {
  lead: string;
  requesterCode: string;
  verb: string;
  responderCode?: string;
  tail: string;
  resultCode: string;
  resultTitle: string;
}

/** design.md §6.2 `reviewRows`: one "Where it contributes" table = an array of these, 7 per table. */
export interface ContributionRequestDrawerReviewField {
  label: string;
  value: string;
  mono?: boolean;
}

export type ContributionRequestDrawerMode = 'decide' | 'confirm-decline';

/** A cell's long value is clamped past this length (design.md §6.3 `line-clamp-3`, hard rule #16). */
const CLAMP_THRESHOLD_CHARS = 180;

/**
 * Right-side detail drawer for a pending Received contribution request (CRD-R-1..R-11).
 * Presentational only: no API calls, no global services (design.md §6.2). `notification-item`
 * owns all decision state and projects the bilateral Align block into `[crdAlign]`.
 *
 * T-2 scope: header sentence (`headerParts`), RESULT card, "Where it contributes" tables (with
 * dash fallback and per-cell clamp/Show more), the `decide` / `confirm-decline` footer, busy/blocked
 * states, and scrolling the projected Align slot into view on `focusAlign`.
 */
@Component({
  selector: 'app-contribution-request-drawer',
  imports: [HlmSheetImports, HlmButton, NgIcon],
  providers: [provideIcons({ lucideLoaderCircle, lucideX })],
  templateUrl: './contribution-request-drawer.component.html',
  styleUrl: './contribution-request-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContributionRequestDrawerComponent {
  readonly copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Whether the sheet is shown. The parent (`notification-item`) owns this state (CRD-R-9). */
  readonly open = input(false);

  /** Footer state: the plain decide footer, or the inline decline confirmation (CRD-R-7). */
  readonly mode = input<ContributionRequestDrawerMode>('decide');

  /** Header sentence pieces (CRD-R-2), built by `notification-item`'s `drawerHeader()`. */
  readonly headerParts = input<ContributionRequestDrawerHeaderParts | null>(null);

  /** RESULT card (CRD-R-3). */
  readonly resultCode = input('');
  readonly resultTitle = input('');

  /** "Where it contributes" tables (CRD-R-4): one array per `toc_contribution_review` entry. */
  readonly reviewRows = input<ContributionRequestDrawerReviewField[][]>([]);

  /**
   * CRD-R-4 "No review data": the section is never hidden and never shows fewer than 7 labels.
   * `notification-item`'s `drawerReviewTables()` already builds a single all-dash table when there
   * is no review data — this fallback makes the same guarantee hold even if `reviewRows` is ever
   * fed an empty array directly.
   */
  readonly displayReviewRows = computed<ContributionRequestDrawerReviewField[][]>(() => {
    const rows = this.reviewRows();
    return rows.length ? rows : [this.buildDashReviewRow()];
  });

  /** Footer state (CRD-R-6..R-8). */
  readonly acceptDisabled = input(false);
  readonly declineDisabled = input(false);
  readonly acceptBusy = input(false);
  readonly declineBusy = input(false);
  readonly blockedReason = input<string | null>(null);
  readonly acceptHelper = input<string | null>(null);

  /** CRD-R-10 "Bilateral row accept": scroll the projected `[crdAlign]` slot into view after open. */
  readonly focusAlign = input(false);

  /**
   * Fires on close by the built-in ✕, the scrim, or Escape (CRD-R-9). The parent is responsible
   * for flipping `open` back to false and for discarding any in-progress mapping — this component
   * emits and does nothing else.
   */
  readonly closed = output<void>();

  /** CRD-R-3: Result card activated. */
  readonly resultActivated = output<void>();

  /** CRD-R-6/R-7 footer actions. */
  readonly acceptClicked = output<void>();
  readonly declineClicked = output<void>();
  readonly declineConfirmed = output<void>();
  readonly declineCancelled = output<void>();

  /** Per-cell expand state for the review table clamp, keyed `${tableIndex}-${rowIndex}` (CRD-R-4 long text). */
  private readonly expandedCells = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      if (this.open() && this.focusAlign()) {
        // Deferred a tick: the sheet's own portal/state effects (real CDK, or the Jest sheet stub)
        // must finish inserting the projected `[crdAlign]` content before it can be found.
        queueMicrotask(() => this.scrollAlignIntoView());
      }
    });
  }

  private scrollAlignIntoView(): void {
    // Pre-existing build-only defect (CRD-T-1): `querySelector<HTMLElement>(...)` type-checks fine
    // under Jest's isolated-module transpile but fails the full `ng build` program with TS2347
    // ("untyped function calls may not accept type arguments") — a plain cast sidesteps it without
    // changing behaviour. Fixed here only because CRD-T-4's DoD requires a clean `npm run build`.
    const align = this.elementRef.nativeElement.querySelector('[crdAlign]') as HTMLElement | null;
    align?.scrollIntoView({ block: 'nearest' });
  }

  private buildDashReviewRow(): ContributionRequestDrawerReviewField[] {
    const dash = this.copy.dashValue;
    const labels = this.copy.fieldLabels;
    return [
      { label: labels.level, value: dash },
      { label: labels.highLevelOutputOutcome, value: dash },
      { label: labels.outcomeStatement, value: dash },
      { label: labels.indicatorTypology, value: dash },
      { label: labels.unitOfMeasurement, value: dash },
      { label: labels.target, value: dash, mono: true },
      { label: labels.contributionTarget, value: dash, mono: true }
    ];
  }

  isExpanded(tableIndex: number, rowIndex: number): boolean {
    return this.expandedCells().has(`${tableIndex}-${rowIndex}`);
  }

  toggleExpand(tableIndex: number, rowIndex: number): void {
    const key = `${tableIndex}-${rowIndex}`;
    this.expandedCells.update(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  /** Whether a cell's value is long enough to need the clamp + "Show more" toggle. */
  needsMore(value: string): boolean {
    return typeof value === 'string' && value.trim().length > CLAMP_THRESHOLD_CHARS;
  }

  /** CRD-R-8: ids of every reason line describing why Accept is disabled, for `aria-describedby`. */
  acceptDescribedBy(): string | null {
    const ids: string[] = [];
    if (this.blockedReason()) ids.push('crd-blocked-reason');
    if (this.acceptHelper()) ids.push('crd-accept-helper');
    return ids.length ? ids.join(' ') : null;
  }

  /** CRD-R-8: Decline is only ever described by the blocked reason, never the accept helper. */
  declineDescribedBy(): string | null {
    return this.blockedReason() ? 'crd-blocked-reason' : null;
  }

  /** Combined disabled state for the `decide`-mode Accept button (input + Blocked, CRD-R-8). */
  isAcceptDisabled(): boolean {
    return this.acceptDisabled() || !!this.blockedReason();
  }

  /** Combined disabled state for the `decide`-mode Decline button (input + Blocked, CRD-R-8). */
  isDeclineDisabled(): boolean {
    return this.declineDisabled() || !!this.blockedReason();
  }

  /**
   * Falsifier guard (CRD-T-2): `[disabled]` on `button[hlmBtn]` binds through `BrnButton`'s
   * `hostDirectives`-forwarded input, which under the shared Jest Brain stub
   * (`tests/mocks/spartanBrainMock.ts`) never reaches the native `disabled` DOM attribute — that
   * stub is out of this task's scope. This guard makes "Accept/Decline disabled" provably true
   * regardless: a disabled click never emits, in the real app (defense in depth alongside the real
   * `BrnButton` host binding) and under Jest alike.
   */
  onAcceptActivate(): void {
    if (this.isAcceptDisabled()) return;
    this.acceptClicked.emit();
  }

  onDeclineActivate(): void {
    if (this.isDeclineDisabled()) return;
    this.declineClicked.emit();
  }

  onConfirmDeclineActivate(): void {
    if (this.declineDisabled()) return;
    this.declineConfirmed.emit();
  }
}
