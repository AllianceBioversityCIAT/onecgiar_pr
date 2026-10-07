import { BILATERAL_REJECTION_NOTICE_COPY } from '../../../../../../../../internationalization/bilateral-rejection-notice.copy';
import {
  Component,
  ElementRef,
  Injector,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TemplatePortal } from '@angular/cdk/portal';
import { formatDate } from '@angular/common';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ResultLevelService } from '../../../../../result-creator/services/result-level.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { BilateralResultsService } from '../../../../../../../result-framework-reporting/pages/bilateral-review/services/bilateral-results.service';
import { NotificationNavigationService } from '../../../../../../../../shared/services/notification-navigation.service';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';
import {
  getAiJobNotificationParts,
  getResultNotificationTextParts,
  resolveNotificationType,
  isBilateralReviewNotification,
  parseCenterReportedProjectText,
  NotificationType,
  getRejectionReasonLine,
  type AiJobNotificationParts,
  type NotificationTextParts
} from '../../../../../../../../shared/constants/notification-type.constants';
import { NOTIFICATION_CENTER_TAGGED_COPY } from '../../../../../../../../internationalization/notification-center-tagged.copy';
import { NOTIFICATION_PROJECT_TAGGED_COPY } from '../../../../../../../../internationalization/notification-project-tagged.copy';
import { BILATERAL_DECISION_NOTICE_COPY } from '../../../../../../../../internationalization/bilateral-decision-notice.copy';
// DSP-T-3 (notifications/detail-side-panel): this type moved with the body/footer logic it
// describes, out of the (now shell-only) drawer, into the new content component.
import type { ContributionRequestDrawerMode } from '../notification-detail-content/notification-detail-content.component';
// DSP-T-2 (notifications/detail-side-panel): the approval-chain contract, mirrored from the server DTO.
import type { ApprovalChainDto } from '../../../../../../../../shared/services/api/results-api.service';
// BELL-T-1 (notifications/bell-quick-inbox, BELL-DD-2): the shared decision helper — `acceptOrReject`
// and `invalidateRequest()` below delegate the body/eligibility logic to it.
import { acceptLabelFor, buildDecisionBody, classifyAccept, isDecidable, primaryReviewTarget } from '../../utils/request-decision';
// @akili-spec notifications/detail-side-panel (DSP-T-7, design.md §2.2/§6.2): the page-scoped
// coordinator that decides whether THIS row's detail template renders docked (wide) or in the
// drawer (narrow), and which row "owns" it when only one may be open at a time.
import { NotificationDetailPanelService } from '../../services/notification-detail-panel.service';

/**
 * DSP-T-4 (design.md §6.2 "chips"): mirrors `ContributionRequestDrawerChip` structurally (same
 * precedent as `DrawerHeaderParts`/`ContributionRequestDrawerHeaderParts` below — this file builds
 * the raw values, the content component only renders them).
 */
export interface NotificationDetailChip {
  text: string;
  outlined?: boolean;
  /**
   * DSP-T-9 Q-2 (design.md §6.3 "Chips row", user-approved 2026-10-05): only the status and funding
   * chips render as pills; level · type and the date render as plain muted text. `true` for status
   * and funding only — set at the one place chips are built, below.
   */
  pill?: boolean;
}

/**
 * DSP-T-4 (design.md §6.2/§6.3 "RESULT card", DD-6/DD-7): mirrors `ContributionRequestDrawerGridField`.
 */
export interface NotificationDetailGridField {
  label: string;
  value: string;
  mono?: boolean;
  loading?: boolean;
}

/**
 * DSP-T-4 (design.md §6.2 "the date `activityDate` formatted `dd MMM yyyy`"): a pure formatter —
 * no DI (Angular's `formatDate` is a plain function, not the `DatePipe` service), since this feeds
 * a plain string into `chips()`, not a template binding. Returns `null` for anything that doesn't
 * parse to a valid date, so a malformed/missing `created_date` omits the chip entirely instead of
 * rendering "Invalid Date".
 *
 * Leader addition (attempt 2): replaces a hand-rolled `MONTH_ABBREVIATIONS` table — new English
 * strings do not belong outside `contribution-request-drawer.copy.ts`, and `formatDate` already
 * owns this formatting job.
 */
function formatActivityDate(raw: unknown): string | null {
  if (!raw) return null;
  const date = new Date(raw as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return formatDate(date, 'dd MMM yyyy', 'en-US');
}

/**
 * DSP-T-2 (design.md §6.2 DD-10): the row's own approval-chain fetch state — `loading` while the
 * GET is in flight (or has not started), `ok` with the envelope's `response` once it resolves,
 * `error` on an HTTP failure. T-5 wires this into `notification-detail-content`'s `chain` input;
 * this component only owns the fetch/state/stale-guard (DSP-R-8 "Loading and failure" state side).
 */
export type ApprovalChainState = { status: 'loading' } | { status: 'ok'; data: ApprovalChainDto } | { status: 'error' };

// DSP-T-3 (DD-3 "unique id per row"): a per-instance counter, not derived from the notification key,
// so the drawer content's `h2[id]` (and the shell's matching `aria-labelledby`) never collides even
// across unrelated component instances created within the same test run or page lifetime.
let nextDetailHeadingId = 0;

// P2-3085: shape of each ToC contribution review entry (backend contract, P2-3086).
export interface TocContributionReview {
  level?: string;
  outcome_label?: string;
  outcome_statement?: string;
  // P2-3204: the backend sends the TOC `type_name` under the legacy alias `statement` and the internal
  // sentinel (`type_value`, literally "custom" for custom KPIs) as `indicator_typology`. The descriptive
  // name is what the user reads in the TOC "Type" column, so it takes precedence. Not to be confused with
  // `outcome_statement`, which comes from a different column.
  statement?: string;
  indicator_typology?: string;
  unit_of_measurement?: string;
  target?: string | number;
  contribution_target?: string | number;
  toc_result_id?: number;
  toc_results_indicator_id?: number;
  planned_result?: boolean;
}

// CRD-T-3: pre-built pieces for the drawer header sentence (design.md §6.2). Every fixed English
// word for it comes from `CONTRIBUTION_REQUEST_DRAWER_COPY.header` (see `drawerHeader()` below).
export interface DrawerHeaderParts {
  lead: string;
  requesterCode: string;
  verb: string;
  responderCode?: string;
  tail: string;
  resultCode: string;
  resultTitle: string;
  // PSR-T-8/T-9: mirror `ContributionRequestDrawerHeaderParts` (bilateral-contributor sentence).
  leadCode?: string;
  suffix?: string;
}

// CRD-T-3: one row of the "Where it contributes" table (design.md §6.2 `reviewRows`).
export interface DrawerReviewField {
  label: string;
  value: string;
  mono?: boolean;
}

// CRD-T-1 landed the centralized copy file (CONTRIBUTION_REQUEST_DRAWER_COPY); `drawerHeader()`
// below reads the drawer header SENTENCE words ("has asked", "to contribute to result", …) directly
// from its `header` section — the row's own separate, unrelated sentence ("has requested",
// "submitted by", …) stays hardcoded English in the template, matching this component's own
// pre-existing precedent there.

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
  standalone: false
})
export class NotificationItemComponent implements OnInit, OnChanges, OnDestroy {
  @Input() notification: any;
  @Input() isSent: boolean;
  @Output() requestEvent = new EventEmitter<any>();

  /**
   * @akili-spec notifications/bell-quick-inbox (BELL-T-5, BELL-DD-4): set by the inbox on the ONE row a
   * bell hand-off targets. Once the row is initialized and this is set, it replays the row's own
   * handler (`onAcceptContribution()` / `onDeclineClick()`) exactly once, then emits
   * `autoActionConsumed` so the inbox can clear the URL params.
   */
  @Input() autoAction: 'accept' | 'decline' | null = null;
  @Output() autoActionConsumed = new EventEmitter<void>();
  private autoActionRan = false;
  private initialized = false;
  requestingAccept = false;
  requestingReject = false;

  /**
   * CRD-T-7 (pivot, CRD-DD-10): the row's popup flow, restored from `HEAD` alongside the drawer.
   * `showConfirmRejectDialog` backs the row's Decline button; `showTocPromptDialog` /
   * `showTocMappingDialog` back the row's bilateral Accept ("Map to your Theory of Change?" prompt,
   * then the mapping step opened by `openTocMappingStep()`). `openDrawer()` resets all three to
   * false, and nothing reachable from the drawer sets any of them (CRD-R-11 amended).
   */
  showConfirmRejectDialog = signal(false);
  showTocPromptDialog = signal(false);
  showTocMappingDialog = signal(false);
  /**
   * PDR-T-4 (design.md §8.2): a primary request's Decline — row button or drawer footer — opens
   * THIS dialog instead of `showConfirmRejectDialog`. Mutually exclusive with the other three
   * popups and the drawer, same as them (`openDrawer()` resets it to `false` alongside the rest).
   */
  showPrimaryDeclineDialog = signal(false);
  /**
   * PDR-T-4 (design.md §8.2 "a 400 keeps the dialog open"): set in `submitPrimaryDecline()`'s own
   * `error` handler, read in that same method's `finalize` so it can skip the unconditional
   * close/reset it would otherwise run for every other outcome. Never read outside that one pair of
   * callbacks.
   */
  private keepPrimaryDeclineDialogOpen = false;

  /** CRD-T-4: centralized copy for the row's accessible name and the drawer's Align section. */
  readonly copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

  /**
   * P2-3187 AC4 (Option A, decided 2026-09-04): the optional ToC step for bilateral requests, now
   * rendered inline in the drawer's "Align to your Theory of Change" section (CRD-R-5) instead of
   * the removed prompt/mapping `app-pr-dialog`s (CRD-T-4, CRD-R-11). Nothing here reopens
   * `<app-share-request-modal>` (see the trap in ./CLAUDE.md).
   */
  /** Remount toggle for `app-cp-multiple-wps`, same trick as the review drawer's `tocConsumed`. */
  tocMappingConsumed = signal(true);
  /** The contributor's ToC selection, shaped exactly like the review drawer's `tocInitiative`. */
  tocInitiative: any = null;

  /**
   * State for `app-contribution-request-drawer` (design.md §6.2), the row's single overlay
   * (CRD-T-4 removed the three legacy popups). `drawerMode` is the footer state; `drawerFocusAlign`
   * tells the drawer to scroll the projected Align slot into view right after open (row Accept on a
   * bilateral request, CRD-R-10).
   */
  drawerOpen = signal(false);
  drawerMode = signal<ContributionRequestDrawerMode>('decide');
  drawerFocusAlign = signal(false);
  /**
   * DSP-T-3 (DD-3): the id this row's drawer content heading (`h2[id]`) renders, and the value the
   * shell's `[labelledBy]` must be passed — both wired to this SAME property so the sheet panel
   * always has an accessible name pointed at an id that actually exists (falsifier: "the sheet
   * panel has no accessible name").
   */
  readonly drawerHeadingId = `crd-heading-${nextDetailHeadingId++}`;
  /** CRD-DD-3: the global ToC hydration is deferred from "open" to "first answer". */
  private tocHydrated = false;

  /**
   * @akili-spec notifications/detail-side-panel
   * DSP-T-2 (DSP-R-8 "Loading and failure" state side, DD-10 amended): the row's approval-chain
   * fetch state. Starts on every `openDrawer()` call (any mode) only — a successful decision no
   * longer dispatches its own fetch (the pivot: `closeDrawer()` runs in the same tick via
   * `finalize`, which would always supersede that fetch's token before the response could land, so
   * it could never be displayed). The panel closes instead, and the next `openDrawer()` fetches
   * fresh. `retryChain()` is the drawer's Retry action.
   */
  approvalChain = signal<ApprovalChainState>({ status: 'loading' });
  /**
   * DSP-T-2: incremented on every fetch dispatch AND on close, so a response that lands for a
   * superseded request — the row reopened (a new fetch wins), or closed in the meantime — is
   * ignored instead of overwriting `approvalChain` (falsifier: "a response arriving after close
   * overwrites the state").
   */
  private chainRequestToken = 0;

  private readonly notificationNavigation = inject(NotificationNavigationService);
  private readonly resultsNotificationsSE = inject(ResultsNotificationsService);

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-7)
   * `panel` is read from the template (`[open]="drawerOpen() && !panel.isWide()"`) so it is not
   * `private` — a private member fails `ng build`'s strict template type-checking. `vcr`/`injector`
   * are implementation details only this class needs.
   */
  readonly panel = inject(NotificationDetailPanelService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly injector = inject(Injector);

  /** DSP-T-7 (design.md §2.1 "Create the portal at open time"): this row's own `#detailTpl`. */
  private readonly detailTemplateRef = viewChild<TemplateRef<unknown>>('detailTpl');
  /** DSP-T-7 (design.md §6.2 Focus "On close, the row focuses its own host row element"). */
  private readonly rowInteractiveRef = viewChild<ElementRef<HTMLElement>>('rowInteractive');

  /**
   * DSP-T-7 (design.md §2.1 "Pick a key from the notification's own id fields"): identifies the
   * NOTIFICATION, not this component instance — rows are reused under `track $index`/the same
   * instance can be rebound to a different notification (CRD-P-6, the DD-6 trap). Mirrors the
   * page's own `trackNotificationKey()` exactly (`results-notifications.component.ts`) so the same
   * notification always resolves to the same key whether the page or the row computes it — `origin`
   * disambiguates id spaces that otherwise collide (`share_result_request_id` vs `notification_id`).
   */
  get notificationKey(): string {
    const n = this.notification;
    const id = n?.share_result_request_id ?? n?.notification_id;
    return `${n?.origin ?? ''}-${id ?? ''}`;
  }

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    private router: Router,
    private bilateralResultsService: BilateralResultsService
  ) {
    // DSP-T-7 (design.md §2.2 step 5, DSP-R-2): another row took over the panel while this one was
    // still open — discard this row's in-progress state. Never fires for the row that JUST opened
    // itself: by the time this runs, `panel.open()` has already set `activeKey` to THIS row's own
    // key (see `openDrawer()`), so the two reads below agree and the condition is false.
    effect(() => {
      const activeKey = this.panel.activeKey();
      if (this.drawerOpen() && activeKey !== this.notificationKey) {
        this.resetForTakeover();
      }
    });

    // DSP-T-7 (design.md §6.2 Focus "docked open -> focus the content heading"): deferred to the
    // render that follows the portal's own insertion into the aside's `cdkPortalOutlet` (same
    // one-render deferral `notification-detail-content`'s `focusAlign` effect already relies on).
    effect(() => {
      const isActiveAndOpen = this.drawerOpen() && this.panel.activeKey() === this.notificationKey;
      if (isActiveAndOpen && this.panel.isWide()) {
        afterNextRender(() => this.focusContentHeading(), { injector: this.injector });
      }
    });

    // DSP-T-7 (forward pointer from DSP-T-6, design.md §6.2 "closedByUser$"): a close that did not
    // go through this row's own ✕/toggle (today: the docked aside's Escape handler). Routed through
    // `closeDrawer()` so the row still resets state and restores focus to itself, exactly like a ✕
    // click — only the row that currently owns the panel reacts.
    this.panel.closedByUser$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.drawerOpen() && this.panel.activeKey() === this.notificationKey) {
        this.closeDrawer();
      }
    });
  }

  ngOnInit(): void {
    this.initialized = true;
    this.runAutoAction();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['autoAction'];
    if (!change) return;
    // The inbox clears the input once it consumed a hand-off; that re-arms this instance, so a later
    // hand-off for the same row (cancel the modal, click the bell again) replays. Re-setting the input
    // WITHOUT it having been cleared in between stays a single run.
    if (!change.currentValue) {
      this.autoActionRan = false;
      return;
    }
    if (this.initialized) this.runAutoAction();
  }

  /**
   * BELL-T-5: runs at most once per instance. Only a still-pending row opens anything (a request
   * decided meanwhile must not pop a dialog); either way the param is reported consumed. The emit is
   * deferred a microtask so the parent clearing its binding does not land inside this change-detection
   * pass (NG0100).
   */
  private runAutoAction(): void {
    const action = this.autoAction;
    if (!action || this.autoActionRan) return;
    this.autoActionRan = true;

    if (this.isPending) {
      // BELL-T-7: a link never records a decision. Accept replays only when it opens a step (prompt /
      // legacy modal); a one-click row would PATCH straight away. Decline only ever opens a dialog.
      if (action === 'accept') {
        if (classifyAccept(this.notification) === 'step') this.onAcceptContribution();
        // BELL-T-9: a ToC-carried contribution opens the row's detail drawer, which renders the carried
        // mapping (`tocReview`) and whose own Accept (`onDrawerAccept`) is the user's click. Opening
        // never PATCHes. A primary request only consumes the param (T-7).
        else if (this.notification?.is_map_to_toc && !this.isPrimaryRequest) this.openDrawer('details');
      } else if (action === 'decline' && !this.isPrimaryRequest) this.onDeclineClick();
      // PRA-R-3: a primary request has no Decline, so a `?action=decline` link only consumes the param.
    }

    queueMicrotask(() => this.autoActionConsumed.emit());
  }

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-7)
   * Falsifier "opening B leaves A's drawerMode === 'confirm-decline'": mirrors `closeDrawer()`'s
   * state reset but never calls `panel.close(key)` (the active key has already moved to the row
   * that took over — a stale `close()` would be a safe no-op anyway, see the service's own guard)
   * and never moves focus (this row did not choose to close; only a user-initiated close/toggle
   * restores focus — see `closeDrawer()`).
   */
  private resetForTakeover(): void {
    this.drawerOpen.set(false);
    this.drawerMode.set('decide');
    this.drawerFocusAlign.set(false);
    this.tocHydrated = false;
    this.tocInitiative = null;
    // DSP-T-2/T-7: invalidate any in-flight chain fetch for the row that just lost ownership.
    this.chainRequestToken++;
  }

  private focusContentHeading(): void {
    document.getElementById(this.drawerHeadingId)?.focus({ preventScroll: true });
  }

  private focusRowInteractive(): void {
    this.rowInteractiveRef()?.nativeElement?.focus({ preventScroll: true });
  }

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-7)
   * Falsifier "destroying A's component while it is active leaves panel.portal() non-null": a row
   * can be torn down (filtered/tab-switched/paged away, `DSP-P-8`) without ever calling
   * `closeDrawer()` first — `panel.close()` is a no-op unless THIS row's key is still the active one,
   * so an already-superseded row's destroy never clears a different, now-active row.
   */
  ngOnDestroy(): void {
    this.panel.close(this.notificationKey);
  }

  get isBilateralResult() {
    return this.notification?.obj_result?.source_name === 'W3/Bilaterals';
  }

  /**
   * PSR-T-8 (design.md §6.1 "Primary request" row, `PSR-R-9`): a pending-or-resolved ask for an SP
   * to become the result's primary Science Program. Server payload contract (PSR-T-4/T-5):
   * `request_type: 'primary'` (default `'contribution'` for every pre-existing/legacy row, so this
   * is false for anything this spec didn't touch). Never true for an `isUpdateSource` row (those
   * have no `request_type` at all — they're the 3 Center notices, handled entirely by
   * `notification-type.constants.ts`/`updateTextParts`, not by this getter).
   */
  get isPrimaryRequest(): boolean {
    return !this.isUpdateSource && this.notification?.request_type === 'primary';
  }

  /**
   * PSR-T-8 (design.md §6.1 "Bilateral contributor request" row, `PSR-R-10`): every bilateral
   * contribution request is this variant now — `request_type='contribution'` (the default) AND
   * `source_name: 'W3/Bilaterals'`. This getter replaces the old pre-spec generic "any bilateral
   * row" branch outright: there is no longer a third, un-kinded bilateral row (`PSR-DD-1`..`10`
   * give every bilateral request a kind). W1/W2 rows are untouched (`isBilateralResult` is false
   * for them, so this stays false too, `PSR-DD-10`).
   */
  get isBilateralContributorRequest(): boolean {
    return this.isBilateralResult && !this.isPrimaryRequest;
  }

  /**
   * PSR-T-8 (PSR-R-9 "missing-acronym clause"): the Creating Center's label for the primary/
   * contributor sentences — `creating_center.acronym ?? creating_center.name`, falling back to
   * `copy.notificationItem.unknownCenterFallback` ("the Center") when BOTH are missing so the
   * sentence never renders an empty name or "()" (the scenario's own wording).
   */
  get creatingCenterLabel(): string {
    const center = this.notification?.creating_center;
    const acronym = typeof center?.acronym === 'string' ? center.acronym.trim() : '';
    const name = typeof center?.name === 'string' ? center.name.trim() : '';
    return acronym || name || this.copy.notificationItem.unknownCenterFallback;
  }

  /**
   * PSR-T-8: the primary SP's code for a bilateral CONTRIBUTOR row's sentence ("**{owner sp}**, as
   * primary Science Program, has tagged …") — server field `owner_program_code` (design.md §4,
   * "bilateral contribution rows only"). Distinct from `responderCode` below, which resolves the
   * CONTRIBUTOR SP for this same row kind.
   */
  get ownerProgramCode(): string {
    return this.notification?.owner_program_code ?? '';
  }

  /**
   * PSR-T-8 (PSR-R-11 "showing the request kind"): single source for the row's own type chip
   * (`rowTypeChipLabel` below) AND the detail panel's title (`detailTitle()`, DSP-T-4 — moved from
   * the retired `drawerViewFields()`'s `requestKind` metadata field), so the two can never say
   * something different about the same request (the task brief's own wording). Only meaningful for
   * a `source:'request'` row — an `isUpdateSource` row's chip/title never reads this getter (see
   * the callers).
   */
  get requestKindLabel(): string {
    const labels = this.copy.notificationItem;
    if (this.isPrimaryRequest) return labels.primaryRequestChip;
    if (this.isBilateralContributorRequest) return labels.contributorRequestChip;
    return labels.contributionRequestChip;
  }

  /** CRD-T-3: gates row interactivity for the drawer (CRD-R-1, wired in CRD-T-4). Unchanged by NOTIF-T-5 (CRD-DD-10). */
  get isPending(): boolean {
    return this.notification?.request_status_id === 1 && !this.isSent;
  }

  /** NOTIF-T-5: true for a row tagged by `buildUnifiedList()` (NOTIF-T-1) as coming from the Updates stream. */
  get isUpdateSource(): boolean {
    return this.notification?.source === 'update';
  }

  /**
   * NOTIF-T-5 (design.md §2.2's sequence table): which drawer mode a click on THIS row opens.
   *   - source:'request', pending Received (`isPending`) → 'decide' — UNCHANGED, CRD-DD-10.
   *   - source:'request', resolved Received or any Sent row → 'view' — NEW.
   *   - source:'update' → 'view' — NEW (Updates rows had no drawer entry point at all before).
   */
  get rowMode(): 'decide' | 'view' {
    if (this.isUpdateSource) return 'view';
    return this.isPending ? 'decide' : 'view';
  }

  /** NOTIF-AC-2: row accessible name, phrased per the mode the click actually opens. */
  get rowAriaLabel(): string {
    const aiJob = this.aiJobParts;
    if (aiJob) return aiJob.message;
    const resultCode = this.notification?.obj_result?.result_code;
    return this.rowMode === 'decide' ? this.copy.rowAriaLabel(resultCode) : this.copy.notificationItem.rowAriaLabelView(resultCode);
  }

  /**
   * NOTIF-R-3 / NOTIF-DD-3: a single "Contribution request" chip for every `source:'request'` row
   * (no sub-typing), the resolved `NotificationType` label for every `source:'update'` row. Reuses
   * `resolveNotificationType()` — never invents a label; an unresolved type omits the chip entirely
   * (same "never fabricate" guarantee as `NOTIF-AC-7`).
   */
  get rowTypeChipLabel(): string | null {
    if (this.isUpdateSource) {
      // WCT-T-5 (`w1w2-center-tagged`, WCT-R-6): the one update type whose chip reads a friendlier
      // copy string instead of the raw `NotificationType` value. Every other update type is
      // unaffected — still the raw resolved name.
      if (resolveNotificationType(this.notification) === NotificationType.RESULT_CENTER_TAGGED) {
        return NOTIFICATION_CENTER_TAGGED_COPY.chipLabel;
      }
      // WPT-T-4 (`w1w2-project-tagged`, WPT-R-6): same treatment for the bilateral-project-tagged
      // update type — its chip reads the copy's friendlier label instead of the raw type name.
      if (resolveNotificationType(this.notification) === NotificationType.RESULT_BILATERAL_PROJECT_TAGGED) {
        return NOTIFICATION_PROJECT_TAGGED_COPY.chipLabel;
      }
      // SACN-T-4 (`sp-approval-center-notice`, SACN-R-6/R-7, design §8.3/DD-4): same treatment for
      // a bilateral review decision row — Approved AND Rejected both read the friendlier "Decision
      // update" label instead of the raw "Bilateral Result Approved/Rejected" type name.
      if (isBilateralReviewNotification(this.notification)) {
        return BILATERAL_DECISION_NOTICE_COPY.chipLabel;
      }
      return resolveNotificationType(this.notification);
    }
    // PSR-T-8: was the fixed `contributionRequestChip` string for every request row; now resolved
    // per kind (primary / bilateral contributor / plain contribution), single source with the
    // drawer's `requestKind` field (see `requestKindLabel`'s own docstring).
    return this.requestKindLabel;
  }

  /**
   * NOTIF-R-5 (gap between `requirements.md` and `design.md`, closed by the user's 2026-09-29
   * decision): the notification's decision/info status, derived from `needsDecision`/`source`
   * (NOTIF-T-1's `buildUnifiedList()`) or, absent that tag, from the same fields `isPending` already
   * reads.
   *
   * NOTIF-T-12 (rework attempt 1) removed the row-level status badge that used to consume this
   * getter directly (it didn't match the reference image) — the template no longer renders a
   * `.notification_status_chip` anywhere; `rowStatusLabel` is no longer read from `notification-item.component.html`
   * at all. It now feeds the detail panel's chips row instead, via `chips()`'s first entry
   * (`NOTIF-T-14`, closing the `NOTIF-R-5` gap this removal reopened; moved from the retired
   * `drawerViewFields()`'s `status` field by `DSP-T-4` — see the copy file's docstring for the same
   * history).
   *
   * NOTIF-T-5 (rework, attempt 2): a resolved (status 2/3) row never actually reaches this getter
   * from the template — the resolved-row branches (`@case (2)`/`@case (3)`) render the existing
   * Accepted/Declined decision chip instead. There is accordingly no `statusResolved` copy key any
   * more (removed as dead); a resolved row falls through to the same "For your information" default
   * every other non-pending, non-update row gets.
   */
  get rowStatusLabel(): string {
    const labels = this.copy.notificationItem;
    if (this.isUpdateSource) return labels.statusInfo;
    if (this.isPending) return labels.statusNeedsDecision;
    return labels.statusInfo;
  }

  /** NOTIF-T-5: `getResultNotificationTextParts()` for an update-source row — never reimplemented. */
  get updateTextParts(): NotificationTextParts {
    return getResultNotificationTextParts(this.notification);
  }

  /** RRC-T-9 (RRC-R-13): the "Reason" line of a rejection update row; null for every other row. */
  get rejectionReasonLine(): string | null {
    return this.isUpdateSource ? getRejectionReasonLine(this.notification) : null;
  }

  readonly rejectionReasonLabel = BILATERAL_REJECTION_NOTICE_COPY.notificationReasonLabel;

  /** A finished AI job has no result behind it: no result link, no drawer, just its sentence. */
  get aiJobParts(): AiJobNotificationParts | null {
    return getAiJobNotificationParts(this.notification);
  }

  /**
   * SACN-T-4 (design §8.3, SACN-R-6): the approve row's avatar box shows a check icon instead of
   * the emitter's initials — Approved only (mirrors the `aiJob` icon branch above). Rejected rows
   * keep showing initials (SACN-R-6 "Rejected row chip" scenario: chip changes, icon doesn't).
   */
  get isApprovedDecisionUpdateRow(): boolean {
    // SACN-T-4 rework attempt 2 (Reviewer advisory, cheap): guard with `isUpdateSource` — this
    // getter is only ever read from the Updates-row avatar branch, so a `source:'request'` row
    // resolving (however unlikely) to the same `NotificationType` value can never flip it true.
    return this.isUpdateSource && resolveNotificationType(this.notification) === NotificationType.BILATERAL_RESULT_APPROVED;
  }

  /**
   * BPT-T-3 (`bilateral-project-tagged`, design §8.3, BPT-R-5): true for the Center-reported
   * `RESULT_BILATERAL_PROJECT_TAGGED` shape — an Updates row whose stored `text` matches
   * `parseCenterReportedProjectText`. Guarded by `isUpdateSource` first (same defensive pattern as
   * `isApprovedDecisionUpdateRow` above), so a `source:'request'` row can never flip it true. A
   * W1/W2 enriched/bare row of the same `NotificationType` (no match) keeps its initials avatar.
   */
  get isCenterReportedProjectRow(): boolean {
    if (!this.isUpdateSource) return false;
    if (resolveNotificationType(this.notification) !== NotificationType.RESULT_BILATERAL_PROJECT_TAGGED) return false;
    const text = this.notification?.text?.trim();
    return !!text && !!parseCenterReportedProjectText(text);
  }

  /**
   * NOTIF-T-9 (`NOTIF-R-12`): funding-window tag badge — `W1/W2` or `W3/Bilateral`, derived only
   * from the already-returned `obj_result.source_name` (`'W1/W2'` | `'W3/Bilaterals'`, widened onto
   * Updates-tab rows by `NOTIF-T-8`). Any other/absent value omits the badge entirely rather than
   * fabricating one (`NOTIF-R-5`/`NOTIF-AC-7`'s "omit, don't fake" rule).
   */
  get fundingWindowBadge(): string | null {
    const sourceName = this.notification?.obj_result?.source_name;
    if (sourceName === 'W1/W2') return this.copy.notificationItem.fundingWindowW1W2;
    if (sourceName === 'W3/Bilaterals') return this.copy.notificationItem.fundingWindowBilateral;
    return null;
  }

  /**
   * NOTIF-T-9 (`NOTIF-R-12`): "<level> · <type>" badge (e.g. "Output · Innovation Development"),
   * built only from whichever of `obj_result.obj_result_level.name` / `obj_result.obj_result_type.name`
   * the row actually carries — a row missing one still shows the other rather than a blank
   * placeholder; a row missing both omits the badge entirely.
   */
  get resultLevelTypeBadge(): string | null {
    const level = this.notification?.obj_result?.obj_result_level?.name;
    const type = this.notification?.obj_result?.obj_result_type?.name;
    const parts = [level, type].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    return parts.length ? parts.join(' · ') : null;
  }

  /**
   * DSP-T-4 (design.md §6.2 "title", DD-6): the detail panel's header title — request kind / update
   * type label, same single source as the row's own type chip (`rowTypeChipLabel`) so the two can
   * never say something different about the same request/update (same guarantee `requestKindLabel`'s
   * own docstring already gives for the chip vs the old drawer field). Falls back to the generic
   * `copy.title` ("Contribution request") when the kind/type can't be resolved — the same text every
   * row's title showed, statically, before this task.
   */
  detailTitle(): string {
    return this.rowTypeChipLabel ?? this.copy.title;
  }

  /**
   * DSP-T-4 (design.md §6.2 "the date `activityDate` formatted `dd MMM yyyy`"): the notification's
   * own date, for the chips row — `requested_date ?? created_date` (DSP-T-9 F-2, user-approved
   * 2026-10-05). Request rows carry `requested_date` only (the row's own `.notification_date` line
   * formats the same field with `appFormatTimeAgo`, a relative string; this is the chips row's
   * absolute counterpart); update rows carry `created_date`. `null` when neither parses (chip
   * omitted, never a fabricated/invalid date).
   */
  get activityDate(): string | null {
    return formatActivityDate(this.notification?.requested_date ?? this.notification?.created_date);
  }

  /**
   * DSP-T-4 (design.md §6.2 "chips"/§6.3): the header's chips row, in this fixed order — status,
   * funding (outlined), level · type, date. Status is the only chip that's always present
   * (`rowStatusLabel` never returns null); the other three are omitted, never a blank chip, exactly
   * like `fundingWindowBadge`/`resultLevelTypeBadge` already do for the row itself.
   */
  chips(): NotificationDetailChip[] {
    const chips: NotificationDetailChip[] = [{ text: this.rowStatusLabel, pill: true }];
    if (this.fundingWindowBadge) chips.push({ text: this.fundingWindowBadge, outlined: true, pill: true });
    if (this.resultLevelTypeBadge) chips.push({ text: this.resultLevelTypeBadge });
    if (this.activityDate) chips.push({ text: this.activityDate });
    return chips;
  }

  /**
   * DSP-T-4 (design.md §6.2 "Field sources" / §6.3 "RESULT card", DD-6/DD-7): the RESULT card's
   * 6-field grid, always exactly 6 cells in this fixed order — Reporting center, Result type,
   * Primary Science Program, Contributing programs, Submitted by, Phase. Supersedes
   * `drawerViewFields()`'s `view`-mode-only metadata grid: this grid renders for every row/mode now,
   * and a missing source value shows `copy.dashValue` (muted) instead of omitting the label
   * (DD-6 supersedes NOTIF-R-5/NOTIF-AC-7 for THIS grid only — status/requestKind, the two fields
   * that used to satisfy them here, moved to `chips()`/`detailTitle()` instead).
   *
   * Primary SP / Contributing programs read the approval chain (`approvalChain()`, DSP-T-2): the
   * chain's primary step's `official_code` for Primary SP, falling back to the row's own
   * `obj_result_by_initiatives[0]` while the chain hasn't resolved to `'ok'`; the chain's
   * non-declined contributor codes, joined ", ", for Contributing programs — with a skeleton
   * (`loading: true`) on that one cell while the chain is still `'loading'`.
   *
   * Reviewer FAIL (attempt 1), fixed here:
   * - **Result type** now reuses `resultLevelTypeBadge` ("level · type"), the same getter the
   *   row's own badge renders, instead of `obj_result_type.name` alone — the grid used to drop the
   *   level half the spec/mockup both show.
   * - **Every cell is normalized** through `blankToNull()` — an empty or whitespace-only source
   *   string (acronym, phase name, a contributing code) now falls through to `dash` instead of
   *   rendering a label next to a blank cell. Only `?? dash` (null/undefined only) used to guard
   *   this, which a whitespace string slips straight through.
   */
  resultGrid(): NotificationDetailGridField[] {
    const n = this.notification;
    const dash = this.copy.dashValue;
    const labels = this.copy.resultGridLabels;

    // Reviewer FAIL issue 2: trims and discards a whitespace-only value — `?? dash` alone only
    // catches null/undefined, not `''`/`'   '`.
    const blankToNull = (s?: string | null): string | null => {
      const trimmed = s?.trim();
      return trimmed ? trimmed : null;
    };

    const chain = this.approvalChain();
    const chainData = chain.status === 'ok' ? chain.data : null;

    const reportingCenter = blankToNull(n?.obj_result?.result_center_array?.[0]?.clarisa_center_object?.clarisa_institution?.acronym);
    const resultType = this.resultLevelTypeBadge;
    const phase = blankToNull(n?.obj_result?.obj_version?.phase_name);

    // DSP-T-9 Q-1 (user-approved 2026-10-05, design.md §6.2 "Submitted by"): the chain's SUBMISSION
    // actor (who actually submitted the RESULT), not the request's requester — so the grid and the
    // APPROVAL CHAIN section never name different people for the same panel (T-9 real data, result
    // 9674: Santiago Sanchez (requester) vs Nicoleta Trifa (submission actor)). `–` for
    // `not_submitted` or a chain error; a skeleton (same mechanism as Contributing programs) while
    // the chain is still loading.
    const submittedBy = chainData?.submission.state === 'submitted' ? blankToNull(chainData.submission.actor_name) : null;

    const fallbackPrimary = blankToNull(n?.obj_result?.obj_result_by_initiatives?.[0]?.obj_initiative?.official_code);
    const primaryStep = chainData?.steps?.find(step => step.role === 'primary');
    const primaryProgram = blankToNull(primaryStep?.official_code) ?? fallbackPrimary;

    const contributingCodes = (chainData?.steps ?? [])
      .filter(step => step.role === 'contributor' && step.status !== 'declined')
      .map(step => blankToNull(step.official_code))
      .filter((code): code is string => code !== null);
    const contributingPrograms = contributingCodes.length ? contributingCodes.join(', ') : null;

    return [
      { label: labels.reportingCenter, value: reportingCenter ?? dash },
      { label: labels.resultType, value: resultType ?? dash },
      { label: labels.primaryProgram, value: primaryProgram ?? dash, mono: true },
      { label: labels.contributingPrograms, value: contributingPrograms ?? dash, mono: true, loading: chain.status === 'loading' },
      { label: labels.submittedBy, value: submittedBy ?? dash, loading: chain.status === 'loading' },
      { label: labels.phase, value: phase ?? dash }
    ];
  }

  /**
   * NOTIF-R-11: clicking the same open row again closes the panel, in addition to the drawer's
   * existing ✕/scrim/Escape close. A pending row's FIRST click still opens 'decide' mode exactly as
   * before (CRD-DD-10) — this only adds a toggle on the already-open case, for every row kind.
   */
  onRowActivate(): void {
    const aiJob = this.aiJobParts;
    if (aiJob) {
      // The contribution drawer needs a result; an AI job row goes to its drafts instead.
      if (aiJob.path) this.router.navigateByUrl(aiJob.path);
      return;
    }
    if (this.drawerOpen()) {
      this.closeDrawer();
      return;
    }
    this.openDrawer('details');
  }

  /**
   * CRD-R-1 "Keyboard open": Space on a `role="button"` row scrolls the page by default — the
   * template can't `preventDefault()` inline on `(keydown.space)`, so this is the one row-
   * interactivity handler that needs its own method. Also guards against Space on a focused nested
   * control (result link, bilateral link, Accept/Decline) bubbling up to the row and opening the
   * drawer a second time (CRD-R-1 "no click on those controls also opens the drawer", which a
   * keyboard activation counts as) — only the row itself being the event target counts.
   * NOTIF-T-5: no longer gated on `isPending` — every row is now interactive (`rowMode`).
   */
  onRowSpaceKeydown(event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.onRowActivate();
  }

  /**
   * P2-3187: which endpoint version records the decision. Derived from the request's own portfolio —
   * NOT from `FieldsManagerService.isP25()`, which reads `currentResultSignal()?.portfolio`, a signal
   * nothing on this page sets: the version used to depend on whether the user had previously opened a
   * P25 result in the session. Deterministic routing became safe on 2026-09-04, when the server's V2
   * method gained the same lead-centre decision notification V1 already emitted (P2-3188).
   */
  get isP25Request(): boolean {
    return this.notification?.obj_result?.obj_version?.obj_portfolio?.acronym === 'P25';
  }

  get requesterCode() {
    return this.notification?.is_map_to_toc
      ? this.notification?.obj_shared_inititiative?.official_code
      : this.notification?.obj_owner_initiative?.official_code;
  }

  get responderCode() {
    return this.notification?.is_map_to_toc
      ? this.notification?.obj_owner_initiative?.official_code
      : this.notification?.obj_shared_inititiative?.official_code;
  }

  // P2-3085: ToC metadata the submitter configured, shown read-only in the Contribution Request review.
  // Sourced from the backend `toc_contribution_review[]` (P2-3086); empty when absent / non-ToC requests.
  get tocReview(): TocContributionReview[] {
    return this.notification?.toc_contribution_review ?? [];
  }

  // P2-3204: same resolution as Contributors & Partners — the sentinel first, then the TOC type name
  // ("custom — <real KPI name>"), joined only when they differ so identical values are not repeated.
  tocTypologyOf(review: TocContributionReview): string {
    const clean = (value?: string) => (typeof value === 'string' && value.trim() ? value.trim() : '');
    const name = clean(review?.statement);
    const sentinel = clean(review?.indicator_typology);
    if (name && sentinel && name !== sentinel) return `${sentinel} — ${name}`;
    return name || sentinel || '—';
  }

  /**
   * BELL-T-1 (BELL-DD-2): delegates the non-busy part of this predicate to `isDecidable()`. Only
   * `requestingAccept`/`requestingReject` stay here — in-flight UI state, not a row/context property
   * the shared util should own.
   */
  invalidateRequest() {
    return (
      this.requestingAccept ||
      this.requestingReject ||
      !isDecidable(this.notification, {
        isAdmin: this.api.rolesSE.isAdmin,
        platformIsClosed: this.api.rolesSE.platformIsClosed,
        currentPhaseId: this.api.dataControlSE.reportingCurrentPhase.phaseId,
        ipsrCurrentPhaseId: this.api.dataControlSE.IPSRCurrentPhase?.phaseId
      })
    );
  }

  /**
   * P2-3187: `is_map_to_toc` does NOT mean "the contributor already mapped this result to their ToC".
   * It is a request KIND, stamped at creation time:
   *   • `true`  — the ToC mapping travelled WITH the request (only the owner approves/declines).
   *     Set in the server at `share-result-request.service.ts:253` from `createTocShareResult.isToc`,
   *     which only `share-request-modal.component.ts onRequest()` ever sends.
   *   • `false` — no ToC mapping came with the request. Bilateral contribution requests are ALWAYS
   *     created with `false` (server `results.service.ts:4320`, `_updateContributingInitiatives`).
   * For W3/Bilateral requests the ToC mapping is never a precondition of accepting. Non-bilateral
   * `is_map_to_toc: false` requests keep their legacy modal-first flow — ~798 of them are pending,
   * and they still rely on it.
   *
   * AC4 ("after accepting, show the ToC mapping as an optional step") was built on 2026-09-04 as
   * Option A of the P2-3187 comment: the Accept button opens a prompt, "Not now" records the plain
   * accept, "Map it" opens a mapping step in THIS card (reusing `app-cp-multiple-wps` with
   * `forceP25`, the exact composition the bilateral review drawer already ships). The mapping — when
   * given — travels WITH the accept PATCH, which is the contract `approveRequest`/`approveRequestV2`
   * were built for (`mapWorkPackagesToInitiative*` writes the contributor's `result_toc_result`
   * rows). One PATCH total, so the double-accept trap of reopening `<app-share-request-modal>` never
   * applies — and that modal is still never reopened (see ./CLAUDE.md).
   */
  get acceptsWithoutToc(): boolean {
    // PSR-T-8: a primary request never goes through the bilateral ToC-prompt/mapping flow at all —
    // it is handled by its own branch, first, in both `onAcceptContribution()` and
    // `onDrawerAccept()` below. Excluding it here too is defense in depth: even if a caller reached
    // this getter directly, it would no longer claim a primary request "accepts without ToC" in the
    // bilateral sense (prompt → optional mapping) — it just accepts, full stop.
    return this.isBilateralResult && !this.isPrimaryRequest;
  }

  /**
   * P2-3187 AC1/AC3/AC4: single entry point for the row's "Accept" button. Requests whose ToC
   * mapping already travelled with them record the decision on the first click; a bilateral
   * request opens the "Map to your Theory of Change?" prompt (CRD-R-10 amended, CRD-DD-10 pivot —
   * restored from `HEAD`, the row keeps its pre-spec popup flow); the rest keep the legacy
   * modal-first flow.
   */
  onAcceptContribution() {
    // PSR-T-8: a primary request accepts on the first click, exactly like the ToC-carried path —
    // no prompt, no mapping step, no `tocInitiative` seed. It is `is_map_to_toc: false` on the
    // server (design.md §3.1), so without this branch it would fall into `acceptsWithoutToc` (today
    // false for it) or, worse, the legacy modal-first flow via `mapAndAccept()`.
    if (this.isPrimaryRequest) {
      this.reviewPrimaryResult();
      return;
    }

    if (this.notification?.is_map_to_toc) {
      this.acceptOrReject(true);
      return;
    }

    if (this.acceptsWithoutToc) {
      if (this.invalidateRequest()) return;
      this.showTocPromptDialog.set(true);
      return;
    }

    this.mapAndAccept(this.notification);
  }

  /**
   * PDR-T-4 (design.md §8.2 "Row Decline"): single entry point for the row's Decline button. A
   * primary request opens the new justification dialog (`showPrimaryDeclineDialog`) — never
   * `showConfirmRejectDialog`, which stays exactly as-is for every other row kind (contributor,
   * W1/W2), byte-for-byte (`PDR-R-2`).
   */
  onDeclineClick() {
    if (this.isPrimaryRequest) {
      this.showPrimaryDeclineDialog.set(true);
      return;
    }
    this.showConfirmRejectDialog.set(true);
  }

  /**
   * PDR-T-4 (design.md §8.2 "Drawer Decline"): the drawer's `declineClicked` output (its `decide`-
   * footer Decline button). A primary request closes the drawer FIRST, then opens the justification
   * dialog — never a dialog stacked on top of an open drawer (`PDR-R-1` "same layout…", design's
   * "the drawer closes first"). Every other row kind keeps today's inline `confirm-decline` footer,
   * untouched (`PDR-R-2`).
   */
  onDrawerDeclineClicked() {
    if (this.isPrimaryRequest) {
      this.closeDrawer();
      this.showPrimaryDeclineDialog.set(true);
      return;
    }
    this.drawerMode.set('confirm-decline');
  }

  /**
   * PDR-T-4: Confirm on the primary-decline dialog — the dialog already guarantees a trimmed,
   * non-empty `justification` (its own `confirmDisabled`), so this is a thin pass-through to the
   * shared decision entry point.
   */
  onPrimaryDeclineConfirm(justification: string) {
    this.acceptOrReject(false, false, justification);
  }

  /**
   * CRD-T-3: the untouched-mapping seed, extracted from `openTocMappingStep()` so `openDrawer()`
   * can reuse it WITHOUT the global hydration (CRD-DD-3 — hydration is deferred to the first
   * planned-result answer, see `onTocPlannedResultChange()`). Shape unchanged from before the
   * extraction.
   */
  private seedTocInitiative() {
    const sharedInitiative = this.notification?.obj_shared_inititiative;

    this.tocInitiative = {
      planned_result: null,
      initiative_id: sharedInitiative?.id,
      official_code: sharedInitiative?.official_code,
      short_name: sharedInitiative?.name,
      result_toc_results: [this.buildEmptyTocTab('0')]
    };
  }

  /** CRD-T-3: has the submitter answered the Align planned-result question at all (CRD-R-5/R-6). */
  isTocMappingTouched(): boolean {
    return this.tocInitiative?.planned_result !== null && this.tocInitiative?.planned_result !== undefined;
  }

  /**
   * CRD-T-7 (pivot): "Map it" — the row popup's mapping step, restored from `HEAD`. Reuses
   * `seedTocInitiative()`, the same untouched seed `openDrawer()` uses for the Align section, but —
   * unlike the drawer path — hydrates the global ToC state immediately on open (CRD-DD-10): the
   * popup path never defers hydration to the first planned-result answer, only the drawer does
   * (CRD-DD-3).
   */
  openTocMappingStep() {
    this.hydrateGlobalTocState(this.notification);
    this.seedTocInitiative();

    this.showTocPromptDialog.set(false);
    this.showTocMappingDialog.set(true);
  }

  /**
   * Opens the drawer. Sets the footer mode and the Align auto-scroll flag per `entry`, and — for
   * bilateral requests only — seeds an untouched `tocInitiative` locally, with NO global hydration
   * (design.md CRD-P-4/CRD-DD-3; `hydrateGlobalTocState` only runs from `onTocPlannedResultChange()`,
   * on the first answer). CRD-DD-10 (pivot): also resets the row's three popup signals to false —
   * nothing reachable from the drawer may reopen a popup over it (CRD-R-11 amended).
   *
   * NOTIF-T-5: `rowMode` (not `entry` alone) decides the real mode — a resolved Received row, any
   * Sent row, or an Updates row always opens in `view` regardless of what `entry` a caller passes,
   * so `view` mode never gets an Align seed or a `confirm-decline`/`decide` footer (design.md §6.2's
   * "no footer" row). A pending row (`rowMode() === 'decide'`) is completely unchanged (CRD-DD-10).
   */
  openDrawer(entry: 'details' | 'align' | 'confirm-decline') {
    const mode = this.rowMode;
    this.drawerMode.set(mode === 'view' ? 'view' : entry === 'confirm-decline' ? 'confirm-decline' : 'decide');
    this.drawerFocusAlign.set(mode === 'decide' && entry === 'align');
    this.tocHydrated = false;
    this.showConfirmRejectDialog.set(false);
    this.showTocPromptDialog.set(false);
    this.showTocMappingDialog.set(false);
    this.showPrimaryDeclineDialog.set(false);

    // PSR-T-8: a primary request never seeds the Align block — `showAlignSlot` also hides the
    // projected `[crdAlign]` slot on the drawer (defense in depth), but the real fix is here:
    // `tocInitiative` must stay unseeded so a primary accept can never carry a ToC payload.
    if (mode === 'decide' && this.isBilateralResult && !this.isPrimaryRequest) {
      this.seedTocInitiative();
    }

    // BRS-T-7 (BRS-R-3/R-9): opening a received PENDING request's drawer records it as seen
    // (`isPending` = status 1 AND not Sent). Fire-and-forget: never blocks opening; never rejects.
    if (this.isPending) void this.resultsNotificationsSE.markRequestSeen(this.notification);

    this.drawerOpen.set(true);
    // DSP-T-2 (DSP-R-8, DD-10): one chain fetch per open, every mode — never gated on `mode`.
    this.fetchApprovalChain();

    // @akili-spec notifications/detail-side-panel (DSP-T-7, design.md §2.2 step 1, DSP-P-10):
    // `openDrawer()` -> `panel.open(key, TemplatePortal(detailTpl))`. The portal is created HERE, at
    // open time — not stored eagerly — because the row's own `#detailTpl`/`ViewContainerRef` only
    // exist once this component has rendered. `labelledBy` is the content heading id (`drawerHeadingId`,
    // DSP-T-3) so the docked `<aside>`'s `aria-labelledby` resolves the same way the drawer's own
    // `labelledBy` input already does.
    const templateRef = this.detailTemplateRef();
    if (templateRef) {
      this.panel.open(this.notificationKey, new TemplatePortal(templateRef, this.vcr), this.drawerHeadingId);
    }
  }

  /**
   * CRD-R-9: closing records nothing — the request stays pending and an in-progress mapping is
   * discarded.
   * @akili-spec notifications/detail-side-panel (DSP-T-7): the single seam every existing close path
   * (✕/Escape, NOTIF-R-11 toggle, `finalize` after a decision — CRD-R-8) already runs through, so
   * every one of them now also releases this row's panel slot and restores focus to the row — no
   * caller above this method changed.
   *
   * DSP-T-7 rework attempt 2 (Leader conformance addition): `finalize`'s unconditional
   * `closeDrawer()` call also runs for a POPUP-path decision (`acceptOrReject`'s own ✕/Decline
   * popups, `onDrawerDeclineClicked`'s close-before-dialog) where this row's drawer/panel was never
   * open at all — requirements.md §4 "Out of scope" keeps the row's own popup focus behavior
   * unchanged (`CRD-DD-10`), and DSP-R-13 only scopes focus-return to closing the PANEL. `wasOpen`
   * is read BEFORE `drawerOpen` is reset to `false` below, so `focusRowInteractive()` only runs when
   * this call is actually closing an open panel/drawer — never for a no-op popup-path `closeDrawer()`
   * where `drawerOpen()` was already `false` on entry.
   */
  closeDrawer() {
    const wasOpen = this.drawerOpen();
    this.drawerOpen.set(false);
    this.drawerMode.set('decide');
    this.drawerFocusAlign.set(false);
    this.tocHydrated = false;
    this.tocInitiative = null;
    // DSP-T-2: supersede any in-flight chain request so a late response cannot overwrite the state
    // after the row has closed (falsifier: "a response arriving after close overwrites the state").
    this.chainRequestToken++;
    // DSP-T-7: release this row's slot (no-op unless this row is still the active one — the service's
    // own guard).
    this.panel.close(this.notificationKey);
    // DSP-T-7 rework attempt 2: only move focus to the row when a panel/drawer was actually open —
    // never for a popup-path call where nothing was open to close (see the docstring above).
    if (wasOpen) this.focusRowInteractive();
  }

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-2)
   * Dispatches the approval-chain GET for `obj_result.id`, tagged with a fresh token so an older,
   * now-superseded in-flight request can never write into `approvalChain` once this one has started
   * (DSP-R-8 "Loading and failure"; DD-10 "owned by the row, uncached").
   */
  private fetchApprovalChain(): void {
    const resultId = this.notification?.obj_result?.id;
    const token = ++this.chainRequestToken;
    this.approvalChain.set({ status: 'loading' });

    if (resultId === undefined || resultId === null) {
      this.approvalChain.set({ status: 'error' });
      return;
    }

    this.api.resultsSE.GET_requestApprovalChain(resultId).subscribe({
      next: (resp: any) => {
        if (token !== this.chainRequestToken) return;
        this.approvalChain.set({ status: 'ok', data: resp?.response });
      },
      error: () => {
        if (token !== this.chainRequestToken) return;
        this.approvalChain.set({ status: 'error' });
      }
    });
  }

  /** DSP-T-2 (DSP-R-8 "Loading and failure"): the chain section's Retry action. */
  retryChain(): void {
    this.fetchApprovalChain();
  }

  /**
   * CRD-T-4 (forward pointer 4): the real `BrnDialog`'s `closed` output also fires after a
   * PROGRAMMATIC close (`acceptOrReject`'s `finalize` → `closeDrawer()`), asynchronously, after the
   * exit animation. Wired straight to `closeDrawer()` that late signal would run it a SECOND time —
   * harmless if this instance is still idle, but under `track $index` instance reuse (CRD-P-6) it
   * could otherwise stack with a drawer already reopened for a different notification. Guarded the
   * simple way the task names: do nothing once the drawer is already closed.
   */
  onDrawerClosedSignal(): void {
    if (!this.drawerOpen()) return;
    this.closeDrawer();
  }

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-7 rework attempt 2)
   * Reviewer FAIL issue 1: the SHELL's own `closed` output (narrow-mode scrim/Escape/outside-click
   * dismissal, AND the real `BrnDialog`'s asynchronous post-exit-animation `closed` that a
   * `[open]=false` binding also triggers) must NOT be treated as a user close when that `[open]=false`
   * was caused by `isWide` flipping true mid-open (design.md §2.2 step 4, DSP-R-4 "preserve its
   * in-progress state"/"applies in both directions") — the container swap is not a close.
   *
   * Guard: `panel.isWide()` AT THE TIME `closed` ARRIVES. When true, this is read as the container
   * swap and ignored — the row stays open, the aside takes over the SAME template instance.
   *
   * Trade-off (named in the task brief): a genuine narrow-mode Escape/scrim close that races a
   * resize to wide — the user closes at < 1280px, then the viewport crosses 1280px before the real
   * sheet's exit-animation `closed` event lands — reads `isWide()` as already `true` by the time
   * this runs, so it is swallowed as a swap instead of closing. This is the same
   * `isWide()`-as-proxy trade the task names; closing it fully would need the real close path to
   * tag ITS OWN `closed` event (e.g. a reason) rather than reading ambient state at arrival time,
   * which is out of this task's scope (CRD-T-6/T-9 own the real-browser timing pass).
   *
   * The content's own ✕ button (`notification-detail-content`'s `(closed)`, L837) is NOT routed
   * through this guard — it stays wired straight to `onDrawerClosedSignal()`/`closeDrawer()`,
   * because the ✕ must still close the panel when DOCKED (wide): a single shared guard on both
   * bindings would make the docked ✕ a no-op (Reviewer FAIL remediation note).
   */
  onDrawerShellClosedSignal(): void {
    if (this.panel.isWide()) return;
    this.onDrawerClosedSignal();
  }

  // @akili-spec changes/contribution-request-drawer
  /**
   * CRD-R-6: the drawer's single "Accept contribution" decision table (design.md §2.2).
   *   - ToC-carried .......... acceptOrReject(true) — inert payload, unchanged AC3 behaviour.
   *   - Bilateral untouched .. acceptOrReject(true) — same inert payload, one PATCH.
   *   - Bilateral complete ... acceptOrReject(true, true) — mapping payload, one PATCH.
   *   - Bilateral incomplete . nothing (the footer already disables Accept; this is the defensive mirror).
   *   - Legacy ............... closeDrawer() BEFORE mapAndAccept() (CRD-DD-6: never stack the drawer under the modal).
   */
  onDrawerAccept() {
    // PSR-T-8 (carried forward-pointer, PSR-T-9): a primary request's drawer Accept sends the same
    // inert ToC payload as the ToC-carried path — never `acceptOrReject(true, true)`, and never the
    // legacy `mapAndAccept()` fallback at the bottom of this method.
    if (this.isPrimaryRequest) {
      this.reviewPrimaryResult();
      return;
    }

    if (this.notification?.is_map_to_toc) {
      this.acceptOrReject(true);
      return;
    }

    if (this.acceptsWithoutToc) {
      if (!this.isTocMappingTouched()) {
        this.acceptOrReject(true);
        return;
      }
      if (this.isTocMappingComplete()) {
        this.acceptOrReject(true, true);
      }
      return;
    }

    this.closeDrawer();
    this.mapAndAccept(this.notification);
  }

  /** CRD-R-5/R-6: the escape hatch — returns the Align section to its untouched state. */
  clearTocMapping() {
    this.seedTocInitiative();
    this.tocHydrated = false;

    this.tocMappingConsumed.set(false);
    setTimeout(() => this.tocMappingConsumed.set(true), 50);
  }

  /**
   * CRD-R-8 "Busy": Clear mapping's `[disabled]` binds through `BrnButton`'s `hostDirectives`-
   * forwarded input, which under the shared Jest Brain stub (`tests/mocks/spartanBrainMock.ts`)
   * never reaches the native `disabled` DOM attribute — that stub is out of this task's scope. This
   * guard makes the busy state provably true regardless: a click while an accept/decline PATCH is
   * in flight never re-seeds `tocInitiative`, in the real app (defense in depth alongside the real
   * `BrnButton` host binding) and under Jest alike.
   */
  onClearTocMappingActivate(): void {
    if (this.requestingAccept || this.requestingReject) return;
    this.clearTocMapping();
  }

  /**
   * CRD-R-3: Result card activation. Non-bilateral opens `resultUrl()` in a new tab; a bilateral
   * CONTRIBUTOR request closes the drawer FIRST so two drawers never stack, then navigates in-app
   * (CRD-DD-6).
   *
   * PSR-T-8 rework attempt 2 (Reviewer finding 1): a PRIMARY request must NOT take the in-app
   * `navigateToResult()` path — that method routes to `requesterCode`'s bilateral-review page
   * (`navigateToResult()` below), and for a primary row `requesterCode` resolves to the requested
   * SP (`responderCode`'s sibling, is_map_to_toc:false ⇒ requesterCode = owner_initiative, which on
   * a primary row IS the requested SP per the server's `primary-program-request.service.ts`). That
   * would land the user on the requested SP's review queue for a result that MUST NOT appear there
   * (requirements.md L94) — before it has even accepted. A primary request therefore takes the same
   * `resultUrl()`-in-a-new-tab path as a non-bilateral row, exactly like the row's own inline link.
   *
   * PRA follow-up: once the primary request's result is Pending Review (status 5) the SP validates
   * it in the review drawer, so this closes the drawer and navigates in-app to `reviewRequestUrl()`
   * (`primaryReviewUrl`) instead; the "MUST NOT appear" reasoning above holds only before that.
   */
  onDrawerResult() {
    const reviewUrl = this.primaryReviewUrl;
    if (reviewUrl) {
      this.closeDrawer();
      void this.router.navigateByUrl(reviewUrl);
      return;
    }

    if (this.isBilateralResult && !this.isPrimaryRequest) {
      this.closeDrawer();
      this.navigateToResult(this.notification);
      return;
    }

    if (this.isBilateralResult) {
      this.notificationNavigation.openCenterEditorInNewTab(this.notification);
      return;
    }

    window.open(this.resultUrl(this.notification), '_blank');
  }

  /**
   * Review-drawer URL for a primary request whose result is Pending Review (status 5): the SP
   * validates it there instead of opening the form. Null for any other row or status, or when the
   * payload names no SP code.
   */
  get primaryReviewUrl(): string | null {
    if (!this.isPrimaryRequest || primaryReviewTarget(this.notification) !== 'review-drawer') return null;
    return this.notificationNavigation.reviewRequestUrl(this.notification);
  }

  /** `href` of a primary row's result link: the review drawer when Pending Review, else Result Detail. */
  primaryResultHref(notification: any): string {
    return this.primaryReviewUrl ?? this.resultUrl(notification);
  }

  /** "Click here to validate the bilateral result": in-app to the review drawer, middle-click keeps the href. */
  onValidateCtaClick(event: MouseEvent): void {
    event.stopPropagation();
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = this.primaryReviewUrl;
    if (url) void this.router.navigateByUrl(url);
  }

  /**
   * Row result link. A W3/Bilaterals result (e.g. a primary program request) opens in its lead
   * center's editor instead of Result Detail, which does not serve bilateral results. The href
   * keeps Result Detail for middle-click / context menu.
   *
   * PRA follow-up: for a primary row whose result is Pending Review (status 5) the click goes in-app
   * to `reviewRequestUrl()` and the href (middle-click / context menu) is that review drawer URL.
   */
  onResultLinkClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isBilateralResult) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    const reviewUrl = this.primaryReviewUrl;
    if (reviewUrl) {
      void this.router.navigateByUrl(reviewUrl);
      return;
    }
    this.notificationNavigation.openCenterEditorInNewTab(this.notification);
  }

  /**
   * CRD-R-2: pure builder for the drawer header sentence, reusing the row's own requester/responder
   * resolution. CRD-T-4 (forward pointer 5): for a bilateral request `requesterCode` is left EMPTY —
   * the CRD template's `@if (h.requesterCode)` guard then omits "from X" entirely, so the sentence
   * never invents a requester name (CRD-R-2 "Bilateral sentence"); the bilateral verb/tail carry
   * their own "to"/"for" so the sentence still reads naturally with the requester clause gone.
   */
  drawerHeader(): DrawerHeaderParts {
    const header = this.copy.header;
    const resultCode = this.notification?.obj_result?.result_code ?? '';
    const resultTitle = this.notification?.obj_result?.title ?? '';

    // PSR-T-8 (design.md §6.1 "Primary request" row, PSR-R-9): "{center} has tagged {sp} as the
    // primary Science Program of result {code} - {title}". `lead` IS the Creating Center label
    // (never "Center X" — the primary sentence has no such prefix), `responderCode` is the
    // requested SP (`is_map_to_toc: false` on a primary row, so `responderCode` already resolves to
    // `obj_shared_inititiative` — see the getter above), and `requesterCode` stays empty so the CRD
    // template never renders a "from X" clause.
    if (this.isPrimaryRequest) {
      return {
        lead: this.creatingCenterLabel,
        requesterCode: '',
        verb: header.primaryVerb,
        responderCode: this.responderCode,
        tail: header.primaryTail,
        resultCode,
        resultTitle
      };
    }

    // PSR-T-8 (design.md §6.1 "Bilateral contributor request" row, PSR-R-10): "**{owner sp}**, as
    // primary Science Program, has tagged **{sp}** as a contributing Science Program to result
    // **{code}** - {title} on behalf of {center}". This REPLACES the old pre-spec generic bilateral
    // branch outright (`isBilateralContributorRequest` is true for every bilateral contribution
    // request now, `PSR-DD-10`) — `lead` is left empty (nothing precedes the bold owner-SP code),
    // `leadCode` carries the owner SP, and `suffix` composes "on behalf of {center}" per the
    // drawer's own contract (`contribution-request-drawer/CLAUDE.md`). `requesterCode` stays empty
    // on purpose (the task brief: "must stay empty; assert it").
    if (this.isBilateralContributorRequest) {
      // PSR-T-8 rework attempt 2 (Reviewer finding 2, advisory): a missing `owner_program_code`
      // must not render an empty bold span or a sentence starting with the verb's leading comma.
      // `leadCode` stays `undefined` (never `''`) when the code is missing, which routes the row
      // AND the drawer's `@else` branch to `lead` instead — a plain-text fallback, never both
      // empty.
      const ownerCode = this.ownerProgramCode;
      return {
        lead: ownerCode ? '' : this.copy.notificationItem.unknownProgramFallback,
        requesterCode: '',
        leadCode: ownerCode || undefined,
        verb: header.bilateralContributorVerb,
        responderCode: this.responderCode,
        tail: header.bilateralContributorTail,
        resultCode,
        resultTitle,
        suffix: `${header.onBehalfOf} ${this.creatingCenterLabel}`
      };
    }

    const requestedBy = this.notification?.obj_requested_by;
    const lead = `${requestedBy?.first_name ?? ''} ${requestedBy?.last_name ?? ''}`.trim();

    return {
      lead,
      requesterCode: this.requesterCode,
      verb: header.verb,
      responderCode: this.responderCode,
      tail: header.tail,
      resultCode,
      resultTitle
    };
  }

  /**
   * PSR-T-8 (design.md §6.2 "decide mode reads the kind ... Accept label", carried from PSR-T-9):
   * the drawer's `decide`-footer Accept label per row kind — `null` (every pre-existing caller,
   * W1/W2 and ToC-carried alike) falls back to the drawer's own `copy.footer.acceptContribution`.
   * This is also the row's own Accept button text (`buttonTextConfirm` in the template), single
   * source so the row and drawer can never say a different word for the same action (PSR-R-11).
   */
  drawerAcceptLabel(): string {
    // BELL-T-11: delegates to the single-source util shared with the bell card. The former `null` for
    // "everything else" is now the explicit default text the drawer and the row button both fell back to.
    return acceptLabelFor(this.notification);
  }

  /**
   * CRD-R-4: one table per `toc_contribution_review` entry, in server order; a single all-dash
   * table when there are none (bilateral / legacy requests never carry review data — CRD-P-1).
   */
  drawerReviewTables(): DrawerReviewField[][] {
    const entries = this.tocReview;
    if (!entries.length) {
      return [this.buildDrawerReviewRow(null)];
    }

    return entries.map(entry => this.buildDrawerReviewRow(entry));
  }

  /**
   * NOTIF-T-5 (rework, attempt 2): the `[reviewRows]` value actually bound to the drawer. In
   * `view` mode, with no real `toc_contribution_review` data, this returns `[]` instead of
   * `drawerReviewTables()`'s all-dash fallback table — that fallback exists for `decide`/
   * `confirm-decline` (`CRD-R-4`) so the footer's "Where it contributes" section always has
   * something to show while a decision is pending, but a `view`-mode panel has no footer at all
   * and nothing to fall back FOR; the dash table there just fabricates the look of ToC data that
   * doesn't exist (`NOTIF-R-5`/`NOTIF-AC-7`). The drawer template's own
   * `@if (mode() !== 'view' || reviewRows().length)` guard (`NOTIF-T-4`) then hides the whole
   * "Where it contributes" section for that empty array. `drawerReviewTables()` itself, and every
   * pre-existing test against it, are untouched — `decide`/`confirm-decline` keep the dash
   * fallback exactly as before.
   */
  drawerReviewRowsForMode(): DrawerReviewField[][] {
    if (this.drawerMode() === 'view' && !this.tocReview.length) {
      return [];
    }

    return this.drawerReviewTables();
  }

  private buildDrawerReviewRow(entry: TocContributionReview | null): DrawerReviewField[] {
    const dash = CONTRIBUTION_REQUEST_DRAWER_COPY.dashValue;
    const value = (raw: unknown) => (raw === null || raw === undefined || raw === '' ? dash : String(raw));
    const fieldLabels = CONTRIBUTION_REQUEST_DRAWER_COPY.fieldLabels;

    return [
      { label: fieldLabels.level, value: value(entry?.level) },
      { label: fieldLabels.highLevelOutputOutcome, value: value(entry?.outcome_label) },
      { label: fieldLabels.outcomeStatement, value: value(entry?.outcome_statement) },
      { label: fieldLabels.indicatorTypology, value: entry ? this.tocTypologyOf(entry) : dash },
      { label: fieldLabels.unitOfMeasurement, value: value(entry?.unit_of_measurement) },
      { label: fieldLabels.target, value: value(entry?.target), mono: true },
      { label: fieldLabels.contributionTarget, value: value(entry?.contribution_target), mono: true }
    ];
  }

  /** CRD-R-8 "Blocked": null while busy (the spinner covers that state) or not blocked. */
  drawerBlockedReason(): string | null {
    if (this.requestingAccept || this.requestingReject) return null;
    if (!this.invalidateRequest()) return null;

    return this.isQAed ? CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedQAedReason : CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedGenericReason;
  }

  /** CRD-R-6 "Incomplete mapping": only when the Align question is answered but the mapping isn't complete. */
  drawerAcceptHelper(): string | null {
    if (!this.acceptsWithoutToc) return null;
    if (!this.isTocMappingTouched()) return null;
    if (this.isTocMappingComplete()) return null;

    return CONTRIBUTION_REQUEST_DRAWER_COPY.footer.acceptHelperIncompleteMapping;
  }

  private buildEmptyTocTab(uniqueId: string) {
    const sharedInitiative = this.notification?.obj_shared_inititiative;
    return {
      uniqueId,
      toc_level_id: null,
      toc_result_id: null,
      planned_result: null,
      initiative_id: sharedInitiative?.id,
      official_code: sharedInitiative?.official_code,
      short_name: sharedInitiative?.name,
      results_id: this.notification?.result_id,
      action_area_outcome_id: null,
      toc_progressive_narrative: null,
      indicators: [
        {
          related_node_id: null,
          toc_results_indicator_id: null,
          targets: [{ contributing_indicator: null }]
        }
      ]
    };
  }

  /**
   * Planned/unplanned switches which ToC lists load, so the selection resets and the WPs remount.
   * CRD-DD-3: the drawer's Align section defers `hydrateGlobalTocState` from "open" to this, the
   * FIRST answer — merely viewing the drawer must have no global side effects.
   */
  onTocPlannedResultChange() {
    if (!this.tocInitiative) return;

    if (!this.tocHydrated) {
      this.hydrateGlobalTocState(this.notification);
      this.tocHydrated = true;
    }

    this.tocInitiative.result_toc_results = [this.buildEmptyTocTab('0')];
    this.tocInitiative.result_toc_results[0].planned_result = this.tocInitiative.planned_result;

    this.tocMappingConsumed.set(false);
    setTimeout(() => this.tocMappingConsumed.set(true), 50);
  }

  /**
   * Same completeness rule as the review drawer's `validateIsToCCompleted`: an answered
   * planned-result question, and every tab carrying a level, a node, and — for planned results —
   * the indicator. "Skip and accept" is always available, so an unfinishable mapping never traps
   * the user (AC3/AC5).
   */
  isTocMappingComplete(): boolean {
    const toc = this.tocInitiative;
    if (!toc || toc.planned_result === null || toc.planned_result === undefined) return false;
    if (!toc.result_toc_results?.length) return false;

    return toc.result_toc_results.every((tab: any) => {
      if (tab.toc_level_id === null || tab.toc_level_id === undefined) return false;
      if (tab.toc_result_id === null || tab.toc_result_id === undefined) return false;
      if (toc.planned_result === true && tab.indicators?.length > 0) {
        if (tab.indicators?.[0]?.toc_results_indicator_id === null || tab.indicators?.[0]?.toc_results_indicator_id === undefined) return false;
      }
      return true;
    });
  }

  /** The `result_toc_result` half of the accept PATCH when the contributor chose to map (AC4). */
  private buildTocMappingPayload() {
    const toc = this.tocInitiative;
    const sharedInitiative = this.notification?.obj_shared_inititiative;
    const tabs = (toc?.result_toc_results || []).filter((tab: any) => tab?.toc_result_id !== null && tab?.toc_result_id !== undefined);

    return {
      planned_result: toc?.planned_result ?? null,
      result_toc_results: tabs.map((tab: any) => ({
        action_area_outcome_id: tab.action_area_outcome_id ?? null,
        initiative_id: sharedInitiative?.id,
        official_code: sharedInitiative?.official_code,
        short_name: sharedInitiative?.name,
        planned_result: toc?.planned_result ?? null,
        results_id: this.notification?.result_id,
        toc_result_id: tab.toc_result_id,
        toc_level_id: tab.toc_level_id ?? null,
        toc_progressive_narrative: tab.toc_progressive_narrative ?? null,
        uniqueId: tab.uniqueId,
        indicators: Array.isArray(tab.indicators) && tab.indicators[0]?.related_node_id ? tab.indicators : []
      }))
    };
  }

  mapAndAccept(notification: any) {
    if (this.invalidateRequest()) {
      return null;
    }

    return this.openTocMappingModal(notification);
  }

  /**
   * Hydrates the global state the shared ToC widgets read: `app-cp-multiple-wps` resolves the result
   * id from `dataControlSE.currentNotification` and the level from `currentResultSignal`. Used by the
   * legacy modal flow AND by the bilateral optional-mapping step (P2-3187 AC4).
   */
  private hydrateGlobalTocState(notification: any) {
    const { result_id, obj_result, obj_owner_initiative } = notification;

    this.api.dataControlSE.currentResult = {
      ...this.api.dataControlSE.currentResult,
      title: obj_result?.title,
      submitter: `${obj_owner_initiative?.official_code} - ${obj_owner_initiative?.name}`,
      result_level_id: obj_result?.obj_result_level?.id,
      result_type_id: obj_result?.obj_result_type?.id,
      result_type: obj_result?.obj_result_type?.name,
      initiative_id: obj_owner_initiative?.id,
      portfolio: obj_result?.obj_version?.obj_portfolio?.acronym,
      source_name: obj_result?.source_name
    };

    this.api.dataControlSE.currentResultSignal.set({
      ...this.api.dataControlSE.currentResultSignal(),
      title: obj_result?.title,
      submitter: `${obj_owner_initiative?.official_code} - ${obj_owner_initiative?.name}`,
      result_level_id: obj_result?.obj_result_level?.id,
      result_type_id: obj_result?.obj_result_type?.id,
      result_type: obj_result?.obj_result_type?.name,
      initiative_id: obj_owner_initiative?.id,
      portfolio: obj_result?.obj_version?.obj_portfolio?.acronym,
      source_name: obj_result?.source_name
    });

    this.resultLevelSE.currentResultLevelIdSignal.set(obj_result?.obj_result_level?.id);

    this.api.resultsSE.currentResultId = result_id;

    this.api.dataControlSE.currentNotification = notification;
  }

  /**
   * Hydrates the global state the app-level `<app-share-request-modal>` (app.component.html:63) reads,
   * and opens it. It does NOT accept anything — the accept PATCH only happens if the user presses the
   * modal's own Accept button. Reached only from `mapAndAccept` (the legacy non-bilateral flow).
   */
  private openTocMappingModal(notification: any) {
    const { obj_result, obj_shared_inititiative } = notification;

    this.hydrateGlobalTocState(notification);

    this.retrieveModalSE = {
      ...this.retrieveModalSE,
      title: obj_result?.title,
      requester_initiative_id: obj_shared_inititiative?.id
    };

    this.shareRequestModalSE.shareRequestBody = {
      ...this.shareRequestModalSE.shareRequestBody,
      initiative_id: obj_shared_inititiative?.id,
      official_code: obj_shared_inititiative?.official_code,
      short_name: obj_shared_inititiative?.name,
      result_toc_results: [
        {
          action_area_outcome_id: null,
          initiative_id: obj_shared_inititiative?.id,
          official_code: obj_shared_inititiative?.official_code,
          planned_result: this.shareRequestModalSE.shareRequestBody.planned_result,
          results_id: null,
          short_name: this.shareRequestModalSE.shareRequestBody.short_name,
          toc_result_id: null,
          uniqueId: Math.random().toString(36).substring(7)
        }
      ]
    };

    this.api.dataControlSE.showShareRequest = true;
  }

  /**
   * PSR-T-8 (design.md §6.1 "Tokens: existing only. Blue pill = the existing info/brand-blue
   * pair."): the type chip's background/foreground classes for a `source:'request'` row. Primary
   * requests get the existing `--pr-status-submitted-*` blue pair (the info/brand-blue pair
   * already in `colors.scss`); every other request row (bilateral contributor or plain
   * contribution) keeps the violet `--pr-color-primary-50/-400` pair the chip already used before
   * this task (`NOTIF-T-13`). No new tokens.
   */
  get rowTypeChipColorClass(): string {
    // WCT-T-5 (`w1w2-center-tagged`, WCT-R-6/WCT-NFR-4): the Center-tagged update row's chip gets
    // the existing green "approved" status token pair. Request-row chips and every other update
    // type are unchanged.
    if (this.isUpdateSource) {
      const notificationType = resolveNotificationType(this.notification);
      if (notificationType === NotificationType.RESULT_CENTER_TAGGED) {
        return '!bg-[var(--pr-status-approved-bg)] !text-[var(--pr-status-approved-fg)]';
      }
      // WPT-T-4 (`w1w2-project-tagged`, WPT-R-6/WPT-NFR-4): the bilateral-project-tagged row's chip
      // gets the existing amber "in progress" status token pair. Every other update type is unchanged.
      if (notificationType === NotificationType.RESULT_BILATERAL_PROJECT_TAGGED) {
        return '!bg-[var(--pr-status-in-progress-bg)] !text-[var(--pr-status-in-progress-fg)]';
      }
      // SACN-T-4 rework attempt 3 (design.md §8.3 AMENDED 2026-10-02, Pivot): a bilateral review
      // decision row (Approved OR Rejected, `isBilateralReviewNotification`) pairs the
      // `hlmBadge variant="secondary"` chip with an explicit neutral grey pair instead of the
      // theme's own secondary mapping. Attempt 2 returned `''`, which let the badge's own
      // `bg-secondary text-secondary-foreground` (hlm-badge.ts) win — but in THIS app's theme
      // bridge `--secondary` resolves to `--pr-color-primary-25` (#faf9fe, near-white), which does
      // not read grey (the design amendment's own wording). Fix: return the same explicit
      // `!bg-[var(...)] !text-[var(...)]` pattern the WCT/WPT pairs above already use, pointed at
      // `--pr-surface-sunken` (#f3f2f7, `colors.scss` L273) / `--pr-text` (dark ink) — matches the
      // design.md §8.3 class contract; visual match pending HITL. The global `--secondary` mapping
      // in `styles.scss` is NOT touched (design.md §8.3 amendment, explicit).
      if (isBilateralReviewNotification(this.notification)) {
        return '!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]';
      }
      return '!bg-[var(--pr-color-primary-50)] !text-[var(--pr-color-primary-400)]';
    }

    return this.isPrimaryRequest
      ? '!bg-[var(--pr-status-submitted-bg)] !text-[var(--pr-status-submitted-fg)]'
      : '!bg-[var(--pr-color-primary-50)] !text-[var(--pr-color-primary-400)]';
  }

  get isQAed() {
    return this.notification?.obj_result?.status_id == 2 && this.notification?.request_status_id == 1;
  }

  // @akili-spec changes/sp-bilateral-review-tab (BRT-T-6, BRT-R-17)
  navigateToResult(notification) {
    const url = `/result-framework-reporting/entity-details/${this.requesterCode}/bilateral-review`;

    this.bilateralResultsService.currentResultToReview.set(notification?.obj_result);

    this.router.navigateByUrl(url).then(() => {
      this.bilateralResultsService.showReviewDrawer.set(true);
    });
  }

  resultUrl(notification) {
    const resultCode = notification?.obj_result?.result_code;
    const phase = notification?.obj_result?.obj_version?.id;
    const typeId = notification?.obj_result?.obj_result_type?.id;

    if (typeId === 10 || typeId === 11) {
      return `/ipsr/detail/${resultCode}/general-information?phase=${phase}`;
    }

    return `/result/result-detail/${resultCode}/general-information?phase=${phase}`;
  }

  /**
   * `notifications/primary-review-not-accept` PRA-R-3 / PRA-DD-5: a primary row's single "Review result"
   * action. It still sends the existing accept PATCH (a legacy ownerless result cannot be reviewed
   * without an owner), then — on success OR a 409 (the Center already submitted and closed the row) —
   * opens the review drawer (Pending Review) or tells the SP it will be notified (Editing). Any other
   * error keeps the generic error toast. Never shows a confirm step or the "already answered" toast.
   */
  private reviewPrimaryResult() {
    if (this.invalidateRequest()) return;

    const body = buildDecisionBody(this.notification, true);
    const row = this.notification;
    this.requestingAccept = true;

    const settle = () =>
      this.notificationNavigation.completePrimaryReview(row, () =>
        this.api.alertsFe.show({
          id: 'noti',
          title: this.copy.notificationItem.primaryNotifyLater,
          status: 'success'
        })
      );

    this.api.resultsSE
      .PATCH_updateRequest(body, this.isP25Request)
      .pipe(
        finalize(() => {
          this.closeDrawer();
          this.requestingAccept = false;
          this.requestingReject = false;
          this.requestEvent.emit();
        })
      )
      .subscribe({
        next: () => settle(),
        error: err => {
          console.error(err);
          if (err?.status === 409) {
            settle();
            return;
          }
          this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
        }
      });
  }

  acceptOrReject(isAccept: boolean, withTocMapping = false, justification?: string) {
    if (this.invalidateRequest()) {
      return;
    }

    // P2-3187 AC3: accepting must not require any ToC information. The server dereferences
    // `result_toc_result.result_toc_results` in `approveRequest`/`approveRequestV2` whenever
    // `is_map_to_toc` is false; sending an explicit empty array keeps it on its happy path
    // (`mapWorkPackagesToInitiative` becomes a no-op) instead of relying on a TypeError that the
    // surrounding try/catch swallows AFTER the status was already persisted. Inert for the
    // `is_map_to_toc: true` path too — `saveIndicatorsForPrimarySubmitter` skips on length 0.
    //
    // P2-3187 AC4: when the contributor chose "Map it", the mapping travels WITH this same PATCH —
    // `mapWorkPackagesToInitiative*` writes the contributor's `result_toc_result` rows on approval,
    // so one request records the decision and the optional mapping together (no second accept).
    //
    // BELL-T-1 (BELL-DD-2): `buildDecisionBody()` builds the inert body AND the primary-decline
    // `justification` key (gated on the row's own kind, not on "a justification argument was
    // passed" — see its docstring). The ToC-MAPPING override below stays here: it reads
    // `buildTocMappingPayload()`, which depends on this row's interactively-seeded `tocInitiative`
    // (component state), not a pure function of `this.notification`.
    const body = buildDecisionBody(this.notification, isAccept, { justification });
    if (withTocMapping && isAccept) {
      body['result_toc_result'] = this.buildTocMappingPayload();
    }

    const isPrimaryDecline = !isAccept && this.isPrimaryRequest;

    if (isAccept) this.requestingAccept = true;
    else this.requestingReject = true;

    // PDR-T-4 (design.md §8.2 "own pipe"): a primary decline's error handling must NOT run the
    // shared `finalize` below unconditionally — a 400 has to keep the justification dialog open
    // with its text, which the shared `finalize` (always closes/resets everything) would wipe.
    // Every other call (accept, contributor/W1W2 decline) falls through to the untouched pipeline
    // beneath this, byte-for-byte (`PDR-R-2`).
    if (isPrimaryDecline) {
      this.submitPrimaryDecline(body);
      return;
    }

    this.api.resultsSE
      .PATCH_updateRequest(body, this.isP25Request)
      .pipe(
        finalize(() => {
          // CRD-DD-6 / CRD-R-8 "Outcome closes the drawer": close BEFORE requestEvent.emit(), so
          // the drawer is never left open across the parent's refetch (the list reuses this
          // instance under `track $index`, CRD-P-6). The body construction, buildTocMappingPayload(),
          // isTocMappingComplete() and invalidateRequest() stay untouched (CRD-T-3/T-4/T-7 DoD).
          // CRD-T-7 (pivot): the three popup dialog resets are back, exactly as `HEAD` did, since
          // the popup flow (row buttons) coexists with the drawer again (CRD-DD-10).
          this.closeDrawer();
          this.requestingAccept = false;
          this.requestingReject = false;
          this.showConfirmRejectDialog.set(false);
          this.showTocPromptDialog.set(false);
          this.showTocMappingDialog.set(false);
          this.requestEvent.emit();
        })
      )
      .subscribe({
        next: () => {
          this.api.alertsFe.show({
            id: 'noti',
            title: isAccept ? 'Request successfully accepted' : 'Request successfully rejected',
            status: isAccept ? 'success' : 'information'
          });
        },
        error: err => {
          console.error(err);
          // PSR-T-9 (PSR-R-2 "no longer actionable" / PSR-R-4 stale-tab idempotency / PSR-R-8): the
          // server answers 409 when the request is no longer pending — already decided (another
          // member, a stale tab) or cancelled (the Center re-picked). The `finalize` above already
          // runs unconditionally (closes the drawer, resets the popup signals, emits
          // `requestEvent`), which is what makes the row stop being actionable; this branch only
          // swaps the toast for the exact server-contract text instead of the generic error one.
          if (err?.status === 409) {
            this.api.alertsFe.show({
              id: 'noti-error',
              title: this.copy.notificationItem.staleRequestMessage,
              description: '',
              status: 'information'
            });
            return;
          }
          this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
        }
      });
  }

  /**
   * PDR-T-4 (design.md §8.2 "own pipe"): the primary decline's own PATCH pipeline. Mirrors the
   * shared one above (accept / contributor / W1W2 decline, left byte-for-byte untouched) with one
   * difference: on a **400** the dialog must stay open with its text kept (`PDR-R-1` "server
   * error" scenario), so this `finalize` conditionally skips the close/reset it would otherwise run
   * unconditionally. `keepPrimaryDeclineDialogOpen` is set in the `error` branch just below — RxJS
   * runs `finalize` after the destination's `next`/`error` callback, so the flag is always read
   * after it was written for the same emission.
   */
  private submitPrimaryDecline(body: Record<string, unknown>) {
    this.keepPrimaryDeclineDialogOpen = false;

    this.api.resultsSE
      .PATCH_updateRequest(body, this.isP25Request)
      .pipe(
        finalize(() => {
          this.requestingReject = false;
          if (this.keepPrimaryDeclineDialogOpen) {
            // 400: keep `showPrimaryDeclineDialog` true (text survives) and the drawer already
            // closed on open (`onDrawerDeclineClicked`) stays closed — nothing else to undo here.
            // `requestingReject` (the dialog's `isSaving`) still flips false→true→false, which is
            // what releases the dialog's own double-click guard for a retry.
            this.keepPrimaryDeclineDialogOpen = false;
            return;
          }
          this.closeDrawer();
          this.showConfirmRejectDialog.set(false);
          this.showTocPromptDialog.set(false);
          this.showTocMappingDialog.set(false);
          this.showPrimaryDeclineDialog.set(false);
          this.requestEvent.emit();
        })
      )
      .subscribe({
        next: () => {
          // design.md §8.2: bilateral decline wording — distinct from the shared pipeline's
          // "Request successfully rejected" (contributor/W1W2 byte-for-byte, `PDR-R-2`).
          this.api.alertsFe.show({
            id: 'noti',
            title: 'Request successfully declined',
            status: 'information'
          });
        },
        error: err => {
          console.error(err);
          // PDR-R-1 "server error": a 400 (blank/missing justification, re-validated server-side,
          // `PDR-R-3`) keeps the dialog open with its text and shows the server's message.
          if (err?.status === 400) {
            this.keepPrimaryDeclineDialogOpen = true;
            this.api.alertsFe.show({
              id: 'noti-error',
              title: err?.error?.message || 'Justification is required when declining a primary request',
              description: '',
              status: 'error'
            });
            return;
          }
          // 403/409/500 keep today's behavior: the `finalize` above already closed everything.
          if (err?.status === 409) {
            this.api.alertsFe.show({
              id: 'noti-error',
              title: this.copy.notificationItem.staleRequestMessage,
              description: '',
              status: 'information'
            });
            return;
          }
          this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
        }
      });
  }
}
