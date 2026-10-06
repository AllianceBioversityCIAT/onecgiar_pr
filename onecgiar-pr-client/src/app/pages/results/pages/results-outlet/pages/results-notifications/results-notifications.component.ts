import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { buildUnifiedList, UnifiedNotification } from './utils/build-unified-list';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationBySearchPipe } from './pipes/filter-notification-by-search.pipe';
import { FilterNotificationByCenterPipe } from './pipes/filter-notification-by-center.pipe';
import { FilterNotificationByBilateralProjectPipe } from './pipes/filter-notification-by-bilateral-project.pipe';
// NOTIF-T-11 (`NOTIF-R-16`): Type / Funding / Result-type filter pipes, added alongside the five
// pre-existing filters above.
import { FilterNotificationByTypePipe } from './pipes/filter-notification-by-type.pipe';
import { FilterNotificationByFundingPipe } from './pipes/filter-notification-by-funding.pipe';
import { FilterNotificationByResultTypePipe } from './pipes/filter-notification-by-result-type.pipe';
import { resolveNotificationType } from '../../../../../../shared/constants/notification-type.constants';
import { GroupNotificationsByRecencyPipe, TGroupedNotificationsByRecency } from './pipes/group-notifications-by-recency.pipe';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../internationalization/contribution-request-drawer.copy';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
// @akili-spec notifications/detail-side-panel (DSP-T-6): page-scoped coordinator for the docked
// panel vs drawer decision (design.md §6.2). Provided below so this page gets its own instance.
import { NotificationDetailPanelService } from './services/notification-detail-panel.service';

/** NOTIF-T-6: the three decision-state tabs (`NOTIF-R-1`/`NOTIF-US-1`). */
export type NotifDecisionTab = 'all' | 'decision' | 'info';

/**
 * `@akili-spec notifications/filter-toolbar-dropdowns` (FTD-T-1, design.md §6.2): the seven facets
 * of the per-facet toolbar, in the fixed order `filterFacets` renders them (FTD-R-1).
 */
export type FilterFacetKey = 'phase' | 'type' | 'funding' | 'resultType' | 'program' | 'center' | 'bilateral';

/**
 * NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`): `NOTIF-R-8`'s Received/Sent independence, re-expressed
 * as an in-list toggle. `origin: 'update'` rows are neither Received nor Sent — they show under
 * BOTH sides (a judgment call, see this component's own doc comment on `sourceScopedList` below).
 */
export type NotifSourceView = 'received' | 'sent';

/** NOTIF-T-6 (relocated from the retired `requests.component.ts`): one removable chip in the
 * Filter popover's active-filter row. */
interface ActiveFilterChip {
  type: 'program' | 'center' | 'bilateral' | 'type' | 'funding' | 'resultType';
  id: string;
  label: string;
}

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss'],
  standalone: false,
  // DSP-T-6: component-scoped, not root — each `ResultsNotificationsComponent` instance (one per
  // page visit) gets its own panel coordinator (design.md §6.1 "nothing is shared with the header
  // bell").
  providers: [provideIcons({ lucideChevronDown }), NotificationDetailPanelService]
})
export class ResultsNotificationsComponent implements OnInit, OnDestroy {
  // ---------------------------------------------------------------------
  // NOTIF-T-6 — Tabs UI: All / Needs your decision / For your information
  // ---------------------------------------------------------------------
  //
  // Per `design.md` §6.2/§6.3: the unified list is built here (joining the already-fetched
  // Received/Sent/Updates arrays via `buildUnifiedList()`, NOTIF-T-1), filtered with the same five
  // `filter-notification-by-*` pipes (NOTIF-T-3, NOTIF-R-10 — now migrated into THIS component's own
  // toolbar per the Pivot, `NOTIF-DD-6`), then grouped by recency (NOTIF-T-2, `dateKey: 'activityDate'`).
  activeTab = signal<NotifDecisionTab>('all');

  /** NOTIF-T-6 (Pivot re-scope): the in-list Received/Sent toggle (`NOTIF-R-8` amended). Defaults to
   * 'received', matching the pre-Pivot default landing (`resultsOutletRouting` used to redirect
   * `results-notifications` -> `.../requests` -> `.../requests/received`). */
  activeSource = signal<NotifSourceView>('received');

  /**
   * @akili-spec notifications/bell-quick-inbox (BELL-T-5, BELL-DD-4): the `request` + `action` deep
   * link the bell hands off with. Set once from the query params; the one `received` request row whose
   * id matches gets it as `[autoAction]` and clears it via `onAutoActionConsumed()`. Null = no deep link.
   */
  pendingAutoAction = signal<{ requestId: string; action: 'accept' | 'decline' } | null>(null);

  /** NOTIF-T-6 i18n: tab labels come from the same centralized copy `notificationItem.status*`
   * already uses, so the row's own status text and this tab row never say two different things. */
  readonly copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

  // -----------------------------------------------------------------------
  // NOTIF-T-6 (Pivot re-scope) — Filter toolbar, relocated verbatim (in substance) from the retired
  // `requests.component.ts`. See that file's git history for the original NOTIF-T-6/T-9/T-11/T-12/
  // T-13/T-15/T-16/DD-7 rationale — nothing about the mechanics changes here, only the owner.
  // -----------------------------------------------------------------------
  centerSearchQuery = signal('');
  bilateralProjectSearchQuery = signal('');
  // NOTIF-T-11 (`NOTIF-R-16`): search-within-checklist state for the three new facets, following the
  // same pattern as centerSearchQuery/bilateralProjectSearchQuery above.
  resultTypeSearchQuery = signal('');

  // -----------------------------------------------------------------------
  // `@akili-spec notifications/filter-toolbar-dropdowns` (FTD-T-1) — per-facet dropdown state. The
  // legacy single-popover members this section used to sit alongside were removed in FTD-T-2, once
  // the template stopped reading them (re-sequenced 2026-10-05, user decision).
  // -----------------------------------------------------------------------

  /** FTD-R-1: the seven facet triggers, in the one fixed order the toolbar renders them. Labels
   * come from the centralized copy so there is no second, hand-typed list to drift from it. */
  readonly filterFacets: ReadonlyArray<{ key: FilterFacetKey; label: string }> = [
    { key: 'phase', label: this.copy.filterToolbar.phaseLabel },
    { key: 'type', label: this.copy.filterToolbar.typeLabel },
    { key: 'funding', label: this.copy.filterToolbar.fundingLabel },
    { key: 'resultType', label: this.copy.filterToolbar.resultTypeLabel },
    { key: 'program', label: this.copy.filterToolbar.programLabel },
    { key: 'center', label: this.copy.filterToolbar.centerLabel },
    { key: 'bilateral', label: this.copy.filterToolbar.bilateralProjectLabel }
  ];

  /** FTD-R-3: which facet's dropdown is open — `null` means none. A single nullable key makes "at
   * most one open" true by construction (FTD-DD-2). */
  openFacet = signal<FilterFacetKey | null>(null);

  /** FTD-R-5.S4 (Program search). */
  programSearchQuery = signal('');

  /** FTD-DD-4: re-open guard — `toggleFacet` ignores an open request for the SAME key within
   * `FACET_REOPEN_GUARD_MS` of that key's own close, so a trigger re-click race (FTD-P-4, whether or
   * not the CDK overlay treats the trigger as "outside") can never immediately reopen what it just
   * closed. */
  private lastClosedFacet: { key: FilterFacetKey; at: number } | null = null;
  private static readonly FACET_REOPEN_GUARD_MS = 50;

  private readonly filterByInitiativePipe = new FilterNotificationByInitiativePipe();
  private readonly filterBySearchPipe = new FilterNotificationBySearchPipe();
  private readonly filterByCenterPipe = new FilterNotificationByCenterPipe();
  private readonly filterByBilateralProjectPipe = new FilterNotificationByBilateralProjectPipe();
  private readonly filterByTypePipe = new FilterNotificationByTypePipe();
  private readonly filterByFundingPipe = new FilterNotificationByFundingPipe();
  private readonly filterByResultTypePipe = new FilterNotificationByResultTypePipe();
  private readonly groupByRecencyPipe = new GroupNotificationsByRecencyPipe();
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public api: ApiService,
    private readonly shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router,
    private readonly activatedRoute: ActivatedRoute,
    /** DSP-T-6: public so the page template can read `panel.isWide()` / `panel.portal()` directly. */
    public readonly panel: NotificationDetailPanelService
  ) {}

  setActiveTab(tab: NotifDecisionTab): void {
    this.activeTab.set(tab);
  }

  /**
   * NOTIF-T-6 (Pivot re-scope, item 4): switching Received<->Sent closes any open detail panel
   * (`NOTIF-AC-6`, unchanged in intent — just no longer tied to a route change). `notification-item`
   * is closed scope for this task (may not gain a new `@Input()`/method to force-close its drawer),
   * so this relies on the template's `@switch (activeSource())` wrapper around every
   * `<app-notification-item>` (see the `.html`): a `@switch` case change is a genuine structural
   * teardown/recreate of the embedded view, unconditionally, regardless of the `@for` track key — so
   * every row instance (including an Updates row, visible on both sides — see `sourceScopedList`
   * below, which would otherwise survive a toggle flip under a `@for`-track-key-only approach) is
   * destroyed and a fresh one created, discarding that instance's internal `drawerOpen` signal.
   * (Measured: folding `activeSource()` into the `@for` track key alone does NOT force this — a
   * `@for`'s reconciliation can still reuse an existing DOM/view for an unrelated key change when the
   * list shape doesn't otherwise require a move; `@switch`'s case-level teardown does not have that
   * ambiguity.)
   */
  setActiveSource(source: NotifSourceView): void {
    this.activeSource.set(source);
    // DSP-T-6 / DSP-R-3: a Received<->Sent switch must close any open detail panel regardless of
    // which row key owns it — `closeAll()` (not `close(key)`) is the unconditional form for exactly
    // this page-level event (design.md §2.2 step 6 / §6.2).
    this.panel.closeAll();
  }

  // ---------------------------------------------------------------------------------------------
  // @akili-spec notifications/inbox-paginated-load (PAGE-T-6, design.md §6.2/§6.3, PAGE-DD-8, PAGE-R-11)
  //
  // `unifiedList -> filteredUnifiedList -> sourceScopedList -> tabFilteredList -> groupedTabList` used
  // to be five independent getters, each re-running `buildUnifiedList`/the filter pipes/the recency
  // pipe on EVERY read (a template binding reads `groupedTabList` three times per render — `.today`,
  // `.thisWeek`, `.earlier` — and `allTabCount`/`decisionTabCount`/`infoTabCount` each re-read
  // `sourceScopedList`). `receivedData`/`sentData`/`updatesData`'s history arrays are REPLACED (new
  // reference) on every paging change (PAGE-T-4's `setHistoryRows`/`appendHistoryRows`), never
  // mutated in place, so an identity-keyed cache is valid: unchanged references + unchanged filter
  // values + unchanged tab/side means the derivation is guaranteed to produce the same rows, and the
  // chain is recomputed only when one of those actually changes (falsifier (e)). `buildUnifiedList`
  // and the five filter pipes stay untouched (PAGE-DD-4).
  // ---------------------------------------------------------------------------------------------

  private derivedCacheKey: readonly unknown[] | null = null;
  private derivedCache!: {
    unifiedList: UnifiedNotification[];
    filteredUnifiedList: UnifiedNotification[];
    sourceScopedList: UnifiedNotification[];
    tabFilteredList: UnifiedNotification[];
    groupedTabList: TGroupedNotificationsByRecency<UnifiedNotification>;
  };

  private buildDerivedCacheKey(): readonly unknown[] {
    const se = this.resultsNotificationsSE;
    return [
      se?.receivedData?.receivedContributionsPending,
      se?.receivedData?.receivedContributionsDone,
      se?.sentData?.sentContributionsPending,
      se?.sentData?.sentContributionsDone,
      se?.updatesData?.notificationsPending,
      se?.updatesData?.notificationsViewed,
      se?.initiativeIdFilter,
      se?.searchFilter,
      se?.centerIdsFilter,
      se?.bilateralProjectIdsFilter,
      se?.typeFilter,
      se?.fundingFilter,
      se?.resultTypeFilter,
      this.activeSource(),
      this.activeTab()
    ];
  }

  private static sameCacheKey(a: readonly unknown[], b: readonly unknown[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  /** Recomputes the whole chain only when `buildDerivedCacheKey()` differs from the last computed
   * key (identity comparison — PAGE-DD-8); every getter below reads off this single cache instead of
   * re-deriving independently. */
  private get derived() {
    const key = this.buildDerivedCacheKey();
    if (this.derivedCacheKey && ResultsNotificationsComponent.sameCacheKey(this.derivedCacheKey, key)) {
      return this.derivedCache;
    }

    const received = this.resultsNotificationsSE?.receivedData;
    const sent = this.resultsNotificationsSE?.sentData;
    const updates = this.resultsNotificationsSE?.updatesData;

    const receivedRows = [...(received?.receivedContributionsPending ?? []), ...(received?.receivedContributionsDone ?? [])];
    const sentRows = [...(sent?.sentContributionsPending ?? []), ...(sent?.sentContributionsDone ?? [])];
    const updateRows = [...(updates?.notificationsPending ?? []), ...(updates?.notificationsViewed ?? [])];

    const unifiedList = buildUnifiedList(receivedRows, sentRows, updateRows);

    let filteredUnifiedList: any[] = unifiedList;
    filteredUnifiedList = this.filterByInitiativePipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.initiativeIdFilter);
    filteredUnifiedList = this.filterBySearchPipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.searchFilter);
    filteredUnifiedList = this.filterByCenterPipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.centerIdsFilter);
    filteredUnifiedList = this.filterByBilateralProjectPipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.bilateralProjectIdsFilter);
    filteredUnifiedList = this.filterByTypePipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.typeFilter);
    filteredUnifiedList = this.filterByFundingPipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.fundingFilter);
    filteredUnifiedList = this.filterByResultTypePipe.transform(filteredUnifiedList, this.resultsNotificationsSE?.resultTypeFilter);

    // NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`/`NOTIF-R-8`): `origin:'update'` rows are neither
    // Received nor Sent — a judgment call (see the original getter's doc comment, preserved in
    // substance here): they render under BOTH sides rather than becoming unreachable under either.
    const excludedOrigin = this.activeSource() === 'received' ? 'sent' : 'received';
    const sourceScopedList = filteredUnifiedList.filter(item => (item as any).origin !== excludedOrigin);

    let tabFilteredList = sourceScopedList;
    if (this.activeTab() === 'decision') tabFilteredList = sourceScopedList.filter(item => item.needsDecision);
    else if (this.activeTab() === 'info') tabFilteredList = sourceScopedList.filter(item => !item.needsDecision);

    const groupedTabList = this.groupByRecencyPipe.transform(tabFilteredList, 'activityDate');

    this.derivedCacheKey = key;
    this.derivedCache = { unifiedList, filteredUnifiedList, sourceScopedList, tabFilteredList, groupedTabList };
    return this.derivedCache;
  }

  /** NOTIF-T-1: every currently-loaded Received (Pending+Done) + Sent (Pending+Done) +
   * Updates (Pending+Viewed) row, merged and classified — no separate fetch. */
  get unifiedList(): UnifiedNotification[] {
    return this.derived.unifiedList;
  }

  /** NOTIF-T-3/NOTIF-R-10: the unified list narrowed by the filter toolbar's state (now this
   * component's own — NOTIF-T-6 Pivot re-scope). Each pipe's `transform()` is called against `any[]`
   * — see the identical note already on `filter-notification-by-center.pipe.ts`'s own signature. */
  get filteredUnifiedList(): UnifiedNotification[] {
    return this.derived.filteredUnifiedList;
  }

  /**
   * NOTIF-T-6 (Pivot re-scope, `NOTIF-DD-6`/`NOTIF-R-8`): `filteredUnifiedList` narrowed to the
   * active Received/Sent side. `origin:'update'` rows are neither Received nor Sent — a judgment
   * call (not spelled out by `design.md` §6.1's amended text, which only names the toggle, not what
   * happens to Updates rows under it): they render under BOTH sides rather than becoming unreachable
   * under either one. The alternative (Updates strictly excluded from both) would make Updates rows
   * vanish from the page entirely, which is a worse outcome than the toggle being slightly less
   * "pure" for that one row kind.
   */
  get sourceScopedList(): UnifiedNotification[] {
    return this.derived.sourceScopedList;
  }

  /** NOTIF-R-1: the source-scoped list narrowed to the active tab. 'all' is a no-op narrowing. */
  get tabFilteredList(): UnifiedNotification[] {
    return this.derived.tabFilteredList;
  }

  /** NOTIF-T-2: the active tab's rows, grouped Today/This week/Earlier by `activityDate`. */
  get groupedTabList(): TGroupedNotificationsByRecency<UnifiedNotification> {
    return this.derived.groupedTabList;
  }

  /**
   * NOTIF-AC-1 (Pivot re-scope): live counts, scoped to the active Received/Sent side so the badge
   * next to each tab always matches what that tab actually renders (the task's own Disqualifier:
   * "if the tab counts don't match the rendered row count in any fixture, stop" — a badge that
   * ignored the source toggle would lie about the rendered count the moment a Sent-only or
   * Received-only row exists). Computed off the FILTERED-and-source-scoped (not tab-narrowed) list,
   * so switching tabs never changes what "All" itself reports.
   */
  get allTabCount(): number {
    return this.sourceScopedList.length;
  }

  get decisionTabCount(): number {
    return this.sourceScopedList.filter(item => item.needsDecision).length;
  }

  get infoTabCount(): number {
    return this.sourceScopedList.filter(item => !item.needsDecision).length;
  }

  /** NOTIF-T-5 wiring note: `notification-item`'s own `isPending` getter is
   * `request_status_id === 1 && !isSent` — it does not read `needsDecision`/`origin`. A Sent row can
   * carry `request_status_id === 1` while `needsDecision` is false (NOTIF-P-1); without
   * `[isSent]="true"` such a row would be misread as pending by the row component. NOTIF-T-6 (Pivot
   * re-scope): now derived from the real `origin` tag (`NOTIF-T-1`'s minimal addition) instead of
   * the `needsDecision`-based proxy this used before — `origin` is a true discriminator, the old
   * proxy only happened to be safe because a resolved Received row's `request_status_id !== 1`
   * already made `isPending` false regardless of the `isSent` value passed in. */
  isSentRow(item: UnifiedNotification): boolean {
    return (item as any).origin === 'sent';
  }

  /**
   * NOTIF-T-6 (Pivot re-scope): the `@for` track key for every rendered row. `origin` keeps a
   * Received row's id and an Updates row's id from colliding when both happen to be the same number
   * (they come from independent id spaces — `share_result_request_id` vs `notification_id`) —
   * without it, NG0955 (duplicated `@for` track keys) is a real risk. Kept as a component method
   * (not an inline template expression) so the concatenation happens over known TS types, not
   * `unknown` — a plain `item['share_result_request_id'] + '-' + item['origin']` inline in the
   * template would type-check against `Record<string, unknown>` and fail `ng build`'s stricter
   * Angular template type-checking (`tsc --noEmit` alone would miss it — see
   * `onecgiar-pr-client/src/CLAUDE.md` §21.7). Deliberately does NOT fold in `activeSource()` — see
   * the `.html`'s `@switch (activeSource())` wrapper for how the toggle actually forces a remount
   * (a `@for` track key is a hint for reuse ACROSS one render's list, not a reliable way to force a
   * *directive-level* full teardown on an unrelated signal flip — measured: it does not).
   */
  trackNotificationKey(item: UnifiedNotification): string {
    const id = (item as any)?.share_result_request_id ?? (item as any)?.notification_id;
    return `${(item as any)?.origin}-${id}`;
  }

  /** `app-notification-item`'s `(requestEvent)` fires after an Accept/Decline PATCH resolves
   * (`notification-item.component.ts::acceptOrReject()`'s `finalize`). A row rendered from the
   * unified list can be a Received row, so refresh the same three feeds the page already fetches,
   * scoped to the current phase filter. */
  refreshAllNotifications(): void {
    const phaseId = this.resultsNotificationsSE.phaseFilter;
    this.resultsNotificationsSE.get_section_information(phaseId);
    this.resultsNotificationsSE.get_sent_notifications(phaseId);
    this.resultsNotificationsSE.get_updates_notifications(phaseId);
  }

  ngOnInit(): void {
    // NOTIF-T-6 rework (double-fetch fix): the retired `received-requests`/`sent-requests`/`updates`
    // routed components each triggered their own fetch from `ngOnInit()`. This component used to
    // ALSO fetch Received/Sent/Updates directly here, unconditionally — but `getAllPhases()`'s own
    // `onPhaseChange()` already fetches the same three feeds whenever a phase resolves (from query
    // params via `setQueryParams()`, or the active reporting phase), so a normal page load issued
    // every feed twice (up to 6 requests, last-response-wins on shared state). `getAllPhases()` is
    // now the single source of the fetch: the callback below only fires as a fallback for the rarer
    // case where NO phase resolves at all, so the page still has data instead of staying empty.
    //
    // @akili-spec notifications/inbox-paginated-load (PAGE-T-6, PAGE-T-5 audit forward pointer): this
    // used to call the three legacy wrappers (`get_section_information`, `get_sent_notifications`,
    // `get_updates_notifications` — each a thin `refreshSource()` delegate) with no arguments at
    // all — a whole-inbox reload, which is exactly what `loadInbox()` (not `refreshSource()`) is for
    // (design.md §2.2/§6.2, PAGE-R-1 "no phase"). Finding: `initialLoading` is ONLY ever set by
    // `loadInbox()` in the service — `refreshSource()`/the legacy wrappers never touch it. Calling
    // the legacy wrappers here left `initialLoading` stuck at its default `false` for this whole
    // fallback path, so PAGE-T-6's skeleton gate (`@if (resultsNotificationsSE.initialLoading)`)
    // never engaged for a user who lands with no phase resolved — pending and history rows could
    // paint in arrival order instead of pending-first, the exact PAGE-R-2/PAGE-AC-5 regression the
    // gate exists to prevent. `loadInbox()` (no `phaseId` argument — PAGE-R-1 "no phase" means all
    // phases) sets `initialLoading = true` immediately and clears it once all 3 pending requests
    // settle, so the gate now engages and resolves correctly on this path too.
    this.resultsNotificationsSE.getAllPhases(() => {
      this.resultsNotificationsSE.loadInbox();
    });
    this.shareRequestModalSE.inNotifications = true;
    this.setQueryParams();
    // BELL-T-5 attempt 2 (BELL-T-6 D-1): a bell hand-off while this page is ALREADY open only changes the
    // query params on the same route, so `setQueryParams()` (init-time snapshot) never sees it. `skip(1)`
    // drops the replay of the current params (the snapshot above already handled them).
    this.activatedRoute.queryParamMap.pipe(skip(1), takeUntilDestroyed(this.destroyRef)).subscribe(params => this.onQueryParamMapChange(params));
    this.api.dataControlSE.getCurrentPhases().subscribe();
    this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
  }

  ngOnDestroy() {
    this.resultsNotificationsSE.resetFilters();
  }

  setQueryParams() {
    if (this.activatedRoute.snapshot.queryParams['phase']) {
      this.resultsNotificationsSE.phaseFilter = this.activatedRoute.snapshot.queryParams['phase'];
    }

    // BELL-T-5: a bell hand-off (`request` + a valid `action`). `init`/`search` are deliberately NOT
    // applied. Without `request` everything below is unchanged.
    const request = this.activatedRoute.snapshot.queryParams['request'];
    const action = this.activatedRoute.snapshot.queryParams['action'];
    if (request && (action === 'accept' || action === 'decline')) {
      this.armBellHandoff(String(request), action);
      return;
    }

    if (this.activatedRoute.snapshot.queryParams['init']) {
      this.resultsNotificationsSE.initiativeIdFilter = this.activatedRoute.snapshot.queryParams['init'];
    }

    if (this.activatedRoute.snapshot.queryParams['search']) {
      this.resultsNotificationsSE.searchFilter = this.activatedRoute.snapshot.queryParams['search'];
    }
  }

  /**
   * BELL-T-5 attempt 2 (BELL-T-6 D-1): the same hand-off, arriving while the inbox is already open.
   * Only a `request` + valid `action` does anything; the clearing navigation (`request`/`action` null) and
   * every other param change fall through untouched, so it cannot re-trigger itself.
   */
  private onQueryParamMapChange(params: ParamMap): void {
    const request = params.get('request');
    const action = params.get('action');
    if (!request || (action !== 'accept' && action !== 'decline')) return;

    const phase = params.get('phase');
    if (phase && phase != this.resultsNotificationsSE.phaseFilter) {
      this.resultsNotificationsSE.phaseFilter = phase;
      this.resultsNotificationsSE.onPhaseChange(phase);
    }
    this.armBellHandoff(request, action);
  }

  /** BELL-T-5: shared by init and the live case — program/search/facet filters reset (so the row cannot be
   * hidden by them), Received view + All tab forced, and the matching row is handed `autoAction`. */
  private armBellHandoff(requestId: string, action: 'accept' | 'decline'): void {
    this.resultsNotificationsSE.resetFilters();
    this.activeSource.set('received');
    this.activeTab.set('all');
    this.pendingAutoAction.set({ requestId, action });
  }

  /**
   * BELL-T-5: the `autoAction` for one rendered row — only the `received` request row whose
   * `share_result_request_id` matches (an Updates row's `notification_id` shares the number space).
   */
  autoActionFor(item: UnifiedNotification): 'accept' | 'decline' | null {
    const pending = this.pendingAutoAction();
    if (!pending) return null;
    const row = item as any;
    if (row?.origin !== 'received') return null;
    return String(row?.share_result_request_id) === pending.requestId ? pending.action : null;
  }

  /** BELL-T-5: the row ran its handler — drop the pending action and strip `request`/`action` from the
   * URL (`replaceUrl`, so reload/back do not replay it). */
  onAutoActionConsumed(): void {
    this.pendingAutoAction.set(null);
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { request: null, action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  clearFilters() {
    if (this.resultsNotificationsSE.initiativeIdFilter || this.resultsNotificationsSE.searchFilter) {
      this.resultsNotificationsSE.resetFilters();
    }
  }

  clearAllFilters() {
    this.resultsNotificationsSE.phaseFilter = null;
    this.resultsNotificationsSE.entityLabel = 'Entity';
    this.resultsNotificationsSE.filteredInitiatives = [];
    this.resultsNotificationsSE.resetFilters();
  }

  updateQueryParams() {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        init: this.resultsNotificationsSE.initiativeIdFilter,
        phase: this.resultsNotificationsSE.phaseFilter,
        search: this.resultsNotificationsSE.searchFilter
      },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * NOTIF-T-6 (Pivot re-scope): the routed Requests-vs-Updates split this tooltip used to branch on
   * (`router.url.includes('/requests' | '/updates')`) no longer exists — the merged page has one
   * explainer now, covering both request decisions and informational updates. Hidden on the
   * surviving `settings` child route, matching the paragraph/tooltip's prior behavior of rendering
   * nothing there either.
   */
  get notificationsInfoTooltip(): string {
    if (this.isSettingsRoute) return '';

    return (
      'This page lists collaboration requests (received and sent) and updates on results your entity contributes to. ' +
      'Received requests you have not yet decided on need your action — you can accept or decline each one, and if you accept ' +
      'a bilateral request you can also link it to your ToC indicators and targets. Sent requests and Updates are informational.'
    );
  }

  /**
   * NOTIF-T-6 (Pivot re-scope, item 1 — the settings-route-isolation Falsifier): the unified list
   * (tabs, toggle, toolbar, rows) must render ONLY inside this component's own view, never on the
   * `settings` sibling route. `settings` is the one surviving child of `notificationsRouting`
   * (`shared/routing/routing-data.ts`) — everything else in this template is gated on this being
   * false, and `<router-outlet>` (rendering only `SettingsComponent` now) is left unconditional.
   */
  get isSettingsRoute(): boolean {
    return this.router.url.includes('/results-notifications/settings');
  }

  // -----------------------------------------------------------------------
  // `@akili-spec notifications/filter-toolbar-dropdowns` (FTD-T-2) — per-facet dropdown behavior.
  // The legacy single-popover toolbar (`filterPopoverOpen`/`toggleFilterPopover`/
  // `onDocumentClick`/`onDocumentEscape`/the align-math helper) is gone — the `hlm-popover` CDK
  // overlay now owns outside-click + Escape dismissal per facet (design.md DD-1).
  // -----------------------------------------------------------------------

  /** FTD-R-3.S1/S2: activating `key`'s trigger closes it if it is already the open one, else opens
   * it (replacing whatever else was open, by construction of the single `openFacet` signal). Guarded
   * by FTD-DD-4 against immediately reopening the facet it just closed. */
  toggleFacet(key: FilterFacetKey): void {
    if (this.openFacet() === key) {
      this.closeFacet();
      return;
    }

    const lastClosed = this.lastClosedFacet;
    if (lastClosed?.key === key && performance.now() - lastClosed.at < ResultsNotificationsComponent.FACET_REOPEN_GUARD_MS) {
      return;
    }

    this.openFacet.set(key);
  }

  /** FTD-DD-5: closes whichever facet is open (no-op if none), optionally restoring focus to its
   * trigger (`[data-facet=key]`) via `queueMicrotask` — the overlay content attaches/detaches on the
   * next tick, so a synchronous focus call right after closing could miss the trigger still being
   * there (same shape as `program-overview.closeScopePopover`). */
  closeFacet(refocus = false): void {
    const key = this.openFacet();
    if (key === null) return;

    this.openFacet.set(null);

    if (refocus) {
      queueMicrotask(() => {
        (document.querySelector(`[data-facet="${key}"]`) as HTMLElement | null)?.focus();
      });
    }
  }

  /** FTD-R-4: mirrors the overlay's own dismissal (outside click, Escape) back into `openFacet`, and
   * records the close for the FTD-DD-4 re-open guard. Only a `'closed'` state transition for the
   * CURRENTLY open facet clears it — a stale event for an already-replaced facet is a no-op. */
  onFacetStateChanged(key: FilterFacetKey, state: 'open' | 'closed'): void {
    if (state !== 'closed') return;

    this.lastClosedFacet = { key, at: performance.now() };
    if (this.openFacet() === key) {
      this.openFacet.set(null);
    }
  }

  /** FTD-R-6: per-trigger badge count, reading the exact same service fields `activeFilterCount`
   * reads — a facet's trigger and the aggregate count can never disagree on what is selected. Phase
   * is excluded on purpose (FTD-R-6: it shows the selected phase name instead of a count). */
  facetSelectedCount(key: FilterFacetKey): number {
    switch (key) {
      case 'type':
        return this.resultsNotificationsSE.typeFilter?.length ?? 0;
      case 'funding':
        return this.resultsNotificationsSE.fundingFilter?.length ?? 0;
      case 'resultType':
        return this.resultsNotificationsSE.resultTypeFilter?.length ?? 0;
      case 'program':
        return this.resultsNotificationsSE.initiativeIdFilter ? 1 : 0;
      case 'center':
        return this.resultsNotificationsSE.centerIdsFilter?.length ?? 0;
      case 'bilateral':
        return this.resultsNotificationsSE.bilateralProjectIdsFilter?.length ?? 0;
      default:
        return 0;
    }
  }

  /** FTD-R-6: the `Phase` trigger's own label — the selected phase's `phase_name_status`, or an
   * empty string before any phase has resolved. */
  get selectedPhaseLabel(): string {
    const phases = this.resultsNotificationsSE.phaseList ?? [];
    const selected = phases.find((phase: any) => phase.id == this.resultsNotificationsSE.phaseFilter);
    return selected?.phase_name_status ?? '';
  }

  /** FTD-R-5.S3: re-picking the already-selected phase is a no-op — it must NOT call
   * `onPhaseChange` (which reloads the whole inbox, FTD-P-5). Leaving the dropdown open on that
   * no-op is a UX choice, not a spec requirement. Picking a different phase applies it the same way
   * `onPhaseChange` does today, then closes the dropdown. Phase itself is never clearable (no branch
   * clears it to `null`). */
  selectPhase(id: string | number): void {
    if (this.resultsNotificationsSE.phaseFilter == id) return;

    this.resultsNotificationsSE.phaseFilter = id;
    this.resultsNotificationsSE.onPhaseChange(id);
    this.closeFacet(true);
  }

  /** FTD-R-5.S3: picking the already-selected program clears it (toggle); picking a different one
   * selects it. Either way the dropdown closes. */
  selectProgram(id: string | number): void {
    const current = this.resultsNotificationsSE.initiativeIdFilter;
    this.resultsNotificationsSE.initiativeIdFilter = current == id ? null : id;
    this.closeFacet(true);
  }

  /** FTD-R-5.S4: Program's own search-within-list state, mirroring `centerSearchQuery` /
   * `bilateralProjectSearchQuery` above. */
  get filteredProgramOptions(): any[] {
    const query = this.programSearchQuery().trim().toLowerCase();
    const options = this.resultsNotificationsSE.filteredInitiatives ?? [];
    if (!query) return options;
    return options.filter((option: any) => (option.full_name ?? '').toLowerCase().includes(query));
  }

  /** Mirrors `notification-item.component.ts`'s own `isBilateralResult` getter. */
  private isBilateralRow(item: any): boolean {
    return item?.obj_result?.source_name === 'W3/Bilaterals';
  }

  /** NOTIF-T-6 (Pivot re-scope): the facet options are derived from EVERY currently-loaded row
   * (Received + Sent), not scoped by the active Received/Sent toggle — a facet that changed its own
   * options depending on the toggle would be confusing (a Center chip could silently stop matching
   * anything the moment the user flips the toggle). Mirrors the retired `requests.component.ts`'s own
   * `allNotificationRows()`. */
  private allNotificationRows(): any[] {
    const received = this.resultsNotificationsSE.receivedData;
    const sent = this.resultsNotificationsSE.sentData;
    return [
      ...(received?.receivedContributionsPending ?? []),
      ...(received?.receivedContributionsDone ?? []),
      ...(sent?.sentContributionsPending ?? []),
      ...(sent?.sentContributionsDone ?? [])
    ];
  }

  get centerFacetOptions(): { id: string | number; label: string }[] {
    const seen = new Map<string, { id: string | number; label: string }>();

    this.allNotificationRows()
      .filter(item => this.isBilateralRow(item))
      .forEach(item => {
        const institution = item?.obj_result?.result_center_array?.[0]?.clarisa_center_object?.clarisa_institution;
        if (institution?.id === undefined || institution?.id === null) return;
        seen.set(String(institution.id), { id: institution.id, label: institution.acronym || String(institution.id) });
      });

    return Array.from(seen.values());
  }

  get bilateralProjectFacetOptions(): { code: string; label: string }[] {
    const seen = new Map<string, { code: string; label: string }>();

    this.allNotificationRows()
      .filter(item => this.isBilateralRow(item))
      .forEach(item => {
        const projectLinks = item?.obj_result?.obj_result_by_project ?? [];
        projectLinks.forEach((link: any) => {
          const project = link?.obj_clarisa_project;
          const code = project?.shortName;
          if (!code) return;
          seen.set(code, { code, label: project?.fullName ? `${code} - ${project.fullName}` : code });
        });
      });

    return Array.from(seen.values());
  }

  get filteredCenterFacetOptions(): { id: string | number; label: string }[] {
    const query = this.centerSearchQuery().trim().toLowerCase();
    if (!query) return this.centerFacetOptions;
    return this.centerFacetOptions.filter(option => option.label.toLowerCase().includes(query));
  }

  get filteredBilateralProjectFacetOptions(): { code: string; label: string }[] {
    const query = this.bilateralProjectSearchQuery().trim().toLowerCase();
    if (!query) return this.bilateralProjectFacetOptions;
    return this.bilateralProjectFacetOptions.filter(option => option.label.toLowerCase().includes(query));
  }

  /**
   * NOTIF-T-11 (`NOTIF-R-16`): the row's rendered Type chip/label — mirrors
   * `notification-item.component.ts`'s own `rowTypeChipLabel` getter exactly (never
   * reimplemented independently — same "Contribution request" constant, same
   * `resolveNotificationType()` call), so the facet options and the filter always agree with what
   * the row actually shows.
   */
  private rowTypeLabel(item: any): string | null {
    if (item?.source === 'update') return resolveNotificationType(item);
    if (item?.source === 'request') return this.copy.notificationItem.contributionRequestChip;
    return null;
  }

  /**
   * NOTIF-T-11 (`NOTIF-R-16`): unlike the Center/Bilateral-project facets above, Type/Funding/
   * Result-type must filter the WHOLE unified list (Requests AND Updates, `NOTIF-T-8` widened
   * `source_name`/`obj_result_type` onto Updates rows) — so their facet options are derived from
   * `unifiedList` (every currently-loaded row), not `allNotificationRows()` (Received+Sent only).
   */
  get typeFacetOptions(): string[] {
    const seen = new Set<string>();
    this.unifiedList.forEach(item => {
      const label = this.rowTypeLabel(item);
      if (label) seen.add(label);
    });
    return Array.from(seen.values());
  }

  get fundingFacetOptions(): { value: string; label: string }[] {
    const seen = new Map<string, string>();
    this.unifiedList.forEach((item: any) => {
      const sourceName = item?.obj_result?.source_name;
      if (sourceName === 'W1/W2') seen.set(sourceName, this.copy.notificationItem.fundingWindowW1W2);
      if (sourceName === 'W3/Bilaterals') seen.set(sourceName, this.copy.notificationItem.fundingWindowBilateral);
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }

  get resultTypeFacetOptions(): string[] {
    const seen = new Set<string>();
    this.unifiedList.forEach((item: any) => {
      const name = item?.obj_result?.obj_result_type?.name;
      if (name) seen.add(name);
    });
    return Array.from(seen.values());
  }

  get filteredResultTypeFacetOptions(): string[] {
    const query = this.resultTypeSearchQuery().trim().toLowerCase();
    if (!query) return this.resultTypeFacetOptions;
    return this.resultTypeFacetOptions.filter(option => option.toLowerCase().includes(query));
  }

  isTypeFilterChecked(label: string): boolean {
    return (this.resultsNotificationsSE.typeFilter ?? []).includes(label);
  }

  isFundingFilterChecked(value: string): boolean {
    return (this.resultsNotificationsSE.fundingFilter ?? []).includes(value);
  }

  isResultTypeFilterChecked(name: string): boolean {
    return (this.resultsNotificationsSE.resultTypeFilter ?? []).includes(name);
  }

  onTypeFilterChange(label: string, checked: boolean) {
    const current = this.resultsNotificationsSE.typeFilter ?? [];
    this.resultsNotificationsSE.typeFilter = checked ? [...current, label] : current.filter(value => value !== label);
  }

  onFundingFilterChange(value: string, checked: boolean) {
    const current = this.resultsNotificationsSE.fundingFilter ?? [];
    this.resultsNotificationsSE.fundingFilter = checked ? [...current, value] : current.filter(item => item !== value);
  }

  onResultTypeFilterChange(name: string, checked: boolean) {
    const current = this.resultsNotificationsSE.resultTypeFilter ?? [];
    this.resultsNotificationsSE.resultTypeFilter = checked ? [...current, name] : current.filter(value => value !== name);
  }

  isCenterFilterChecked(id: string | number): boolean {
    return (this.resultsNotificationsSE.centerIdsFilter ?? []).some(centerId => centerId == id);
  }

  isBilateralProjectFilterChecked(code: string): boolean {
    return (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).includes(code);
  }

  onCenterFilterChange(id: string | number, checked: boolean) {
    const current = this.resultsNotificationsSE.centerIdsFilter ?? [];
    this.resultsNotificationsSE.centerIdsFilter = checked ? [...current, id] : current.filter(centerId => centerId != id);
  }

  onBilateralProjectFilterChange(code: string, checked: boolean) {
    const current = this.resultsNotificationsSE.bilateralProjectIdsFilter ?? [];
    this.resultsNotificationsSE.bilateralProjectIdsFilter = checked ? [...current, code] : current.filter(projectCode => projectCode !== code);
  }

  get activeFilterCount(): number {
    const programCount = this.resultsNotificationsSE.initiativeIdFilter ? 1 : 0;
    const centerCount = this.resultsNotificationsSE.centerIdsFilter?.length ?? 0;
    const bilateralCount = this.resultsNotificationsSE.bilateralProjectIdsFilter?.length ?? 0;
    const typeCount = this.resultsNotificationsSE.typeFilter?.length ?? 0;
    const fundingCount = this.resultsNotificationsSE.fundingFilter?.length ?? 0;
    const resultTypeCount = this.resultsNotificationsSE.resultTypeFilter?.length ?? 0;
    return programCount + centerCount + bilateralCount + typeCount + fundingCount + resultTypeCount;
  }

  /** @akili-spec notifications/inbox-paginated-load — PAGE-R-10/PAGE-AC-6: the hint shown next to
   * "Load more" while a toolbar filter or the search box is active AND at least one source still has
   * more history to fetch — filters/search only narrow the rows already loaded into memory, so older
   * (not-yet-loaded) rows matching the active filter would otherwise appear to be missing. */
  get showFilteredHistoryHint(): boolean {
    const filtersActive = this.activeFilterCount > 0 || !!this.resultsNotificationsSE?.searchFilter;
    return filtersActive && !!this.resultsNotificationsSE?.hasMore;
  }

  get activeFilterChips(): ActiveFilterChip[] {
    const chips: ActiveFilterChip[] = [];

    if (this.resultsNotificationsSE.initiativeIdFilter) {
      const initiative: any = this.resultsNotificationsSE.filteredInitiatives.find(
        (init: any) => init.initiative_id == this.resultsNotificationsSE.initiativeIdFilter
      );
      chips.push({
        type: 'program',
        id: String(this.resultsNotificationsSE.initiativeIdFilter),
        label: initiative?.full_name ?? this.resultsNotificationsSE.entityLabel
      });
    }

    (this.resultsNotificationsSE.centerIdsFilter ?? []).forEach((id: string | number) => {
      const center = this.centerFacetOptions.find(option => option.id == id);
      chips.push({ type: 'center', id: String(id), label: center?.label ?? String(id) });
    });

    (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).forEach((code: string) => {
      const project = this.bilateralProjectFacetOptions.find(option => option.code === code);
      chips.push({ type: 'bilateral', id: code, label: project?.label ?? code });
    });

    (this.resultsNotificationsSE.typeFilter ?? []).forEach((label: string) => {
      chips.push({ type: 'type', id: label, label });
    });

    (this.resultsNotificationsSE.fundingFilter ?? []).forEach((value: string) => {
      const option = this.fundingFacetOptions.find(item => item.value === value);
      chips.push({ type: 'funding', id: value, label: option?.label ?? value });
    });

    (this.resultsNotificationsSE.resultTypeFilter ?? []).forEach((name: string) => {
      chips.push({ type: 'resultType', id: name, label: name });
    });

    return chips;
  }

  removeFilterChip(chip: ActiveFilterChip) {
    if (chip.type === 'program') {
      this.resultsNotificationsSE.initiativeIdFilter = null;
      return;
    }

    if (chip.type === 'center') {
      this.resultsNotificationsSE.centerIdsFilter = (this.resultsNotificationsSE.centerIdsFilter ?? []).filter(
        centerId => String(centerId) !== chip.id
      );
      return;
    }

    if (chip.type === 'bilateral') {
      this.resultsNotificationsSE.bilateralProjectIdsFilter = (this.resultsNotificationsSE.bilateralProjectIdsFilter ?? []).filter(
        projectCode => projectCode !== chip.id
      );
      return;
    }

    if (chip.type === 'type') {
      this.resultsNotificationsSE.typeFilter = (this.resultsNotificationsSE.typeFilter ?? []).filter(label => label !== chip.id);
      return;
    }

    if (chip.type === 'funding') {
      this.resultsNotificationsSE.fundingFilter = (this.resultsNotificationsSE.fundingFilter ?? []).filter(value => value !== chip.id);
      return;
    }

    this.resultsNotificationsSE.resultTypeFilter = (this.resultsNotificationsSE.resultTypeFilter ?? []).filter(
      name => name !== chip.id
    );
  }
}
