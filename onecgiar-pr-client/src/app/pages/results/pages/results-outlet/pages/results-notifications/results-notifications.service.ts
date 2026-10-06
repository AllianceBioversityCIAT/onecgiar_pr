import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../internationalization/contribution-request-drawer.copy';
import { buildDecisionBody, isP25 } from './utils/request-decision';

type SourceKey = 'received' | 'sent' | 'updates';

interface SourcePaging {
  hasMore: boolean;
  nextCursor: string | null;
}

interface SourceConfig {
  api: (options: { versionId?: any; scope?: 'pending' | 'history'; cursor?: string }) => any;
  pendingKey: string;
  historyKey: string;
  metaKey: string;
  dateField: string;
}

const ALL_SOURCES: SourceKey[] = ['received', 'sent', 'updates'];

@Injectable({
  providedIn: 'root'
})
export class ResultsNotificationsService {
  receivedData = {
    receivedContributionsPending: null,
    receivedContributionsDone: null
  };
  sentData = {
    sentContributionsPending: null,
    sentContributionsDone: null
  };

  updatesData = {
    notificationAnnouncements: [],
    notificationsPending: [],
    notificationsViewed: []
  };

  updatesPopUpData = [];

  loadingReceived = false;
  loadingSent = false;
  loadingUpdates = false;

  dataIPSR = [];
  notificationLength = null;
  phaseFilter = null;
  initiativeIdFilter = null;
  searchFilter = null;
  // NOTIF-T-6: Filter popover facets (Center / Bilateral project), multi-select. Live here (not on
  // the component) so received-requests/sent-requests templates can read them without prop-drilling,
  // the same reason initiativeIdFilter/searchFilter already live here.
  centerIdsFilter: (string | number)[] = [];
  bilateralProjectIdsFilter: string[] = [];
  // NOTIF-T-11 (`NOTIF-R-16`): Type / Funding / Result-type filter popover facets, multi-select —
  // same reasoning (single owner, read by the toolbar) as centerIdsFilter/bilateralProjectIdsFilter
  // above.
  typeFilter: string[] = [];
  fundingFilter: string[] = [];
  resultTypeFilter: string[] = [];

  // NOTIF-T-11 (rework attempt 2): Phase/Program state moved here from `ResultsNotificationsComponent`
  // AND `RequestsComponent` — those two components each had their OWN copy, which meant switching
  // phase on Requests then clicking over to Updates left Updates' Program dropdown showing the OLD
  // phase's initiatives under the OLD portfolio label (`NOTIF-AC-5` violation). Single owner now:
  // both components read `phaseList`/`filteredInitiatives`/`entityLabel` straight off this service,
  // same reasoning as `phaseFilter`/`initiativeIdFilter` above.
  phaseList = [];
  filteredInitiatives = [];
  entityLabel = 'Entity';

  // ---------------------------------------------------------------------------------------------
  // @akili-spec notifications/inbox-paginated-load
  // PAGE-T-4 — per-source paging state + load-generation guard (design.md §2.2, §6.2, PAGE-DD-7).
  //
  // `receivedData`/`sentData`/`updatesData` above STAY the view model the component/pipes already
  // read (PAGE-DD-4): `*Pending`/`notificationsPending` is the pending set (never paginated,
  // PAGE-R-2), `*Done`/`notificationsViewed` is the accumulated history across however many pages
  // have loaded (PAGE-R-3/R-4). Everything below only changes HOW those arrays get filled.
  // ---------------------------------------------------------------------------------------------

  /** Bumped on every `loadInbox()` call; a response whose captured generation no longer matches
   * `this.generation` is from a superseded phase load. Gates ONLY the inbox-wide `initialLoading`
   * bookkeeping (PAGE-R-5, PAGE-DD-7) — per-SOURCE data application is guarded by `sourceGen` below,
   * not by this field (Reviewer FAIL #2, attempt 2: a single global token does not protect a source
   * from a race against its OWN `refreshSource`/`loadMore` calls within the same generation). */
  private generation = 0;

  /**
   * PAGE-T-4 rework (Reviewer FAIL #2, attempt 2): one generation token PER SOURCE, independent of
   * `generation` above. Bumped by `loadInbox` (all 3 sources) AND by `refreshSource` (that source
   * only) — any fetch for a source captures `this.sourceGen[source]` at issue time and drops its
   * response (data application only — `onSettled` still always fires, see below) if the source has
   * since moved on to a newer generation. This is what makes `refreshSource` cancel an in-flight
   * `loadMore` page for the same source instead of letting it land afterwards, and what stops two
   * concurrent `refreshSource` calls on the same source from both appending/duplicating.
   */
  private sourceGen: Record<SourceKey, number> = { received: 0, sent: 0, updates: 0 };

  /** `true` while `loadInbox()`'s 3 pending requests (received/sent/updates) have not ALL arrived
   * yet — gates first render (PAGE-R-2: "list does not render rows until the pending set has
   * arrived"). Deliberately NOT gated on history: a history response racing ahead of pending must
   * not flip this early (falsifier (a)). */
  initialLoading = false;

  /** `true` while a `loadMore()` call has in-flight requests. A second `loadMore()` call while this
   * is `true` is a no-op — it must not issue any request (PAGE-R-4 "in-flight", falsifier (c)). */
  loadingMore = false;

  private paging: Record<SourceKey, SourcePaging> = {
    received: { hasMore: false, nextCursor: null },
    sent: { hasMore: false, nextCursor: null },
    updates: { hasMore: false, nextCursor: null }
  };

  /** Sources whose FIRST history page (of their current `sourceGen`) has not resolved yet. Exposed
   * via `historyLoading` for the component's "Loading history…" row (design.md §6.2). Membership is
   * added right before a first-page request is issued and removed in that request's own
   * error/complete handler — gated by `sourceGen` (L2) so a superseded (stale) completion cannot
   * clear the flag a NEWER fetch for the same source is still relying on. */
  private firstHistoryOutstanding = new Set<SourceKey>();

  private readonly sourceConfig: Record<SourceKey, SourceConfig> = {
    received: {
      api: options => this.api.resultsSE.GET_allRequest(options),
      pendingKey: 'receivedContributionsPending',
      historyKey: 'receivedContributionsDone',
      metaKey: 'doneMeta',
      dateField: 'requested_date'
    },
    sent: {
      api: options => this.api.resultsSE.GET_sentRequest(options),
      pendingKey: 'sentContributionsPending',
      historyKey: 'sentContributionsDone',
      metaKey: 'doneMeta',
      dateField: 'requested_date'
    },
    updates: {
      api: options => this.api.resultsSE.GET_requestUpdates(options),
      pendingKey: 'notificationsPending',
      historyKey: 'notificationsViewed',
      metaKey: 'viewedMeta',
      dateField: 'created_date'
    }
  };

  // ---------------------------------------------------------------------------------------------
  // @akili-spec notifications/bell-quick-inbox — BELL-T-2 (BELL-DD-1): the bell's own
  // phase-agnostic pending snapshot. Deliberately separate from `receivedData`/`updatesData`
  // (phase-filtered, BELL-P-3): fetched with `versionId` OMITTED so the badge never moves when the
  // inbox filters change (BELL-R-1, BELL-P-1/P-2).
  // ---------------------------------------------------------------------------------------------

  readonly bellReceived = signal<any[]>([]);
  readonly bellUpdates = signal<any[]>([]);
  readonly bellLoading = signal(false);
  readonly bellError = signal(false);

  /** Bumped on every `refreshBell()`; a response from an older call is dropped (it must not
   * overwrite a newer snapshot) and cannot clear `bellLoading` for the newer call. */
  private bellGen = 0;

  /** Decisions first (even when older than an update), then newest first inside each kind. Rows are
   * shallow copies tagged with `kind`; `decideRequest` strips the tag before building the body. */
  readonly bellItems = computed<any[]>(() => {
    const byDateDesc = (field: string) => (a: any, b: any) => (Date.parse(b?.[field]) || 0) - (Date.parse(a?.[field]) || 0);
    const decisions = this.bellReceived()
      .map(row => ({ ...row, kind: 'decision' }))
      .sort(byDateDesc('requested_date'));
    const updates = this.bellUpdates()
      .map(row => ({ ...row, kind: 'update' }))
      .sort(byDateDesc('created_date'));
    return [...decisions, ...updates];
  });

  readonly bellCount = computed(() => this.bellReceived().length + this.bellUpdates().length);

  /**
   * Reloads the bell snapshot: pending received requests + unread updates, ALL phases (no
   * `versionId`). Generation-guarded: only the latest call may apply data or settle loading/error.
   * A failed leg leaves the previous snapshot in place and flags `bellError`.
   */
  refreshBell(): void {
    const gen = ++this.bellGen;
    this.bellLoading.set(true);
    this.bellError.set(false);

    let settled = 0;
    const onSettled = () => {
      settled++;
      if (settled === 2 && gen === this.bellGen) this.bellLoading.set(false);
    };
    const onError = (err: any) => {
      this.logPagingError(err);
      if (gen === this.bellGen) this.bellError.set(true);
      onSettled();
    };

    this.api.resultsSE.GET_allRequest({ scope: 'pending' }).subscribe({
      next: ({ response }: any) => {
        if (gen !== this.bellGen || !response) return;
        this.bellReceived.set(response.receivedContributionsPending || []);
      },
      error: onError,
      complete: onSettled
    });

    this.api.resultsSE.GET_requestUpdates({ scope: 'pending' }).subscribe({
      next: ({ response }: any) => {
        if (gen !== this.bellGen || !response) return;
        this.bellUpdates.set(response.notificationsPending || []);
      },
      error: onError,
      complete: onSettled
    });
  }

  /**
   * BELL-T-10: the popover's "Mark as read". Marks EVERY unread update read through the same
   * `notification/read-all` endpoint the inbox uses — which takes no `versionId`, so it is
   * phase-agnostic like the bell snapshot — and then refreshes the bell. Pending decisions are not
   * touched. Deliberately not `markAllUpdatesNotificationsAsRead()`: that one returns early when the
   * phase-filtered inbox snapshot (`updatesData`) is empty, which is unrelated to what the bell holds.
   * Resolves after the refresh was requested; rejects (bell untouched) when the PATCH fails.
   */
  async markAllBellUpdatesRead(): Promise<void> {
    try {
      await firstValueFrom(this.api.resultsSE.PATCH_readAllNotifications(), { defaultValue: null });
    } catch (err) {
      console.error('ResultsNotificationsService: bell mark-all-read failed', (err as any)?.status);
      throw err;
    }

    // Keep an already-loaded inbox consistent with what the server just did (all phases).
    const pending = this.updatesData?.notificationsPending ?? [];
    if (pending.length) {
      pending.forEach(notification => (notification.read = true));
      this.updatesData.notificationsViewed = [...pending, ...(this.updatesData.notificationsViewed ?? [])].sort(
        (a, b) => Date.parse(b.created_date) - Date.parse(a.created_date)
      );
      this.updatesData.notificationsPending = [];
    }
    this.refreshBell();
  }

  /**
   * BELL-DD-2: records a decision on a bell row with the SAME body the inbox row sends. Resolves
   * on success and on 409 (stale: message shown, bell refreshed, row gone after the refresh);
   * rejects with the original error for anything else, leaving bell state untouched (BELL-R-8).
   */
  async decideRequest(row: any, isAccept: boolean): Promise<void> {
    const { kind: _kind, ...raw } = row ?? {};

    try {
      await firstValueFrom(this.api.resultsSE.PATCH_updateRequest(buildDecisionBody(raw, isAccept), isP25(raw)), { defaultValue: null });
    } catch (err: any) {
      console.error('ResultsNotificationsService: bell decision failed', err?.status);
      if (err?.status === 409) {
        this.api.alertsFe.show({
          id: 'noti-error',
          title: CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.staleRequestMessage,
          description: '',
          status: 'information'
        });
        this.refreshBell();
        return;
      }
      throw err;
    }

    this.bellReceived.update(rows => rows.filter(r => !Object.keys(raw).every(key => r?.[key] === raw[key])));
    this.api.alertsFe.show({
      id: 'noti',
      title: isAccept ? 'Request successfully accepted' : 'Request successfully rejected',
      status: isAccept ? 'success' : 'information'
    });
    // `refreshSource` refreshes the bell itself, so only one of the two is needed.
    if (this.phaseFilter) this.refreshSource('received');
    else this.refreshBell();
  }

  /** Any source still has a next page — drives "Load more" visibility (PAGE-R-4). */
  get hasMore(): boolean {
    return ALL_SOURCES.some(source => this.paging[source].hasMore);
  }

  /** Any source's first history page (this generation) is still outstanding. */
  get historyLoading(): boolean {
    return this.firstHistoryOutstanding.size > 0;
  }

  constructor(private readonly api: ApiService) {}

  // ---------------------------------------------------------------------------------------------
  // PAGE-T-4 — core paging methods
  // ---------------------------------------------------------------------------------------------

  /**
   * Phase change / inbox entry (PAGE-R-5, design.md §2.2). Bumps the load generation, discards
   * every loaded row AND cursor for all 3 sources, then fires all 6 requests (pending ×3, history
   * first page ×3) per source at once. `initialLoading` only clears once all 3 pending requests
   * have settled (success or error) — see the generation-captured `onPendingSettled` below.
   */
  loadInbox(phaseId?: any): void {
    this.generation++;
    const gen = this.generation;

    this.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [] };
    this.sentData = { sentContributionsPending: [], sentContributionsDone: [] };
    this.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
    this.paging = {
      received: { hasMore: false, nextCursor: null },
      sent: { hasMore: false, nextCursor: null },
      updates: { hasMore: false, nextCursor: null }
    };
    this.initialLoading = true;

    let pendingSettled = 0;
    const onPendingSettled = () => {
      pendingSettled++;
      if (pendingSettled === ALL_SOURCES.length && gen === this.generation) {
        this.initialLoading = false;
      }
    };

    ALL_SOURCES.forEach(source => {
      // PAGE-T-4 rework (Reviewer FAIL #2): bump this source's own generation too, so an in-flight
      // `loadMore`/`refreshSource` page from before this `loadInbox()` call cannot land afterwards.
      const sgen = ++this.sourceGen[source];
      this.setLoadingFlag(source, true);
      let legsSettled = 0;
      const onLegSettled = () => {
        legsSettled++;
        if (legsSettled === 2 && sgen === this.sourceGen[source]) {
          this.setLoadingFlag(source, false);
        }
      };
      this.fetchPending(source, phaseId, sgen, () => {
        onPendingSettled();
        onLegSettled();
      });
      this.fetchHistory(source, phaseId, sgen, undefined, onLegSettled);
    });
  }

  /**
   * "Load more" (PAGE-R-4). Fetches the next history page of every source that still has one,
   * appending to that source's existing array (never replacing it — falsifier (e): the array
   * reference must change only because new rows were concatenated in, not because it was rebuilt
   * from scratch). A second call while a previous one is still in flight does nothing at all
   * (falsifier (c)). Does NOT bump `sourceGen` itself — a `refreshSource`/`loadInbox` that starts
   * while a page is in flight bumps it instead, which is exactly what cancels this page's
   * application on arrival (Reviewer FAIL #2a).
   */
  loadMore(): void {
    if (this.loadingMore) return;

    const sources = ALL_SOURCES.filter(source => this.paging[source].hasMore);
    if (sources.length === 0) return;

    this.loadingMore = true;
    let settled = 0;
    const onSettled = () => {
      settled++;
      if (settled === sources.length) {
        this.loadingMore = false;
      }
    };

    sources.forEach(source => {
      const cursor = this.paging[source].nextCursor ?? undefined;
      const sgen = this.sourceGen[source];
      this.fetchHistory(source, this.phaseFilter, sgen, cursor, onSettled);
    });
  }

  /**
   * Pending + first history page for ONE source at the given phase (design.md §6.2). Replaces that
   * source's history entirely — any Load-more pages already fetched (or still in flight) for it are
   * discarded (PAGE-DD-6, a known/accepted reversion; Reviewer FAIL #2a/#2b). Does not touch the
   * other 2 sources or bump the inbox-wide `generation` (a socket event or single-request refresh
   * must not reset the whole inbox). `versionId` defaults to the current `phaseFilter` when omitted
   * (Leader L1) so a T-5 caller can call `refreshSource('received')` with no explicit phase.
   */
  refreshSource(source: SourceKey, versionId: any = this.phaseFilter, callback?: () => void): void {
    this.resetSourceView(source);
    this.paging = { ...this.paging, [source]: { hasMore: false, nextCursor: null } };

    // PAGE-T-4 rework (Reviewer FAIL #2b): bumping this source's generation cancels any OTHER
    // in-flight fetch for the same source (an earlier loadMore page, or a concurrent refreshSource
    // call) — their responses will still settle `onSettled`, but will no longer apply their data or
    // clear this call's `loadingX`/callback (L2's sgen-gated settle check below).
    const sgen = ++this.sourceGen[source];
    this.setLoadingFlag(source, true);
    let legsSettled = 0;
    const onLegSettled = () => {
      legsSettled++;
      if (legsSettled === 2 && sgen === this.sourceGen[source]) {
        this.setLoadingFlag(source, false);
        callback?.();
      }
    };

    this.fetchPending(source, versionId, sgen, onLegSettled);
    this.fetchHistory(source, versionId, sgen, undefined, onLegSettled);

    // BELL-R-11: the bell mirrors whatever the inbox just refreshed (received decisions, updates).
    if (source !== 'sent') this.refreshBell();
  }

  /** Pending set only, for callers outside the inbox (boot-time bell/header — design.md §6.2).
   * `versionId` defaults to the current `phaseFilter` when omitted (Leader L1). Does not bump
   * `sourceGen` (it never touches history/paging), but still captures the CURRENT `sourceGen` so a
   * concurrent `refreshSource`/`loadInbox` on the same source — which does bump it — correctly
   * supersedes this fetch's own data application. */
  refreshPending(source: SourceKey, versionId: any = this.phaseFilter): void {
    const sgen = this.sourceGen[source];
    this.fetchPending(source, versionId, sgen);
  }

  private fetchPending(source: SourceKey, versionId: any, sgen: number, onSettled?: () => void): void {
    const config = this.sourceConfig[source];
    config.api({ versionId, scope: 'pending' }).subscribe({
      next: ({ response }: any) => {
        if (sgen !== this.sourceGen[source] || !response) return;

        const rows = (response[config.pendingKey] || [])
          .slice()
          .sort((a: any, b: any) => Date.parse(b?.[config.dateField]) - Date.parse(a?.[config.dateField]));
        this.applyPendingRows(source, rows);

        if (source === 'updates') {
          this.updatesData = { ...this.updatesData, notificationAnnouncements: response.notificationAnnouncement || [] };
        }
      },
      error: err => {
        this.logPagingError(err);
        onSettled?.();
      },
      complete: () => onSettled?.()
    });
  }

  private fetchHistory(source: SourceKey, versionId: any, sgen: number, cursor: string | undefined, onSettled?: () => void): void {
    const isFirstPage = cursor === undefined;
    if (isFirstPage) this.firstHistoryOutstanding.add(source);

    const config = this.sourceConfig[source];
    config.api({ versionId, scope: 'history', cursor }).subscribe({
      next: ({ response }: any) => {
        if (sgen !== this.sourceGen[source] || !response) return;

        const rows = response[config.historyKey] || [];
        // PAGE-R-11/design.md §11: missing meta (e.g. an old server during rollback) -> hasMore:false.
        const meta = response[config.metaKey] || { hasMore: false, nextCursor: null };
        // PAGE-T-4 rework (Reviewer FAIL #2b): a FIRST page always SETS the history array (it is
        // always preceded by `resetSourceView`/`loadInbox`'s reset, so there is nothing to append
        // to); only a `loadMore` page (not the first) appends. Appending a first page as well would
        // double it the moment two first-page fetches for the same source ever both reach here.
        if (isFirstPage) {
          this.setHistoryRows(source, rows);
        } else {
          this.appendHistoryRows(source, rows);
        }
        this.paging = { ...this.paging, [source]: { hasMore: !!meta.hasMore, nextCursor: meta.nextCursor ?? null } };
      },
      error: err => {
        this.logPagingError(err);
        // PAGE-R-4 "error": already-loaded rows and paging stay untouched, so Load more stays
        // available to retry (falsifier (d)).
        if (isFirstPage && sgen === this.sourceGen[source]) this.firstHistoryOutstanding.delete(source);
        onSettled?.();
      },
      complete: () => {
        // L2: only clear `historyLoading` for this source if THIS is still the current fetch — a
        // stale (superseded) completion must not clear the flag a newer fetch is relying on.
        if (isFirstPage && sgen === this.sourceGen[source]) this.firstHistoryOutstanding.delete(source);
        onSettled?.();
      }
    });
  }

  /** `.cursorrules`: never log a request's URL/params (the cursor travels in there) — only a status
   * code and a static message. */
  private logPagingError(err: any): void {
    console.error('ResultsNotificationsService: paginated request failed', err?.status);
  }

  private applyPendingRows(source: SourceKey, rows: any[]): void {
    switch (source) {
      case 'received':
        this.receivedData = { ...this.receivedData, receivedContributionsPending: rows };
        break;
      case 'sent':
        this.sentData = { ...this.sentData, sentContributionsPending: rows };
        break;
      case 'updates':
        this.updatesData = { ...this.updatesData, notificationsPending: rows };
        break;
    }
  }

  /** A FIRST history page REPLACES the source's history array (always a fresh copy, never the
   * response's own array reference) — used by `loadInbox`/`refreshSource`, both of which already
   * reset that source's view before issuing the request. Reviewer FAIL #2b: this is what stops a
   * `loadMore` page's leftover rows (or a second concurrent first-page fetch) from being appended
   * onto a freshly-reset source instead of replacing it. */
  private setHistoryRows(source: SourceKey, rows: any[]): void {
    switch (source) {
      case 'received':
        this.receivedData = { ...this.receivedData, receivedContributionsDone: [...rows] };
        break;
      case 'sent':
        this.sentData = { ...this.sentData, sentContributionsDone: [...rows] };
        break;
      case 'updates':
        this.updatesData = { ...this.updatesData, notificationsViewed: [...rows] };
        break;
    }
  }

  /** Always concatenates into a NEW array (never mutates the existing one in place) — falsifier (e):
   * an unchanged array reference after an append would silently break any memoization keyed on it.
   * Only used for a `loadMore` (non-first) page. */
  private appendHistoryRows(source: SourceKey, rows: any[]): void {
    switch (source) {
      case 'received':
        this.receivedData = {
          ...this.receivedData,
          receivedContributionsDone: [...(this.receivedData.receivedContributionsDone || []), ...rows]
        };
        break;
      case 'sent':
        this.sentData = {
          ...this.sentData,
          sentContributionsDone: [...(this.sentData.sentContributionsDone || []), ...rows]
        };
        break;
      case 'updates':
        this.updatesData = {
          ...this.updatesData,
          notificationsViewed: [...(this.updatesData.notificationsViewed || []), ...rows]
        };
        break;
    }
  }

  private resetSourceView(source: SourceKey): void {
    switch (source) {
      case 'received':
        this.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [] };
        break;
      case 'sent':
        this.sentData = { sentContributionsPending: [], sentContributionsDone: [] };
        break;
      case 'updates':
        this.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
        break;
    }
  }

  private setLoadingFlag(source: SourceKey, value: boolean): void {
    if (source === 'received') this.loadingReceived = value;
    else if (source === 'sent') this.loadingSent = value;
    else this.loadingUpdates = value;
  }

  // ---------------------------------------------------------------------------------------------
  // Legacy wrappers — kept so existing callers/specs keep compiling unchanged (PAGE-T-4 scope: T-5
  // migrates the 4 external callers, T-6 migrates the component). Each is a thin delegation to
  // `refreshSource` above (design.md §6.2).
  // ---------------------------------------------------------------------------------------------

  get_sent_notifications(versionId?, callback?) {
    this.refreshSource('sent', versionId, callback);
  }

  get_section_information(versionId?, callback?) {
    this.refreshSource('received', versionId, callback);
  }

  get_updates_notifications(versionId?) {
    this.refreshSource('updates', versionId);
  }

  get_updates_pop_up_notifications() {
    this.api.resultsSE.GET_notificationsPopUp().subscribe({
      next: ({ response }) => {
        const orderedUpdatesUnread = response.sort((a, b) => {
          const dateA = a.notification_id ? Date.parse(a.created_date) : Date.parse(a.requested_date);
          const dateB = b.notification_id ? Date.parse(b.created_date) : Date.parse(b.requested_date);
          return dateB - dateA;
        });

        this.updatesPopUpData = orderedUpdatesUnread;
      },
      error: err => console.error(err)
    });
  }

  get_section_innovation_packages() {
    this.api.resultsSE.GET_requestIPSR().subscribe(({ response }) => {
      if (!response) return;

      const { requestData, requestPendingData } = response;
      const myInitiativesIds = this.api.dataControlSE.myInitiativesList.map(initiative => initiative.initiative_id);
      const isNotAdmin = !this.api.rolesSE.isAdmin;

      const processRequestData = data => {
        return data
          .filter(item => item.result_type_id === 10)
          .map(item => {
            const shouldUpdateStatus =
              isNotAdmin && !myInitiativesIds.includes(item.requester_initiative_id) && myInitiativesIds.includes(item.owner_initiative_id);

            if (shouldUpdateStatus) {
              return {
                ...item,
                request_status_id: 4,
                shared_inititiative_id: item.requester_initiative_id,
                pending: true
              };
            }
            return item;
          });
      };

      const updateRequestData = processRequestData(requestData);
      const updateRequestPendingData = processRequestData(requestPendingData);

      this.dataIPSR = [...updateRequestData, ...updateRequestPendingData].sort((a, b) => a.request_status_id - b.request_status_id);
    });
  }

  readUpdatesNotifications(notification) {
    const initialViewed = this.updatesData.notificationsViewed.map(notification => ({ ...notification }));
    const initialPending = this.updatesData.notificationsPending.map(notification => ({ ...notification }));

    notification.read = !notification.read;

    if (notification.read) {
      this.updatesData.notificationsViewed.push(notification);
      this.updatesData.notificationsPending = this.updatesData.notificationsPending.filter(noti => noti !== notification);
    } else {
      this.updatesData.notificationsPending.push(notification);
      this.updatesData.notificationsViewed = this.updatesData.notificationsViewed.filter(noti => noti !== notification);
    }

    // NOTIF-T-6 rework (Reviewer's remediation item 1): the round-trip through the now-deleted
    // `.../requests`/`.../updates` routes was dead weight even before those routes existed to
    // navigate to — `ResultsNotificationsComponent`'s own getters (`unifiedList` etc.) already
    // recompute reactively off `updatesData` on the next change-detection pass, so mutating the
    // arrays above is the whole update. No navigation needed.

    this.updatesData.notificationsViewed.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));
    this.updatesData.notificationsPending.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));

    this.api.resultsSE.PATCH_readNotification(notification.notification_id).subscribe({
      next: () => this.refreshBell(),
      error: err => {
        this.updatesData.notificationsViewed = initialViewed;
        this.updatesData.notificationsPending = initialPending;
        console.error(err);
      }
    });
  }

  markAllUpdatesNotificationsAsRead() {
    if (this.updatesData.notificationsPending.length === 0) return;

    const initialViewed = this.updatesData.notificationsViewed.map(notification => ({ ...notification }));
    const initialPending = this.updatesData.notificationsPending.map(notification => ({ ...notification }));

    this.updatesData.notificationsPending.forEach(notification => {
      notification.read = true;
      this.updatesData.notificationsViewed.push(notification);
    });

    // NOTIF-T-6 rework (Reviewer's remediation item 1 — "Mark all as read" was itself broken by
    // the deleted `.../updates` route this used to navigate through). Same reasoning as
    // `readUpdatesNotifications()` above: the mutation is the update, no navigation needed.

    this.updatesData.notificationsViewed.sort((a, b) => Date.parse(b.created_date) - Date.parse(a.created_date));
    this.updatesData.notificationsPending = [];

    this.api.resultsSE.PATCH_readAllNotifications().subscribe({
      next: () => this.refreshBell(),
      error: err => {
        console.error(err);
        this.updatesData.notificationsViewed = initialViewed;
        this.updatesData.notificationsPending = initialPending;
      }
    });
  }

  handlePopUpNotificationLastViewed() {
    this.api.resultsSE.PATCH_handlePopUpViewed(this.api.authSE?.localStorageUser?.id).subscribe({
      next: () => {},
      error: err => console.error(err)
    });
  }

  // ---------------------------------------------------------------------
  // NOTIF-T-11 (rework attempt 2) — Phase/Program state, single owner
  // ---------------------------------------------------------------------

  onPhaseChange(phaseId) {
    // @akili-spec notifications/inbox-paginated-load — PAGE-R-5: a phase change discards every
    // loaded row/cursor and reloads pending + first history pages for the new phase. `loadInbox`
    // (not the 3 legacy wrappers) is now the single source of that fetch.
    this.loadInbox(phaseId);
    this.filterInitiativesByPhase(phaseId);
  }

  filterInitiativesByPhase(phaseId) {
    const selectedPhase = this.phaseList.find(p => p.id == phaseId);
    if (!selectedPhase) return;

    const portfolioId = selectedPhase.obj_portfolio?.id;
    const portfolioAcronym = selectedPhase.obj_portfolio?.acronym?.toLowerCase();

    this.entityLabel = portfolioId === 2 ? 'Initiative' : 'Entity';

    if (this.api.rolesSE.isAdmin) {
      this.api.resultsSE.GET_AllInitiatives(portfolioAcronym).subscribe(({ response }) => {
        this.filteredInitiatives = response;
      });
    } else {
      this.filteredInitiatives = this.api.dataControlSE.myInitiativesList.filter(init => init.portfolio_id === portfolioId);
    }
  }

  /**
   * @param onPhaseUnresolved NOTIF-T-6 rework (double-fetch advisory): invoked only when NO phase
   * resolves (neither an already-set `phaseFilter` nor the active reporting phase). When a phase
   * DOES resolve, `onPhaseChange()` below is the single source of the Received/Sent/Updates fetch —
   * the caller must NOT also fetch those three directly, or every normal page load issues them
   * twice. The callback exists so `ResultsNotificationsComponent.ngOnInit()` still has a fallback
   * fetch for the (rarer) case where no phase resolves at all.
   */
  getAllPhases(onPhaseUnresolved?: () => void) {
    // NOTIF-T-11 (rework attempt 3): NO re-fetch guard here — restored to the original,
    // pre-NOTIF-T-11 behavior. `RequestsComponent` has no `ngOnInit` at all (see its class-level
    // doc comment) and never calls this; only `ResultsNotificationsComponent.ngOnInit()` calls it, exactly once per
    // navigation into `results-notifications`, so there is no double-fetch to guard against. A
    // length-based "already populated" guard was tried in attempt 2 and caused a real regression:
    // since this service is `providedIn: 'root'` and `phaseList` is never cleared, the guard made
    // every subsequent entry a silent no-op (`onPhaseChange()` never re-ran), so Updates showed
    // stale data on a second visit and `?phase=` deep-linking stopped re-deriving state.
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe(({ response }) => {
      this.phaseList = response;
      // P2-3106 (AC2): default the Phases dropdown to the current active reporting phase when none is set
      // (a phase from query params, applied in ResultsNotificationsComponent.setQueryParams, takes precedence).
      if (!this.phaseFilter) {
        const activePhaseId = this.api.dataControlSE.reportingCurrentPhase?.phaseId;
        if (activePhaseId && this.phaseList.some(p => p.id == activePhaseId)) {
          this.phaseFilter = activePhaseId;
        }
      }
      if (this.phaseFilter) {
        this.onPhaseChange(this.phaseFilter);
      } else {
        onPhaseUnresolved?.();
      }
    });
  }

  resetNotificationInformation() {
    this.receivedData = {
      receivedContributionsPending: null,
      receivedContributionsDone: null
    };
    this.sentData = {
      sentContributionsPending: null,
      sentContributionsDone: null
    };
    this.phaseFilter = null;
    this.resetFilters();
  }

  resetFilters() {
    this.initiativeIdFilter = null;
    this.searchFilter = null;
    // NOTIF-T-6 (NOTIF-AC-4): "Clear all" resets every facet, including these two.
    this.centerIdsFilter = [];
    this.bilateralProjectIdsFilter = [];
    // NOTIF-T-11: "Clear all" resets these three facets too.
    this.typeFilter = [];
    this.fundingFilter = [];
    this.resultTypeFilter = [];
  }
}
