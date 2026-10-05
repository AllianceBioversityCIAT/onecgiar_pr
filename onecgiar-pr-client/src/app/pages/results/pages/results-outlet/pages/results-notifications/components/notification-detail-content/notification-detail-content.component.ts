// @akili-spec notifications/detail-side-panel (DSP-T-3, DSP-T-4)
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan/button';
import { HlmBadgeImports } from '@spartan/badge';
import { HlmSkeletonImports } from '@spartan/skeleton';
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
 * DSP-T-4 (design.md §6.2 "chips"): one chip in the header's chips row — status, funding, level ·
 * type, date, in the fixed order `notification-item`'s `chips()` builds them. `outlined` is set
 * only for the funding chip (design.md §6.3 "the funding pill is outlined").
 */
export interface ContributionRequestDrawerChip {
  text: string;
  outlined?: boolean;
}

/**
 * DSP-T-4 (design.md §6.2 "Field sources" / §6.3 "RESULT card", DD-6/DD-7): one cell of the RESULT
 * card's 6-field grid. `notification-item`'s `resultGrid()` always returns exactly 6 of these, in
 * a fixed order, with `copy.dashValue` as the value when the source field is empty — DD-6
 * supersedes NOTIF-R-5/NOTIF-AC-7 for THIS grid only (the label is never omitted). `loading` is set
 * only on the Contributing-programs cell while the approval chain is still loading (design.md §6.2
 * "skeleton while loading").
 */
export interface ContributionRequestDrawerGridField {
  label: string;
  value: string;
  mono?: boolean;
  loading?: boolean;
}

/** A cell's long value is clamped past this length (design.md §6.3 `line-clamp-3`, hard rule #16). */
const CLAMP_THRESHOLD_CHARS = 180;

/**
 * DSP-T-3 (design.md §2.1/§6.2, DD-3): the drawer's presentational BODY — header sentence, RESULT
 * card, "Where it contributes"/`view`-mode metadata, the `[crdAlign]` projection slot, and the
 * `decide`/`confirm-decline` footer. Relocated out of `contribution-request-drawer` (now a thin
 * sheet shell, see its own `CLAUDE.md`) so the SAME template instance can be rendered either inside
 * the drawer (< 1280 px, via `ngTemplateOutlet`) or portaled into the wide-screen `<aside>` (a later
 * task) without duplicating any of this markup/logic.
 *
 * No API calls, no global services — `notification-item` still owns all decision state and feeds
 * every input (CRD-R-1..R-11, unchanged by this move). Uses a plain `h2[id]` + a hand-built close
 * `button` instead of `hlmSheetTitle`/`hlmSheetDescription`/`hlmSheetClose` (DSP-P-9: those
 * directives inject the Brn dialog/sheet ref via `hostDirectives`, so they only resolve inside a
 * component registered as the sheet's OWN portal content — not guaranteed for a component merely
 * projected into it, and never true at all once the same template is portaled into the wide-screen
 * `<aside>`, which is not a dialog). The shell instead sets `aria-labelledby` (pointed at `headingId`)
 * directly on its own `hlm-sheet-content`.
 */
@Component({
  selector: 'app-notification-detail-content',
  imports: [HlmButton, NgIcon, ...HlmBadgeImports, ...HlmSkeletonImports],
  providers: [provideIcons({ lucideLoaderCircle, lucideX })],
  templateUrl: './notification-detail-content.component.html',
  styleUrl: './notification-detail-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDetailContentComponent {
  readonly copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /**
   * DSP-T-3 (DD-3 "the shell sets aria-labelledby to the content heading id"): the id this
   * component's own `h2` renders — the caller (`notification-item`) must pass a value unique per
   * row (e.g. derived from the notification key or a per-instance counter) so several open rows
   * never collide on the same id, and must pass the SAME value as the shell's `labelledBy` input.
   */
  readonly headingId = input.required<string>();

  /** Footer state: the plain decide footer, or the inline decline confirmation (CRD-R-7). */
  readonly mode = input<ContributionRequestDrawerMode>('decide');

  /**
   * DSP-T-4 (design.md §6.2 "title"): the header's `h2` text — request kind / update type label, or
   * the generic fallback `notification-item`'s `detailTitle()` falls back to. Empty string (the
   * default) falls back to `copy.title` in the template, same as every pre-existing caller that
   * never set a title saw before this task.
   */
  readonly title = input('');

  /** DSP-T-4 (design.md §6.2 "chips"): the header's chips row, in the fixed order the caller builds. */
  readonly chips = input<ContributionRequestDrawerChip[]>([]);

  /**
   * DSP-T-4 (design.md §6.2/§6.3 "RESULT card", DD-6/DD-7): the RESULT card's 6-field grid.
   * Supersedes `viewFields`/`viewMetadataRows` (NOTIF-T-4/T-14) — this grid now renders in every
   * mode, not just `view`, and a missing field shows `copy.dashValue` instead of being omitted.
   */
  readonly resultGrid = input<ContributionRequestDrawerGridField[]>([]);

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

  /**
   * DSP-T-3: fires on the component's own ✕ close button. The shell (`contribution-request-drawer`)
   * keeps its own, separate `closed` output for the sheet's native scrim/Escape/outside-click
   * dismissal — the caller (`notification-item`) wires BOTH to the same handler. This component
   * emits and does nothing else (CRD-R-9, unchanged).
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
      if (this.focusAlign()) {
        // Deferred a tick: the caller's own open/portal effects (real CDK, or the Jest sheet stub)
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
