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
  /**
   * PSR-T-9 (design.md §6.1 "Bilateral contributor request", PSR-R-10): a bold `font-mono` code
   * rendered right after `lead` — the bilateral-contributor sentence's leading `{owner sp}`, which
   * `lead`/`requesterCode` alone can't express (`lead` is plain text, `requesterCode` always forces
   * the "from" prefix). Absent/undefined renders nothing — byte-identical to before (CRD zero-touch).
   */
  leadCode?: string;
  /**
   * PSR-T-9 (design.md §6.1/§6.2, PSR-R-11 "showing … the Creating Center"): free text rendered
   * after `resultTitle` — the bilateral-contributor sentence's "on behalf of {center}" tail, which
   * has nowhere to go in the pre-existing `lead … resultTitle` shape. Absent/undefined renders
   * nothing (CRD zero-touch).
   */
  suffix?: string;
}

/** design.md §6.2 `reviewRows`: one "Where it contributes" table = an array of these, 7 per table. */
export interface ContributionRequestDrawerReviewField {
  label: string;
  value: string;
  mono?: boolean;
}

export type ContributionRequestDrawerMode = 'decide' | 'confirm-decline' | 'view';

/**
 * NOTIF-T-4: which stream the row being viewed came from. Drives the per-source field adapter
 * (design.md §6.2's table) — `resultType` and `reportingCenter` are only ever considered for a
 * `'request'`-source row, because `notification/updates` rows don't return either (`NOTIF-P-2`).
 */
export type ContributionRequestDrawerViewSource = 'request' | 'update';

/**
 * NOTIF-T-4 `view` mode: the raw-ish fields `notification-item` resolves for the row being viewed.
 * Every field is optional; the drawer's per-source field adapter (`viewMetadataRows`) omits a field
 * from the grid whenever it is missing/empty OR not applicable to `source` — it never renders a
 * blank placeholder (NOTIF-R-5, NOTIF-AC-7).
 */
export interface ContributionRequestDrawerViewFields {
  source: ContributionRequestDrawerViewSource;
  /**
   * NOTIF-T-14 (closes the NOTIF-R-5 gap left by NOTIF-T-12's removal of the row-level status
   * badge): the row's decision/info status ("Needs your decision" / "For your information"),
   * sourced from `notification-item`'s existing `rowStatusLabel` getter. Rendered first in
   * `viewMetadataRows` — the most important thing to know at a glance.
   */
  status?: string | null;
  /**
   * PSR-T-9 (PSR-R-11 "showing the request kind"): a human label for the request's kind (e.g.
   * "Primary program request" / "Contributor request" / "Contribution request"). `notification-item`
   * (wired by `PSR-T-8`) resolves the actual value; this component never invents one — absent/blank
   * omits the row like every other field here (NOTIF-R-5/NOTIF-AC-7).
   */
  requestKind?: string | null;
  resultType?: string | null;
  phase?: string | null;
  primaryProgram?: string | null;
  reportingCenter?: string | null;
  submittedBy?: string | null;
}

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
 *
 * NOTIF-T-4 added a third, additive `mode: 'view'` (design.md §6.2, `NOTIF-DD-2`): the header and
 * RESULT card are reused unchanged, "Where it contributes" renders only when `reviewRows` is
 * non-empty (no dash-fallback placeholder in `view` mode), a new metadata grid renders from
 * `viewFields`/`viewMetadataRows`, and the footer is omitted entirely — no Accept/Decline, no
 * confirm-decline. Nothing about the `decide`/`confirm-decline` branches changed.
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

  /**
   * PSR-T-9 (design.md §6.2 "decide mode reads the kind ... Accept label"): the `decide`-footer
   * Accept button text. `null` (the default) keeps the pre-existing `copy.footer.acceptContribution`
   * label — CRD zero-touch: no caller that leaves this unset sees any change. The caller (kept
   * minimal here, fully wired by `PSR-T-8`) is the one that knows the row's kind and picks the
   * right string (`copy.footer.acceptContribution` / `acceptAsPrimary` / plain "Accept"); this
   * component stays presentational and never derives it itself (CRD-R-11 "same actions as the row").
   */
  readonly acceptLabel = input<string | null>(null);

  /**
   * PSR-T-9 (design.md §6.2 "No ToC 'Align' projection for primary requests"): gates the projected
   * `[crdAlign]` slot. Defaults to `true` (today's behaviour, unchanged) — the caller sets it to
   * `false` for a primary request so the slot never renders even if something is projected into it,
   * regardless of `isBilateralResult`/`tocInitiative` seeding upstream (defense in depth, CRD-R-11).
   */
  readonly showAlignSlot = input(true);

  /** CRD-R-10 "Bilateral row accept": scroll the projected `[crdAlign]` slot into view after open. */
  readonly focusAlign = input(false);

  /** NOTIF-T-4 `view` mode: the row's per-source fields for the metadata grid (design.md §6.2). */
  readonly viewFields = input<ContributionRequestDrawerViewFields | null>(null);

  /**
   * NOTIF-T-4: per-source field adapter (design.md §6.2 table). Builds the `view`-mode metadata
   * grid rows from `viewFields()`, in a fixed order — `status` (NOTIF-T-14) → Result type → Phase →
   * Primary program → Reporting center → Submitted by — skipping any field that is absent/empty on
   * the given row, and skipping `resultType`/`reportingCenter` entirely for an `'update'`-source
   * row regardless of what `notification-item` passes in (NOTIF-P-2: `notification/updates` never
   * returns either). Never renders a label next to a blank/dash value (NOTIF-R-5, NOTIF-AC-7).
   */
  readonly viewMetadataRows = computed<ContributionRequestDrawerReviewField[]>(() => {
    const fields = this.viewFields();
    if (!fields) return [];

    const labels = this.copy.viewFieldLabels;
    const rows: ContributionRequestDrawerReviewField[] = [];
    const push = (label: string, value?: string | null) => {
      // NOTIF-AC-7 "no blank placeholder": trim before the emptiness check (mirrors `needsMore()`'s
      // `value.trim()` above) so a whitespace-only value (e.g. `' '`) is treated as absent instead
      // of rendering a visually-blank row.
      if (value !== undefined && value !== null && value.trim() !== '') {
        rows.push({ label, value });
      }
    };

    // NOTIF-T-14: status is first — the most important thing to know at a glance (NOTIF-R-5).
    push(labels.status, fields.status);
    // PSR-T-9 (PSR-R-11): the request kind, right after status — both are "what is this" context,
    // shown before the "about the result" fields below.
    push(labels.requestKind, fields.requestKind);
    if (fields.source === 'request') {
      push(labels.resultType, fields.resultType);
    }
    push(labels.phase, fields.phase);
    push(labels.primaryProgram, fields.primaryProgram);
    if (fields.source === 'request') {
      push(labels.reportingCenter, fields.reportingCenter);
    }
    push(labels.submittedBy, fields.submittedBy);

    return rows;
  });

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
