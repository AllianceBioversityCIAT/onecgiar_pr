import { TestBed } from '@angular/core/testing';
import { ResultsNotificationsService } from './results-notifications.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { environment } from '../../../../../../../environments/environment';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { StatusPhaseEnum, ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';

// @akili-spec notifications/inbox-paginated-load
// PAGE-T-4: default scope-aware mocks for the 3 paging endpoints — `options.scope === 'history'`
// returns the history page shape (+ meta); anything else (including no options, legacy callers)
// returns the pending-set shape. Individual tests override via `jest.spyOn(...).mockReturnValue`/
// `mockImplementation` or plain reassignment, same as before.
const makeDefaultPagingEndpoint = (pendingKey: string, historyKey: string, metaKey: string, announcementKey?: string) =>
  jest.fn((options?: any) => {
    if (options?.scope === 'history') {
      return of({ response: { [historyKey]: [], [metaKey]: { hasMore: false, nextCursor: null } } });
    }
    const response: any = { [pendingKey]: [] };
    if (announcementKey) response[announcementKey] = [];
    return of({ response });
  });

describe('ResultsNotificationsService', () => {
  let service: ResultsNotificationsService;
  let mockApiService: any;
  const mockGET_allRequestResponse = {
    requestData: [
      {
        approving_inititiative_id: 1,
        result_type_id: 10
      }
    ],
    requestPendingData: [
      {
        request_status_id: 1,
        requester_initiative_id: 1,
        result_type_id: 10
      }
    ]
  };

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_allRequest: makeDefaultPagingEndpoint('receivedContributionsPending', 'receivedContributionsDone', 'doneMeta'),
        GET_requestStatus: () => of({}),
        GET_requestIPSR: () => of({ response: mockGET_allRequestResponse }),
        GET_sentRequest: makeDefaultPagingEndpoint('sentContributionsPending', 'sentContributionsDone', 'doneMeta'),
        GET_requestUpdates: makeDefaultPagingEndpoint('notificationsPending', 'notificationsViewed', 'viewedMeta', 'notificationAnnouncement'),
        GET_notificationsPopUp: () => of({}),
        GET_notificationAttentionCounts: () => of({ response: { unseenRequests: 0, pendingRequests: 0, unreadUpdates: 0 } }),
        GET_versioning: () => of({ response: [] }),
        GET_AllInitiatives: () => of({ response: [] }),
        PATCH_readNotification: () => of({}),
        PATCH_readAllNotifications: () => of({}),
        PATCH_handlePopUpViewed: () => of({})
      },
      dataControlSE: {
        myInitiativesList: [
          {
            role: 'Member',
            initiative_id: 1
          }
        ],
        reportingCurrentPhase: null
      },
      rolesSE: {
        isAdmin: false
      }
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    });
    service = TestBed.inject(ResultsNotificationsService);
  });

  // -----------------------------------------------------------------------------------------
  // PAGE-T-4 — core paging: loadInbox / loadMore / refreshSource / refreshPending
  // -----------------------------------------------------------------------------------------

  describe('loadInbox()', () => {
    function makeDeferredEndpoint() {
      const pending$ = new Subject<any>();
      const history$ = new Subject<any>();
      const fn = jest.fn((options?: any) => (options?.scope === 'history' ? history$.asObservable() : pending$.asObservable()));
      return { fn, pending$, history$ };
    }

    it('fires pending + first history page for all 3 sources at once, and populates the view model once settled', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ requested_date: '2023-02-01' }], doneMeta: { hasMore: true, nextCursor: 'cursor-1' } } })
          : of({ response: { receivedContributionsPending: [{ requested_date: '2023-01-02' }, { requested_date: '2023-01-04' }] } })
      );

      service.loadInbox(7);

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 7, scope: 'pending', limit: 50 });
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 7, scope: 'history', cursor: undefined });
      expect(service.receivedData).toEqual({
        receivedContributionsPending: [{ requested_date: '2023-01-04' }, { requested_date: '2023-01-02' }],
        receivedContributionsDone: [{ requested_date: '2023-02-01' }]
      });
      expect(service.initialLoading).toBe(false);
      expect(service.historyLoading).toBe(false);
      expect(service.hasMore).toBe(true);
    });

    // Falsifier (a): history resolving before pending must NOT flip initialLoading early.
    it('keeps initialLoading true until ALL 3 pending responses arrive, even when every history page resolves first (falsifier a)', () => {
      const received = makeDeferredEndpoint();
      const sent = makeDeferredEndpoint();
      const updates = makeDeferredEndpoint();
      mockApiService.resultsSE.GET_allRequest = received.fn;
      mockApiService.resultsSE.GET_sentRequest = sent.fn;
      mockApiService.resultsSE.GET_requestUpdates = updates.fn;

      service.loadInbox(1);
      expect(service.initialLoading).toBe(true);

      // All 3 history pages resolve first.
      received.history$.next({ response: { receivedContributionsDone: [{ id: 'r' }], doneMeta: { hasMore: false, nextCursor: null } } });
      received.history$.complete();
      sent.history$.next({ response: { sentContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } });
      sent.history$.complete();
      updates.history$.next({ response: { notificationsViewed: [], viewedMeta: { hasMore: false, nextCursor: null } } });
      updates.history$.complete();

      expect(service.initialLoading).toBe(true);

      // 2 of 3 pending resolve.
      received.pending$.next({ response: { receivedContributionsPending: [] } });
      received.pending$.complete();
      sent.pending$.next({ response: { sentContributionsPending: [] } });
      sent.pending$.complete();

      expect(service.initialLoading).toBe(true);

      // 3rd (last) pending resolves.
      updates.pending$.next({ response: { notificationsPending: [], notificationAnnouncement: [] } });
      updates.pending$.complete();

      expect(service.initialLoading).toBe(false);
    });

    // Falsifier (b): a stale phase's responses arriving after a newer loadInbox() must be dropped.
    it('drops stale responses from a superseded loadInbox call (generation guard, falsifier b)', () => {
      const receivedA = makeDeferredEndpoint();
      mockApiService.resultsSE.GET_allRequest = receivedA.fn;
      mockApiService.resultsSE.GET_sentRequest = () => of({ response: { sentContributionsPending: [] } });
      mockApiService.resultsSE.GET_requestUpdates = () => of({ response: { notificationsPending: [], notificationAnnouncement: [] } });

      service.loadInbox('A');

      const receivedB = makeDeferredEndpoint();
      mockApiService.resultsSE.GET_allRequest = receivedB.fn;
      service.loadInbox('B');

      // Phase A's requests (issued before the reset) resolve AFTER phase B's loadInbox already ran.
      receivedA.pending$.next({ response: { receivedContributionsPending: [{ share_result_request_id: 'A-pending' }] } });
      receivedA.pending$.complete();
      receivedA.history$.next({
        response: { receivedContributionsDone: [{ share_result_request_id: 'A-done' }], doneMeta: { hasMore: false, nextCursor: null } }
      });
      receivedA.history$.complete();

      expect(service.receivedData.receivedContributionsPending).toEqual([]);
      expect(service.receivedData.receivedContributionsDone).toEqual([]);

      // Phase B's own pending/history still land correctly.
      receivedB.pending$.next({ response: { receivedContributionsPending: [{ share_result_request_id: 'B-pending' }] } });
      receivedB.pending$.complete();
      receivedB.history$.next({
        response: { receivedContributionsDone: [{ share_result_request_id: 'B-done' }], doneMeta: { hasMore: false, nextCursor: null } }
      });
      receivedB.history$.complete();

      expect(service.receivedData.receivedContributionsPending).toEqual([{ share_result_request_id: 'B-pending' }]);
      expect(service.receivedData.receivedContributionsDone).toEqual([{ share_result_request_id: 'B-done' }]);
    });

    it('discards phase A rows and cursors on a phase change (PAGE-R-5)', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ id: 'a' }], doneMeta: { hasMore: true, nextCursor: 'cur-a' } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      service.loadInbox('A');
      expect(service.hasMore).toBe(true);

      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      service.loadInbox('B');

      expect(service.receivedData.receivedContributionsDone).toEqual([]);
      expect(service.hasMore).toBe(false);
    });

    it('treats a missing meta object as hasMore:false (design.md §11)', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history' ? of({ response: { receivedContributionsDone: [{ id: 1 }] } }) : of({ response: { receivedContributionsPending: [] } })
      );

      service.loadInbox();

      expect(service.hasMore).toBe(false);
    });
  });

  describe('loadMore()', () => {
    /** Primes `received` with hasMore:true/nextCursor:'c1' and one already-loaded history row;
     * `sent`/`updates` are fully exhausted. All synchronous (`of(...)`). */
    function primeReceivedHasMore() {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ share_result_request_id: 1 }], doneMeta: { hasMore: true, nextCursor: 'c1' } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      mockApiService.resultsSE.GET_sentRequest = () =>
        of({ response: { sentContributionsPending: [], sentContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } });
      mockApiService.resultsSE.GET_requestUpdates = () =>
        of({
          response: { notificationsPending: [], notificationsViewed: [], notificationAnnouncement: [], viewedMeta: { hasMore: false, nextCursor: null } }
        });
      service.loadInbox(1);
      service.phaseFilter = 1; // loadMore() reads the current phaseFilter directly (design.md §6.2)
    }

    it('does nothing when every source is exhausted', () => {
      service.loadInbox(1); // default mocks -> hasMore:false everywhere
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest');
      spy.mockClear();

      service.loadMore();

      expect(spy).not.toHaveBeenCalled();
    });

    it('requests the next page using the stored cursor, for only the sources with hasMore', () => {
      primeReceivedHasMore();
      const spy = jest.fn(() => of({ response: { receivedContributionsDone: [{ share_result_request_id: 2 }], doneMeta: { hasMore: false, nextCursor: null } } }));
      mockApiService.resultsSE.GET_allRequest = spy;
      const sentSpy = jest.spyOn(mockApiService.resultsSE, 'GET_sentRequest');
      const updatesSpy = jest.spyOn(mockApiService.resultsSE, 'GET_requestUpdates');

      service.loadMore();

      expect(spy).toHaveBeenCalledWith({ versionId: 1, scope: 'history', cursor: 'c1' });
      expect(sentSpy).not.toHaveBeenCalled();
      expect(updatesSpy).not.toHaveBeenCalled();
    });

    // Falsifier (e): the appended array must be a NEW reference, never the same one mutated in place.
    it('appends to a NEW array reference, never mutating the existing one (falsifier e)', () => {
      primeReceivedHasMore();
      const beforeRef = service.receivedData.receivedContributionsDone;

      mockApiService.resultsSE.GET_allRequest = jest.fn(() =>
        of({ response: { receivedContributionsDone: [{ share_result_request_id: 2 }], doneMeta: { hasMore: false, nextCursor: null } } })
      );

      service.loadMore();

      expect(service.receivedData.receivedContributionsDone).not.toBe(beforeRef);
      expect(service.receivedData.receivedContributionsDone).toEqual([{ share_result_request_id: 1 }, { share_result_request_id: 2 }]);
      expect(service.hasMore).toBe(false);
    });

    // Falsifier (c): a second loadMore() call while the first is still in flight must issue NO request.
    it('a second loadMore() call while the first is in flight issues no additional request (falsifier c)', () => {
      primeReceivedHasMore();
      const history$ = new Subject<any>();
      const historySpy = jest.fn((options?: any) =>
        options?.scope === 'history' ? history$.asObservable() : of({ response: { receivedContributionsPending: [] } })
      );
      mockApiService.resultsSE.GET_allRequest = historySpy;

      service.loadMore();
      expect(historySpy).toHaveBeenCalledTimes(1);
      expect(service.loadingMore).toBe(true);

      service.loadMore(); // in flight — must be a no-op
      expect(historySpy).toHaveBeenCalledTimes(1);

      history$.next({ response: { receivedContributionsDone: [{ share_result_request_id: 2 }], doneMeta: { hasMore: false, nextCursor: null } } });
      history$.complete();

      expect(service.loadingMore).toBe(false);
    });

    // Falsifier (d): an error on the next page keeps already-loaded rows and clears the busy state.
    it('keeps previously-loaded rows and clears busy state when the next page errors, leaving retry available (falsifier d)', () => {
      primeReceivedHasMore();
      const beforeRows = service.receivedData.receivedContributionsDone;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history' ? throwError(() => ({ status: 503 })) : of({ response: { receivedContributionsPending: [] } })
      );

      service.loadMore();

      expect(consoleSpy).toHaveBeenCalledWith('ResultsNotificationsService: paginated request failed', 503);
      expect(service.receivedData.receivedContributionsDone).toEqual(beforeRows);
      expect(service.loadingMore).toBe(false);
      expect(service.hasMore).toBe(true); // paging untouched by the error -> Load more stays available
    });
  });

  describe('refreshSource()', () => {
    it('fetches pending + first history page for one source only, and calls back once both legs settle', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ requested_date: '2023-01-01' }], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [{ requested_date: '2023-01-02' }] } })
      );
      const sentSpy = jest.spyOn(mockApiService.resultsSE, 'GET_sentRequest');
      const updatesSpy = jest.spyOn(mockApiService.resultsSE, 'GET_requestUpdates');
      const callback = jest.fn();

      service.refreshSource('received', 3, callback);

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 3, scope: 'pending', limit: 50 });
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 3, scope: 'history', cursor: undefined });
      expect(sentSpy).not.toHaveBeenCalled();
      // BELL-T-2: `refreshSource` also refreshes the bell (phase-agnostic `{ scope: 'pending' }` calls);
      // what must stay untouched is the OTHER source's phase-scoped inbox fetch.
      expect(updatesSpy).not.toHaveBeenCalledWith(expect.objectContaining({ versionId: 3 }));
      expect(service.receivedData).toEqual({
        receivedContributionsPending: [{ requested_date: '2023-01-02' }],
        receivedContributionsDone: [{ requested_date: '2023-01-01' }]
      });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('drops any already-loaded Load-more pages for that source (replaces history, does not append to it)', () => {
      mockApiService.resultsSE.GET_sentRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { sentContributionsDone: [{ id: 1 }], doneMeta: { hasMore: true, nextCursor: 'c1' } } })
          : of({ response: { sentContributionsPending: [] } })
      );
      service.loadInbox(1); // loads page 1 of `sent`, hasMore true
      mockApiService.resultsSE.GET_sentRequest = jest.fn(() =>
        of({ response: { sentContributionsDone: [{ id: 2 }], doneMeta: { hasMore: false, nextCursor: null } } })
      );
      service.loadMore(); // loads page 2, sentContributionsDone now has 2 rows
      expect(service.sentData.sentContributionsDone).toEqual([{ id: 1 }, { id: 2 }]);

      mockApiService.resultsSE.GET_sentRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { sentContributionsDone: [{ id: 1 }], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { sentContributionsPending: [] } })
      );

      service.refreshSource('sent', 1);

      expect(service.sentData.sentContributionsDone).toEqual([{ id: 1 }]);
      expect(service.hasMore).toBe(false);
    });

    it('does not touch the other two sources', () => {
      mockApiService.resultsSE.GET_allRequest = () =>
        of({ response: { receivedContributionsPending: [{ id: 'keep' }], receivedContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } });
      service.loadInbox(1);

      mockApiService.resultsSE.GET_sentRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { sentContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { sentContributionsPending: [] } })
      );

      service.refreshSource('sent', 1);

      expect(service.receivedData.receivedContributionsPending).toEqual([{ id: 'keep' }]);
    });

    // L1 (Leader adjudication, attempt 2): refreshSource must default versionId to the current
    // phaseFilter when the caller omits it, so a future T-5 caller can call refreshSource('received')
    // with no explicit phase.
    it('defaults versionId to the current phaseFilter when omitted (Leader L1)', () => {
      service.phaseFilter = 42;
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [] } })
      );

      service.refreshSource('received');

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'pending', limit: 50 });
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'history', cursor: undefined });
    });

    // Reviewer FAIL #2a (attempt 2): a loadMore() page requested BEFORE refreshSource(X) starts, but
    // landing AFTER it, must be dropped entirely — not appended onto the freshly-reset source, and
    // must not overwrite the fresh page's paging/cursor with its own stale one.
    it('drops a loadMore page that lands AFTER refreshSource() on the same source started (falsifier 2a)', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ id: 1 }], doneMeta: { hasMore: true, nextCursor: 'c1' } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      mockApiService.resultsSE.GET_sentRequest = () =>
        of({ response: { sentContributionsPending: [], sentContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } });
      mockApiService.resultsSE.GET_requestUpdates = () =>
        of({
          response: { notificationsPending: [], notificationsViewed: [], notificationAnnouncement: [], viewedMeta: { hasMore: false, nextCursor: null } }
        });
      service.loadInbox(1);
      service.phaseFilter = 1;

      // loadMore() starts, but `received`'s next page is DEFERRED (still in flight).
      const loadMoreHistory$ = new Subject<any>();
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history' ? loadMoreHistory$.asObservable() : of({ response: { receivedContributionsPending: [] } })
      );
      service.loadMore();
      expect(service.loadingMore).toBe(true);

      // refreshSource('received') starts AND completes (synchronous mock) before the stale page lands.
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ id: 'fresh' }], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      service.refreshSource('received', 1);

      expect(service.receivedData.receivedContributionsDone).toEqual([{ id: 'fresh' }]);
      expect(service.hasMore).toBe(false);

      // The stale loadMore page (issued before refreshSource) finally resolves.
      loadMoreHistory$.next({
        response: { receivedContributionsDone: [{ id: 'stale-loadmore-page' }], doneMeta: { hasMore: true, nextCursor: 'stale-cursor' } }
      });
      loadMoreHistory$.complete();

      // Dropped entirely: no duplication, no stale cursor/hasMore overwrite — but loadingMore still
      // clears (its settle accounting must not hang on a dropped response).
      expect(service.receivedData.receivedContributionsDone).toEqual([{ id: 'fresh' }]);
      expect(service.hasMore).toBe(false);
      expect(service.loadingMore).toBe(false);
    });

    // Reviewer FAIL #2b (attempt 2): two concurrent refreshSource() calls on the SAME source (e.g. a
    // socket event racing refreshAllNotifications() after Accept/Decline) must not both apply their
    // data — the later call wins, the earlier one's callback never fires, and rows are not duplicated.
    it('two concurrent refreshSource() calls on the same source do not duplicate rows (falsifier 2b)', () => {
      const firstHistory$ = new Subject<any>();
      const firstPending$ = new Subject<any>();
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history' ? firstHistory$.asObservable() : firstPending$.asObservable()
      );

      const callbackA = jest.fn();
      service.refreshSource('received', 1, callbackA); // call A starts, deferred

      // Call B starts before A resolves.
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [{ id: 'B' }], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [] } })
      );
      const callbackB = jest.fn();
      service.refreshSource('received', 1, callbackB);

      expect(service.receivedData.receivedContributionsDone).toEqual([{ id: 'B' }]);
      expect(callbackB).toHaveBeenCalledTimes(1);

      // Call A's stale responses finally arrive.
      firstPending$.next({ response: { receivedContributionsPending: [] } });
      firstPending$.complete();
      firstHistory$.next({ response: { receivedContributionsDone: [{ id: 'A' }], doneMeta: { hasMore: false, nextCursor: null } } });
      firstHistory$.complete();

      expect(service.receivedData.receivedContributionsDone).toEqual([{ id: 'B' }]); // not duplicated/overwritten
      expect(callbackA).not.toHaveBeenCalled();
    });
  });

  describe('refreshPending()', () => {
    it('fetches only the pending set for the given source/phase, leaving history untouched', () => {
      mockApiService.resultsSE.GET_requestUpdates = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: {} })
          : of({ response: { notificationsPending: [{ created_date: '2023-01-01' }], notificationAnnouncement: [{ id: 1 }] } })
      );
      service.updatesData = {
        notificationAnnouncements: [],
        notificationsPending: [],
        notificationsViewed: [{ created_date: 'old' } as any]
      };

      service.refreshPending('updates', 9);

      expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ versionId: 9, scope: 'pending', limit: 50 });
      expect(mockApiService.resultsSE.GET_requestUpdates).not.toHaveBeenCalledWith(expect.objectContaining({ scope: 'history' }));
      expect(service.updatesData.notificationsPending).toEqual([{ created_date: '2023-01-01' }]);
      expect(service.updatesData.notificationAnnouncements).toEqual([{ id: 1 }]);
      expect(service.updatesData.notificationsViewed).toEqual([{ created_date: 'old' }]); // untouched
    });

    // L1 (Leader adjudication, attempt 2): same default as refreshSource.
    it('defaults versionId to the current phaseFilter when omitted (Leader L1)', () => {
      service.phaseFilter = 7;
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsPending: [], notificationAnnouncement: [] } }));

      service.refreshPending('updates');

      expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ versionId: 7, scope: 'pending', limit: 50 });
    });
  });

  // -----------------------------------------------------------------------------------------
  // @akili-spec notifications/admin-pending-paging - PPG-T-5: paged pending for updates + received
  // (PPG-R-5, PPG-R-6 client half, PPG-NFR-1/NFR-4 inbox). Expected values come from the spec
  // scenarios, not from the implementation.
  // -----------------------------------------------------------------------------------------
  describe('pending paging (PPG-T-5)', () => {
    const PAGE = 50;
    const updatesPage = (ids: number[], meta?: any) => ({
      response: {
        notificationsPending: ids.map(id => ({ notification_id: id, created_date: `2026-01-${String(60 - id).padStart(2, '0')}` })),
        notificationAnnouncement: [],
        ...(meta ? { pendingMeta: meta } : {})
      }
    });
    const receivedPage = (ids: number[], meta?: any) => ({
      response: {
        receivedContributionsPending: ids.map(id => ({ share_result_request_id: id, requested_date: `2026-01-${String(60 - id).padStart(2, '0')}` })),
        ...(meta ? { pendingMeta: meta } : {})
      }
    });
    const emptyHistory = (historyKey: string, metaKey: string, meta: any = { hasMore: false, nextCursor: null }) => ({
      response: { [historyKey]: [], [metaKey]: meta }
    });
    const idsOf = (rows: any[], key: string) => rows.map(r => r[key]);
    // the bell's own bounded legs (limit 10, fired by refreshSource) are not inbox pending pages
    const pendingCalls = (fn: jest.Mock) => fn.mock.calls.map(c => c[0]).filter(o => o?.scope === 'pending' && o?.limit !== 10);

    /** updates endpoint scripted per pending call: `pendingResponses` are consumed in order. */
    function scriptUpdates(pendingResponses: any[], history: any = emptyHistory('notificationsViewed', 'viewedMeta')) {
      const queue = [...pendingResponses];
      const fn = jest.fn((options?: any) => {
        if (options?.scope === 'history') return of(history);
        if (options?.limit === 10) return of(updatesPage([])); // bell leg
        return queue.shift();
      });
      mockApiService.resultsSE.GET_requestUpdates = fn;
      return fn;
    }

    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    // Test 1
    it('first load requests limit=50 for updates and received and sends sent unchanged (PPG-R-5, PPG-R-6)', () => {
      service.loadInbox(7);

      expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ versionId: 7, scope: 'pending', limit: PAGE });
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 7, scope: 'pending', limit: PAGE });
      expect(mockApiService.resultsSE.GET_sentRequest).toHaveBeenCalledWith({ versionId: 7, scope: 'pending' });
    });

    // Test 2
    it('load more appends the next page into a new array, with no duplicates, using the PENDING cursor (PPG-R-5 load more)', () => {
      const firstIds = Array.from({ length: PAGE }, (_, i) => i + 1);
      const secondIds = Array.from({ length: 20 }, (_, i) => PAGE + i + 1);
      const fn = scriptUpdates(
        [
          of(updatesPage(firstIds, { hasMore: true, nextCursor: 'pending-cursor-1', total: 70 })),
          of(updatesPage(secondIds, { hasMore: false, nextCursor: null, total: 70 }))
        ],
        emptyHistory('notificationsViewed', 'viewedMeta', { hasMore: true, nextCursor: 'history-cursor-1' })
      );

      service.loadInbox(3);
      service.phaseFilter = 3;
      const firstArray = service.updatesData.notificationsPending;
      expect(firstArray).toHaveLength(PAGE);
      expect(service.pendingHasMore('updates')).toBe(true);
      expect(service.hasMorePending).toBe(true);
      expect(service.pendingTotal('updates')).toBe(70);

      service.loadMorePending();

      expect(pendingCalls(fn)[1]).toEqual({ versionId: 3, scope: 'pending', limit: PAGE, cursor: 'pending-cursor-1' });
      const rows = service.updatesData.notificationsPending;
      expect(rows).not.toBe(firstArray);
      expect(idsOf(rows, 'notification_id')).toEqual([...firstIds, ...secondIds]);
      expect(new Set(idsOf(rows, 'notification_id')).size).toBe(70);
      expect(service.hasMorePending).toBe(false);
      expect(service.loadingMorePending).toBe(false);

      // The history cursor stayed in its own field: a history page still uses it.
      service.loadMore();
      expect(fn).toHaveBeenLastCalledWith({ versionId: 3, scope: 'history', cursor: 'history-cursor-1' });
    });

    it('load more also pages received pending (PPG-R-6 client half)', () => {
      const queue = [
        of(receivedPage([1, 2], { hasMore: true, nextCursor: 'rc-1', total: 3 })),
        of(receivedPage([3], { hasMore: false, nextCursor: null, total: 3 }))
      ];
      const fn = jest.fn((options?: any) => (options?.scope === 'history' ? of(emptyHistory('receivedContributionsDone', 'doneMeta')) : queue.shift()));
      mockApiService.resultsSE.GET_allRequest = fn;

      service.loadInbox(3);
      service.phaseFilter = 3;
      service.loadMorePending();

      expect(pendingCalls(fn)[1]).toEqual({ versionId: 3, scope: 'pending', limit: PAGE, cursor: 'rc-1' });
      expect(idsOf(service.receivedData.receivedContributionsPending, 'share_result_request_id')).toEqual([1, 2, 3]);
      expect(service.hasMorePending).toBe(false);
    });

    // Test 2 (in-flight half)
    it('a second loadMorePending() while one is in flight issues no request', () => {
      const page2$ = new Subject<any>();
      const fn = scriptUpdates([of(updatesPage([1, 2], { hasMore: true, nextCursor: 'c1', total: 9 })), page2$.asObservable() as any]);
      service.loadInbox(1);

      service.loadMorePending();
      expect(service.loadingMorePending).toBe(true);
      service.loadMorePending();

      expect(pendingCalls(fn)).toHaveLength(2); // page 1 + exactly one page 2

      page2$.next(updatesPage([3], { hasMore: false, nextCursor: null, total: 9 }));
      page2$.complete();
      expect(service.loadingMorePending).toBe(false);
    });

    // Test 3 - the responses are INTERLEAVED: the stale page is still in flight while the reload runs
    // to completion, and only then does the stale page arrive.
    describe('a stale pending page that lands after the reload is dropped (interleaved)', () => {
      const reloads: Array<[string, (s: ResultsNotificationsService) => void]> = [
        ['refreshSource', s => s.refreshSource('updates', 1)],
        ['phase change (onPhaseChange)', s => s.onPhaseChange(2)],
        ['loadInbox', s => s.loadInbox(2)],
        ['boot refreshPending', s => s.refreshPending('updates', 1)]
      ];

      it.each(reloads)('%s while page 2 is in flight', (_name, reload) => {
        const stalePage2$ = new Subject<any>();
        const fn = scriptUpdates([
          of(updatesPage([1, 2], { hasMore: true, nextCursor: 'old-cursor', total: 9 })), // page 1
          stalePage2$.asObservable() as any, // page 2: left in flight
          of(updatesPage([100], { hasMore: true, nextCursor: 'fresh-cursor', total: 5 })) // the reload's page 1
        ]);
        service.loadInbox(1);
        service.phaseFilter = 1;
        service.loadMorePending();
        expect(service.loadingMorePending).toBe(true);

        reload(service); // runs to completion while page 2 is still pending

        expect(idsOf(service.updatesData.notificationsPending, 'notification_id')).toEqual([100]);
        expect(service.pendingTotal('updates')).toBe(5);

        stalePage2$.next(updatesPage([3, 4], { hasMore: false, nextCursor: null, total: 9 }));
        stalePage2$.complete();

        expect(idsOf(service.updatesData.notificationsPending, 'notification_id')).toEqual([100]);
        expect(service.pendingHasMore('updates')).toBe(true);
        expect(service.pendingTotal('updates')).toBe(5);
        // the next load more uses the FRESH cursor, not the stale one
        expect(service.loadingMorePending).toBe(false);
        scriptUpdates([of(updatesPage([101], { hasMore: false, nextCursor: null, total: 5 }))]);
        service.loadMorePending();
        expect(pendingCalls(mockApiService.resultsSE.GET_requestUpdates)).toEqual([expect.objectContaining({ cursor: 'fresh-cursor' })]);
        expect(fn).toBeDefined();
      });

      it('an OLD first page that lands after a newer loadInbox() is dropped', () => {
        const oldPage1$ = new Subject<any>();
        const queue: any[] = [oldPage1$.asObservable(), of(updatesPage([100], { hasMore: false, nextCursor: null, total: 1 }))];
        mockApiService.resultsSE.GET_requestUpdates = jest.fn((options?: any) =>
          options?.scope === 'history' ? of(emptyHistory('notificationsViewed', 'viewedMeta')) : queue.shift()
        );

        service.loadInbox(1); // phase 1: page 1 left in flight
        service.loadInbox(2); // phase 2 completes
        oldPage1$.next(updatesPage([1, 2, 3], { hasMore: true, nextCursor: 'phase-1-cursor', total: 400 }));
        oldPage1$.complete();

        expect(idsOf(service.updatesData.notificationsPending, 'notification_id')).toEqual([100]);
        expect(service.hasMorePending).toBe(false);
      });
    });

    // Test 4
    it('an error on page 2 keeps the rows and the cursor, and a retry succeeds', () => {
      const fn = scriptUpdates([
        of(updatesPage([1, 2], { hasMore: true, nextCursor: 'c1', total: 4 })),
        throwError(() => ({ status: 500 })),
        of(updatesPage([3, 4], { hasMore: false, nextCursor: null, total: 4 }))
      ]);
      service.loadInbox(1);
      service.phaseFilter = 1;

      service.loadMorePending();

      expect(idsOf(service.updatesData.notificationsPending, 'notification_id')).toEqual([1, 2]);
      expect(service.pendingHasMore('updates')).toBe(true);
      expect(service.loadingMorePending).toBe(false);

      service.loadMorePending(); // retry

      expect(pendingCalls(fn)[2]).toEqual(expect.objectContaining({ cursor: 'c1' }));
      expect(idsOf(service.updatesData.notificationsPending, 'notification_id')).toEqual([1, 2, 3, 4]);
      expect(service.hasMorePending).toBe(false);
    });

    // Test 5
    it('a response without pendingMeta is treated as complete: rows kept, no control (rollback rule)', () => {
      const fn = scriptUpdates([of(updatesPage([1, 2, 3]))]);

      service.loadInbox(1);

      expect(service.updatesData.notificationsPending).toHaveLength(3);
      expect(service.hasMorePending).toBe(false);
      expect(service.pendingTotal('updates')).toBe(3);
      service.loadMorePending();
      expect(pendingCalls(fn)).toHaveLength(1);
    });

    // Test 5, later pages: a server rolled back while paging ignores limit/cursor and answers the
    // complete set with no pendingMeta - it must REPLACE the loaded rows, not append onto them.
    it('updates: a later page without pendingMeta replaces the rows with the complete set (no duplicates)', () => {
      const first = Array.from({ length: PAGE }, (_, i) => i + 1);
      const all = Array.from({ length: 70 }, (_, i) => i + 1);
      scriptUpdates([of(updatesPage(first, { hasMore: true, nextCursor: 'c1', total: 120 })), of(updatesPage(all))]);
      service.loadInbox(1);
      service.phaseFilter = 1;

      service.loadMorePending();

      expect(idsOf(service.updatesData.notificationsPending, 'notification_id').sort((a, b) => a - b)).toEqual(all);
      expect(service.hasMorePending).toBe(false);
      expect(service.pendingHasMore('updates')).toBe(false);
      expect(service.pendingTotal('updates')).toBe(70);
    });

    it('received: a later page without pendingMeta replaces the rows with the complete set (no duplicates)', () => {
      const first = Array.from({ length: PAGE }, (_, i) => i + 1);
      const all = Array.from({ length: 70 }, (_, i) => i + 1);
      const queue = [of(receivedPage(first, { hasMore: true, nextCursor: 'rc1', total: 120 })), of(receivedPage(all))];
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history' ? of(emptyHistory('receivedContributionsDone', 'doneMeta')) : queue.shift()
      );
      service.loadInbox(1);
      service.phaseFilter = 1;

      service.loadMorePending();

      expect(idsOf(service.receivedData.receivedContributionsPending, 'share_result_request_id').sort((a, b) => a - b)).toEqual(all);
      expect(service.pendingHasMore('received')).toBe(false);
      expect(service.pendingTotal('received')).toBe(70);
    });

    // Test 6
    it('50 or fewer pending rows show no control (ordinary user parity)', () => {
      scriptUpdates([of(updatesPage([1, 2, 3], { hasMore: false, nextCursor: null, total: 3 }))]);

      service.loadInbox(1);

      expect(service.hasMorePending).toBe(false);
      expect(service.pendingTotal('updates')).toBe(3);
      expect(service.updatesData.notificationsPending).toHaveLength(3);
    });

    // Test 7
    it('boot refreshPending("updates") asks page 1 only, with limit and no cursor', () => {
      const fn = scriptUpdates([of(updatesPage([1], { hasMore: true, nextCursor: 'c', total: 90 }))]);

      service.refreshPending('updates');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith({ versionId: null, scope: 'pending', limit: PAGE });
      expect(service.hasMorePending).toBe(true);
    });

    it('sent keeps its complete pending set: no limit, never flagged as having more', () => {
      service.loadInbox(1);

      expect(pendingCalls(mockApiService.resultsSE.GET_sentRequest)).toEqual([{ versionId: 1, scope: 'pending' }]);
      expect(service.pendingHasMore('sent')).toBe(false);
    });

    it('a history page landing does not wipe the pending paging state', () => {
      scriptUpdates(
        [of(updatesPage([1], { hasMore: true, nextCursor: 'pc', total: 80 }))],
        emptyHistory('notificationsViewed', 'viewedMeta', { hasMore: false, nextCursor: null })
      );

      service.loadInbox(1);

      expect(service.pendingHasMore('updates')).toBe(true);
      expect(service.pendingTotal('updates')).toBe(80);
    });
  });

  // -----------------------------------------------------------------------------------------
  // Legacy wrappers — must keep compiling/working unchanged for existing callers (T-5/T-6 migrate
  // the callers in a later task); each is a thin delegation to refreshSource().
  // -----------------------------------------------------------------------------------------

  describe('get_section_information()', () => {
    it('delegates to refreshSource("received", versionId, callback)', () => {
      const spy = jest.spyOn(service, 'refreshSource').mockImplementation();
      const cb = () => {};

      service.get_section_information(5, cb);

      expect(spy).toHaveBeenCalledWith('received', 5, cb);
    });

    it('fetches pending (sorted desc) + first history page and updates receivedData end to end', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({
              response: {
                receivedContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }],
                doneMeta: { hasMore: false, nextCursor: null }
              }
            })
          : of({ response: { receivedContributionsPending: [{ requested_date: '2023-01-02' }, { requested_date: '2023-01-04' }] } })
      );

      service.get_section_information();

      expect(service.receivedData).toEqual({
        receivedContributionsPending: [{ requested_date: '2023-01-04' }, { requested_date: '2023-01-02' }],
        // History arrives pre-sorted from the server and is appended as-is (design.md §6.2).
        receivedContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }]
      });
    });

    it('handles errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => throwError(() => ({ status: 500 })));

      service.get_section_information();

      // @akili-spec notifications/inbox-paginated-load — Reviewer optional item (attempt 2): never
      // log the raw error (it can carry the request URL/cursor, `.cursorrules`) — only a static
      // message + status code.
      expect(consoleSpy).toHaveBeenCalledWith('ResultsNotificationsService: paginated request failed', 500);
      expect(service.receivedData).toEqual({ receivedContributionsPending: [], receivedContributionsDone: [] });
    });

    // Reviewer FAIL #3 (attempt 2): restores the empty-response case that attempt 1 deleted instead
    // of updating. Under the new dual-fetch contract an empty object response (`{}`) destructures to
    // `response: undefined`, so both legs leave the already-reset empty arrays untouched — but the
    // callback must still fire (both legs settle regardless of whether they had data to apply).
    it('should not update data when the response is empty, and still calls back (restored case)', () => {
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => of({}));
      const callback = jest.fn();

      service.get_section_information(undefined, callback);

      expect(service.receivedData).toEqual({ receivedContributionsPending: [], receivedContributionsDone: [] });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    // Reviewer FAIL #3 (attempt 2): the OTHER deleted case ("when item.request_status_id is not 1")
    // asserted against `requestData`/`requestPendingData` — a `GET_requestIPSR` (all-time, unpaged
    // `/request/get/all`) response shape, not `GET_allRequest`'s `receivedContributionsPending/Done`.
    // That assertion was never actually true of `get_section_information()` even before this task
    // (the two endpoints return different shapes) — it is retired here, not carried forward under a
    // shape it never had. Recorded for the Leader to log in execution.md, per the Leader's note that
    // execution.md is Leader-owned.

    // L1 (Leader adjudication, attempt 2): refreshSource (and therefore every legacy wrapper) must
    // default versionId to the current phaseFilter when the caller omits it.
    it('get_section_information(undefined, cb) uses the current phaseFilter as versionId (Leader L1)', () => {
      service.phaseFilter = 42;
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({ response: { receivedContributionsDone: [], doneMeta: { hasMore: false, nextCursor: null } } })
          : of({ response: { receivedContributionsPending: [] } })
      );

      service.get_section_information();

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'pending', limit: 50 });
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'history', cursor: undefined });
    });
  });

  describe('get_section_innovation_packages()', () => {
    it('should process and sort data when response exists', () => {
      const mockResponse = {
        requestData: [
          { result_type_id: 10, requester_initiative_id: 1, owner_initiative_id: 2, request_status_id: 1 },
          { result_type_id: 8, requester_initiative_id: 2, owner_initiative_id: 1 }
        ],
        requestPendingData: [{ result_type_id: 10, requester_initiative_id: 3, owner_initiative_id: 1, request_status_id: 2 }]
      };

      mockApiService.dataControlSE.myInitiativesList = [{ initiative_id: 1 }, { initiative_id: 2 }];
      mockApiService.rolesSE = { isAdmin: false };

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_requestIPSR').mockReturnValue(of({ response: mockResponse }));

      service.get_section_innovation_packages();

      expect(spy).toHaveBeenCalled();
      expect(service.dataIPSR).toEqual([
        {
          result_type_id: 10,
          requester_initiative_id: 1,
          owner_initiative_id: 2,
          request_status_id: 1
        },
        {
          result_type_id: 10,
          requester_initiative_id: 3,
          owner_initiative_id: 1,
          request_status_id: 4,
          pending: true,
          shared_inititiative_id: 3
        }
      ]);
    });

    it('should update status when user is not admin and has correct initiative permissions', () => {
      const mockResponse = {
        requestData: [
          {
            result_type_id: 10,
            requester_initiative_id: 2, // Not in myInitiativesList
            owner_initiative_id: 1 // In myInitiativesList
          }
        ],
        requestPendingData: []
      };

      mockApiService.dataControlSE.myInitiativesList = [{ initiative_id: 1 }];
      mockApiService.rolesSE = { isAdmin: false };

      jest.spyOn(mockApiService.resultsSE, 'GET_requestIPSR').mockReturnValue(of({ response: mockResponse }));

      service.get_section_innovation_packages();

      expect(service.dataIPSR).toEqual([
        {
          result_type_id: 10,
          requester_initiative_id: 2,
          owner_initiative_id: 1,
          request_status_id: 4,
          shared_inititiative_id: 2,
          pending: true
        }
      ]);
    });

    it('should not process data when response is empty', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_requestIPSR').mockReturnValue(of({ response: null }));

      service.get_section_innovation_packages();

      expect(spy).toHaveBeenCalled();
      expect(service.dataIPSR).toEqual([]);
    });

    it('should filter out non-type-10 results', () => {
      const mockResponse = {
        requestData: [
          { result_type_id: 8, requester_initiative_id: 1 },
          { result_type_id: 10, requester_initiative_id: 2 }
        ],
        requestPendingData: []
      };

      mockApiService.dataControlSE.myInitiativesList = [];
      mockApiService.rolesSE = { isAdmin: true };

      jest.spyOn(mockApiService.resultsSE, 'GET_requestIPSR').mockReturnValue(of({ response: mockResponse }));

      service.get_section_innovation_packages();

      expect(service.dataIPSR.length).toBe(1);
      expect(service.dataIPSR[0].result_type_id).toBe(10);
    });
  });

  describe('get_sent_notifications', () => {
    it('delegates to refreshSource("sent", versionId, callback)', () => {
      const spy = jest.spyOn(service, 'refreshSource').mockImplementation();
      const cb = () => {};

      service.get_sent_notifications(5, cb);

      expect(spy).toHaveBeenCalledWith('sent', 5, cb);
    });

    it('updates sentData correctly end to end', () => {
      mockApiService.resultsSE.GET_sentRequest = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({
              response: {
                sentContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }],
                doneMeta: { hasMore: false, nextCursor: null }
              }
            })
          : of({ response: { sentContributionsPending: [{ requested_date: '2023-01-02' }, { requested_date: '2023-01-04' }] } })
      );

      service.get_sent_notifications();

      expect(service.sentData).toEqual({
        sentContributionsPending: [{ requested_date: '2023-01-04' }, { requested_date: '2023-01-02' }],
        sentContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }]
      });
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.GET_sentRequest = jest.fn(() => throwError(() => ({ status: 500 })));

      service.get_sent_notifications();

      expect(consoleSpy).toHaveBeenCalledWith('ResultsNotificationsService: paginated request failed', 500);
      expect(service.sentData).toEqual({ sentContributionsPending: [], sentContributionsDone: [] });
    });

    it('should not update sentData when response is empty', () => {
      mockApiService.resultsSE.GET_sentRequest = jest.fn(() => of({}));

      service.get_sent_notifications();

      expect(service.sentData).toEqual({ sentContributionsPending: [], sentContributionsDone: [] });
    });
  });

  describe('get_updates_notifications', () => {
    it('delegates to refreshSource("updates", versionId)', () => {
      const spy = jest.spyOn(service, 'refreshSource').mockImplementation();

      service.get_updates_notifications(5);

      expect(spy).toHaveBeenCalledWith('updates', 5);
    });

    it('updates updatesData correctly end to end', () => {
      mockApiService.resultsSE.GET_requestUpdates = jest.fn((options?: any) =>
        options?.scope === 'history'
          ? of({
              response: {
                notificationsViewed: [{ created_date: '2023-01-02' }, { created_date: '2023-01-04' }],
                viewedMeta: { hasMore: false, nextCursor: null }
              }
            })
          : of({ response: { notificationsPending: [{ created_date: '2023-01-01' }, { created_date: '2023-01-03' }], notificationAnnouncement: [] } })
      );

      service.get_updates_notifications();

      expect(service.updatesData).toEqual({
        notificationsPending: [{ created_date: '2023-01-03' }, { created_date: '2023-01-01' }],
        // History arrives pre-sorted from the server and is appended as-is.
        notificationsViewed: [{ created_date: '2023-01-02' }, { created_date: '2023-01-04' }],
        notificationAnnouncements: []
      });
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => throwError(() => ({ status: 500 })));

      service.get_updates_notifications();

      expect(consoleSpy).toHaveBeenCalledWith('ResultsNotificationsService: paginated request failed', 500);
      expect(service.updatesData).toEqual({ notificationsPending: [], notificationsViewed: [], notificationAnnouncements: [] });
    });
  });

  describe('get_updates_pop_up_notifications', () => {
    it('should update updatesPopUpData correctly', () => {
      const response = [
        { notification_id: 1, created_date: '2023-01-01' },
        { notification_id: 2, created_date: '2023-01-03' }
      ];
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_notificationsPopUp').mockReturnValue(of({ response }));

      service.get_updates_pop_up_notifications();

      expect(spy).toHaveBeenCalled();
      expect(service.updatesPopUpData).toEqual([
        { notification_id: 2, created_date: '2023-01-03' },
        { notification_id: 1, created_date: '2023-01-01' }
      ]);
    });

    it('should update updatesPopUpData correctly when there is no notification_id', () => {
      const response = [{ requested_date: '2023-01-01' }, { requested_date: '2023-01-03' }];
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_notificationsPopUp').mockReturnValue(of({ response }));

      service.get_updates_pop_up_notifications();

      expect(spy).toHaveBeenCalled();
      expect(service.updatesPopUpData).toEqual([{ requested_date: '2023-01-03' }, { requested_date: '2023-01-01' }]);
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_notificationsPopUp').mockReturnValue(throwError(() => 'error'));

      service.get_updates_pop_up_notifications();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('error');
      expect(service.updatesPopUpData).toEqual([]);
    });
  });

  describe('readUpdatesNotifications', () => {
    it('should update updatesData correctly when marking as read', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [notification];
      service.updatesData.notificationsViewed = [];

      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readNotification').mockReturnValue(of({}));

      service.readUpdatesNotifications(notification);

      expect(spy).toHaveBeenCalledWith(1);
      expect(service.updatesData.notificationsPending).toEqual([]);
      expect(service.updatesData.notificationsViewed).toEqual([{ ...notification, read: true }]);
      expect(service.updatesData.notificationsViewed[0].read).toBe(true);
    });

    it('should handle errors correctly', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [notification];
      service.updatesData.notificationsViewed = [];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readNotification').mockReturnValue(throwError(() => 'error'));

      service.readUpdatesNotifications(notification);

      expect(spy).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith('error');
      expect(service.updatesData.notificationsPending).toEqual([{ ...notification, read: false }]);
      expect(service.updatesData.notificationsViewed).toEqual([]);
    });

    it('should push notification to notificationsPending when marking as unread', () => {
      const notification = { notification_id: 1, read: true, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [];
      service.updatesData.notificationsViewed = [notification];

      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readNotification').mockReturnValue(of({}));

      service.readUpdatesNotifications(notification);

      expect(spy).toHaveBeenCalledWith(1);
      expect(service.updatesData.notificationsPending).toEqual([{ ...notification, read: false }]);
      expect(service.updatesData.notificationsViewed).toEqual([]);
    });

    // NOTIF-T-6 rework (Reviewer's remediation item 1/4): this used to round-trip through the
    // now-deleted `.../requests`/`.../updates` routes via `navigateByUrl`/`navigate` — a dead route
    // today, and the round-trip was already unnecessary (the component's own getters recompute off
    // `updatesData` reactively). Proves the navigation is gone, not merely broken silently.
    it('does not navigate away — the mutation above is the whole update', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [notification];
      service.updatesData.notificationsViewed = [];
      jest.spyOn(mockApiService.resultsSE, 'PATCH_readNotification').mockReturnValue(of({}));
      const navigateByUrlSpy = jest.spyOn(Router.prototype, 'navigateByUrl');
      const navigateSpy = jest.spyOn(Router.prototype, 'navigate');

      service.readUpdatesNotifications(notification);

      expect(navigateByUrlSpy).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('handlePopUpNotificationLastViewed', () => {
    it('should call the API correctly', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_handlePopUpViewed').mockReturnValue(of({}));

      service.handlePopUpNotificationLastViewed();

      expect(spy).toHaveBeenCalled();
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_handlePopUpViewed').mockReturnValue(throwError(() => 'error'));

      service.handlePopUpNotificationLastViewed();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('error');
    });
  });

  describe('resetNotificationInformation', () => {
    it('should reset receivedData and sentData correctly', () => {
      service.receivedData = { receivedContributionsPending: [1], receivedContributionsDone: [2] };
      service.sentData = { sentContributionsPending: [3], sentContributionsDone: [4] };

      service.resetNotificationInformation();

      expect(service.receivedData).toEqual({ receivedContributionsPending: null, receivedContributionsDone: null });
      expect(service.sentData).toEqual({ sentContributionsPending: null, sentContributionsDone: null });
    });

    it('should call resetFilters', () => {
      const resetFiltersSpy = jest.spyOn(service, 'resetFilters');

      service.resetNotificationInformation();

      expect(resetFiltersSpy).toHaveBeenCalled();
    });
  });

  describe('resetFilters', () => {
    it('should reset filters correctly', () => {
      service.initiativeIdFilter = 1;
      service.searchFilter = 'test';

      service.resetFilters();

      expect(service.initiativeIdFilter).toBe(null);
      expect(service.searchFilter).toBe(null);
    });

    // NOTIF-T-6 / NOTIF-AC-4: "Clear all" resets every facet, including the two new ones.
    it('should reset the Center and Bilateral-project facet filters', () => {
      service.centerIdsFilter = [10, 20];
      service.bilateralProjectIdsFilter = ['BIL-1'];

      service.resetFilters();

      expect(service.centerIdsFilter).toEqual([]);
      expect(service.bilateralProjectIdsFilter).toEqual([]);
    });
  });

  // NOTIF-T-11 (rework attempt 2): phaseList/filteredInitiatives/entityLabel + getAllPhases/
  // onPhaseChange/filterInitiativesByPhase moved here from ResultsNotificationsComponent AND
  // RequestsComponent — this is the single owner now, so this is where the real logic is tested.
  describe('Phase/Program state — single owner (NOTIF-T-11)', () => {
    it('starts with the empty defaults both components used to own individually', () => {
      expect(service.phaseList).toEqual([]);
      expect(service.filteredInitiatives).toEqual([]);
      expect(service.entityLabel).toBe('Entity');
    });

    describe('getAllPhases()', () => {
      it('fetches the phase list via GET_versioning', () => {
        const spy = jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(of({ response: [{ id: 1 }] }));

        service.getAllPhases();

        expect(spy).toHaveBeenCalledWith(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL);
        expect(service.phaseList).toEqual([{ id: 1 }]);
      });

      it('defaults phaseFilter to the active reporting phase when none is set (P2-3106 AC2)', () => {
        mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 7 };
        jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(of({ response: [{ id: 7, obj_portfolio: { id: 1 } }] }));

        service.getAllPhases();

        expect(service.phaseFilter).toBe(7);
      });

      it('does not override an already-set phaseFilter (e.g. hydrated from query params)', () => {
        service.phaseFilter = 'fromQueryParams';
        mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 7 };
        jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(of({ response: [{ id: 7, obj_portfolio: { id: 1 } }] }));

        service.getAllPhases();

        expect(service.phaseFilter).toBe('fromQueryParams');
      });

      // NOTIF-T-11 (rework attempt 3, Reviewer FAIL #1/#2): the attempt-2 re-fetch guard
      // (`if (this.phaseList.length > 0) return;`) is REMOVED — it caused a real regression (Updates
      // stale after the first visit, `?phase=` deep-linking stopped re-deriving state), because this
      // service is `providedIn: 'root'` and `phaseList` is never cleared, so the guard made every
      // subsequent call a silent no-op. `RequestsComponent` no longer calls `getAllPhases()` at all
      // (only the parent `ResultsNotificationsComponent` does), so there's no double-fetch to guard
      // against any more. This test replaces the old "does NOT re-fetch" assertion with its opposite:
      // proves NO memoization — every call genuinely re-issues `GET_versioning`, using a DEFERRED
      // observable (a `Subject`, not a synchronous `of(...)`) so it can actually show the timing the
      // attempt-2 Reviewer noted a synchronous mock cannot reproduce (a real in-flight async race).
      it('re-fetches GET_versioning on EVERY call — no memoization, even mid-flight (real async timing via a deferred Subject)', () => {
        const versioning$ = new Subject<{ response: { id: number }[] }>();
        const spy = jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(versioning$.asObservable());

        service.getAllPhases(); // first call — subscribes, nothing emitted yet
        service.getAllPhases(); // second call, BEFORE the first resolves — must issue its OWN fetch

        expect(spy).toHaveBeenCalledTimes(2);

        versioning$.next({ response: [{ id: 1 }] });
        expect(service.phaseList).toEqual([{ id: 1 }]);

        // A THIRD call, now that phaseList is already populated from the earlier emission — must
        // still re-fetch (this is exactly what the removed guard used to block).
        service.getAllPhases();
        expect(spy).toHaveBeenCalledTimes(3);
      });

      // NOTIF-T-6 rework (double-fetch fix): `onPhaseUnresolved` is the fallback ONLY for the case
      // where no phase resolves — `onPhaseChange()` (which already fetches Received/Sent/Updates)
      // must be the single source whenever a phase DOES resolve, or a normal page load double-fetches.
      it('invokes the onPhaseUnresolved callback when no phase resolves', () => {
        jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(of({ response: [] }));
        const onPhaseUnresolved = jest.fn();

        service.getAllPhases(onPhaseUnresolved);

        expect(onPhaseUnresolved).toHaveBeenCalled();
      });

      it('does NOT invoke the onPhaseUnresolved callback once a phase resolves', () => {
        mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 7 };
        jest.spyOn(mockApiService.resultsSE, 'GET_versioning').mockReturnValue(of({ response: [{ id: 7, obj_portfolio: { id: 1 } }] }));
        jest.spyOn(service, 'onPhaseChange').mockImplementation();
        const onPhaseUnresolved = jest.fn();

        service.getAllPhases(onPhaseUnresolved);

        expect(service.onPhaseChange).toHaveBeenCalledWith(7);
        expect(onPhaseUnresolved).not.toHaveBeenCalled();
      });
    });

    describe('onPhaseChange()', () => {
      // @akili-spec notifications/inbox-paginated-load — PAGE-R-5: onPhaseChange now delegates the
      // whole Received/Sent/Updates fetch to loadInbox() (design.md §6.2), instead of calling the 3
      // legacy wrappers directly — loadInbox() is what applies the generation guard / paging reset.
      it('delegates to loadInbox(phaseId) and re-derives filteredInitiatives for the new phase', () => {
        service.phaseList = [{ id: 1, obj_portfolio: { id: 2, acronym: 'INIT' } }];
        const loadInboxSpy = jest.spyOn(service, 'loadInbox').mockImplementation();
        const filterSpy = jest.spyOn(service, 'filterInitiativesByPhase').mockImplementation();

        service.onPhaseChange(1);

        expect(loadInboxSpy).toHaveBeenCalledWith(1);
        expect(filterSpy).toHaveBeenCalledWith(1);
      });
    });

    describe('filterInitiativesByPhase()', () => {
      it('GETs all initiatives when admin, and sets entityLabel to Initiative for portfolio_id 2', () => {
        mockApiService.rolesSE.isAdmin = true;
        const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives').mockReturnValue(of({ response: [{ initiative_id: 9 }] }));
        service.phaseList = [{ id: 1, obj_portfolio: { id: 2, acronym: 'INIT' } }];

        service.filterInitiativesByPhase(1);

        expect(spy).toHaveBeenCalledWith('init');
        expect(service.entityLabel).toBe('Initiative');
        expect(service.filteredInitiatives).toEqual([{ initiative_id: 9 }]);
      });

      it('filters myInitiativesList locally when not admin, and keeps entityLabel as Entity for other portfolios', () => {
        mockApiService.rolesSE.isAdmin = false;
        mockApiService.dataControlSE.myInitiativesList = [
          { initiative_id: 1, portfolio_id: 1 },
          { initiative_id: 2, portfolio_id: 3 }
        ];
        service.phaseList = [{ id: 1, obj_portfolio: { id: 1, acronym: 'BIL' } }];

        service.filterInitiativesByPhase(1);

        expect(service.entityLabel).toBe('Entity');
        expect(service.filteredInitiatives).toEqual([{ initiative_id: 1, portfolio_id: 1 }]);
      });

      it('is a no-op when the phase is not found in phaseList', () => {
        service.phaseList = [];
        service.filteredInitiatives = [{ initiative_id: 1 }];

        service.filterInitiativesByPhase(999);

        expect(service.filteredInitiatives).toEqual([{ initiative_id: 1 }]);
      });
    });
  });

  // -----------------------------------------------------------------------------------------
  // @akili-spec notifications/bell-quick-inbox — BELL-T-2: phase-agnostic bell state
  // -----------------------------------------------------------------------------------------
  describe('bell state (BELL-T-2)', () => {
    const decisionRow = (n: number, date = '2026-01-0' + n) => ({
      share_result_request_id: n,
      request_status_id: 1,
      request_type: 'primary',
      requested_date: date,
      obj_result: { obj_version: { obj_portfolio: { acronym: 'P25' } } }
    });
    const updateRow = (n: number, date = '2026-02-0' + n) => ({ notification_id: n, read: false, created_date: date });

    // PPG-T-4: the server splits received by `seen` and answers the counts; the mock mirrors that, with
    // counts equal to the given rows (the <=10-per-group parity case). Tests that need other counts
    // pass `counts` explicitly.
    const setBellEndpoints = (received: any[], updates: any[], counts?: { unseenRequests: number; pendingRequests: number; unreadUpdates: number }) => {
      mockApiService.resultsSE.GET_allRequest = jest.fn((options?: any) =>
        of({
          response: {
            receivedContributionsPending: typeof options?.seen === 'boolean' ? received.filter(r => (r.seen === true) === options.seen) : received
          }
        })
      );
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsPending: updates } }));
      mockApiService.resultsSE.GET_notificationAttentionCounts = jest.fn(() =>
        of({
          response: counts ?? {
            unseenRequests: received.filter(r => r.seen !== true).length,
            pendingRequests: received.length,
            unreadUpdates: updates.length
          }
        })
      );
    };

    beforeEach(() => {
      mockApiService.alertsFe = { show: jest.fn() };
      mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => of({}));
    });

    // @akili-spec notifications/admin-pending-paging — PPG-T-4 test 1 (PPG-NFR-4 parity).
    // Literals below were captured from the PRE-change code (bellCount/bellPendingRequestCount/bellItems
    // derived from the full lists) for this fixed dataset; they are NOT recomputed from the inputs.
    it('parity (PPG-NFR-4): <=10 rows per group give the exact values the pre-paging code derived', () => {
      const r = (n: number, seen: boolean, date: string) => ({ ...decisionRow(n, date), seen });
      setBellEndpoints(
        [r(1, true, '2026-03-01'), r(2, false, '2026-01-01'), r(3, false, '2026-01-05'), r(4, true, '2026-03-09')],
        [updateRow(1, '2026-05-01'), updateRow(2, '2026-05-09')]
      );
      service.refreshBell();
      service.bellReadUpdates.set([
        { notification_id: 7, read: true, created_date: '2026-04-01' },
        { notification_id: 8, read: true, created_date: '2026-04-09' }
      ]);
      expect(service.bellItems().map(i => `${i.kind}:${i.share_result_request_id ?? i.notification_id}:${i.fresh}`)).toEqual([
        'decision:3:true',
        'decision:2:true',
        'update:2:true',
        'update:1:true',
        'decision:4:false',
        'decision:1:false',
        'update:8:false',
        'update:7:false'
      ]);
      expect(service.bellCount()).toBe(4);
      expect(service.bellPendingRequestCount()).toBe(4);
    });

    it('bellCount counts 3 received pending + 2 unread updates', () => {
      setBellEndpoints([decisionRow(1), decisionRow(2), decisionRow(3)], [updateRow(1), updateRow(2)]);
      service.refreshBell();
      expect(service.bellCount()).toBe(5);
      expect(service.bellLoading()).toBe(false);
      expect(service.bellError()).toBe(false);
    });

    it('does not send versionId even when phaseFilter is set (BELL-R-1)', () => {
      service.phaseFilter = '30';
      setBellEndpoints([], []);
      service.refreshBell();
      const allOpts = mockApiService.resultsSE.GET_allRequest.mock.calls.map((c: any[]) => c[0]);
      const updOpts = mockApiService.resultsSE.GET_requestUpdates.mock.calls[0][0];
      expect(allOpts).toEqual([
        { scope: 'pending', limit: 10, seen: false },
        { scope: 'pending', limit: 10, seen: true }
      ]);
      allOpts.forEach((o: any) => expect('versionId' in o).toBe(false));
      expect(updOpts).toEqual({ scope: 'pending', limit: 10 });
      expect('versionId' in updOpts).toBe(false);
    });

    it('bellItems tags kinds, puts decisions first even when older than an update, newest first inside a kind (BELL-R-3)', () => {
      setBellEndpoints([decisionRow(1, '2020-01-01'), decisionRow(2, '2020-06-01')], [updateRow(1, '2026-01-01'), updateRow(2, '2026-03-01')]);
      service.refreshBell();
      const items = service.bellItems();
      expect(items.map(i => i.kind)).toEqual(['decision', 'decision', 'update', 'update']);
      expect(items.map(i => i.share_result_request_id ?? i.notification_id)).toEqual([2, 1, 2, 1]);
    });

    it('an older generation arriving last does not overwrite a newer one', () => {
      const first$ = new Subject<any>();
      const second$ = new Subject<any>();
      // 2 received legs (unseen, seen) per refresh: the first refresh takes the first 2 subjects.
      const first2$ = new Subject<any>();
      const second2$ = new Subject<any>();
      const queue = [first$, first2$, second$, second2$];
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => queue.shift());
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsPending: [] } }));

      service.refreshBell();
      service.refreshBell();
      second$.next({ response: { receivedContributionsPending: [decisionRow(2)] } });
      second$.complete();
      first$.next({ response: { receivedContributionsPending: [decisionRow(1), decisionRow(3)] } });
      first$.complete();
      second2$.complete();
      first2$.complete();

      expect(service.bellReceived().map(r => r.share_result_request_id)).toEqual([2]);
      expect(service.bellLoading()).toBe(false);
    });

    it('a failed refresh keeps the previous snapshot and sets bellError', () => {
      setBellEndpoints([decisionRow(1)], [updateRow(1)]);
      service.refreshBell();
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => throwError(() => ({ status: 500 })));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      service.refreshBell();
      expect(service.bellCount()).toBe(2);
      expect(service.bellError()).toBe(true);
      expect(service.bellLoading()).toBe(false);
    });

    it('refreshSource("received") and refreshSource("updates") call refreshBell', () => {
      const spy = jest.spyOn(service, 'refreshBell');
      service.refreshSource('received');
      service.refreshSource('updates');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('readUpdatesNotifications calls refreshBell once the PATCH succeeds, not before and not on error', () => {
      const spy = jest.spyOn(service, 'refreshBell');
      const pending$ = new Subject<any>();
      mockApiService.resultsSE.PATCH_readNotification = jest.fn(() => pending$);
      service.updatesData.notificationsPending = [{ notification_id: 1, created_date: '2026-01-01', read: false }] as any;
      service.readUpdatesNotifications(service.updatesData.notificationsPending[0]);
      expect(spy).not.toHaveBeenCalled();
      pending$.next({});
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockClear();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.resultsSE.PATCH_readNotification = jest.fn(() => throwError(() => ({ status: 500 })));
      service.updatesData.notificationsPending = [{ notification_id: 2, created_date: '2026-01-01', read: false }] as any;
      service.readUpdatesNotifications(service.updatesData.notificationsPending[0]);
      expect(spy).not.toHaveBeenCalled();
    });

    // @akili-spec notifications/bell-read-state — BRS-T-4
    describe('bell read state (BRS-T-4)', () => {
      const req = (n: number, seen: boolean | undefined, date = '2026-01-0' + n) => ({ ...decisionRow(n, date), ...(seen === undefined ? {} : { seen }) });
      const readUpdate = (n: number, date = '2026-02-0' + n) => ({ notification_id: n, read: true, created_date: date });
      const resolveSeen = () => of({ response: { seen: true } });

      it('(a) badge counts unseen requests + unread updates, pending count counts all pending', () => {
        const rows = [...Array.from({ length: 137 }, (_, i) => req(1000 + i, true)), req(1, false), req(2, false), req(3, false)];
        setBellEndpoints(rows, [updateRow(1), updateRow(2)]);
        service.refreshBell();
        expect(service.bellCount()).toBe(5);
        expect(service.bellPendingRequestCount()).toBe(140);
        expect(service.bellUnseenRequests()).toHaveLength(3);
      });

      it('(a) 120 unseen requests give 120 (the 99+ rendering is the template concern)', () => {
        setBellEndpoints(Array.from({ length: 120 }, (_, i) => req(i + 1, false)), []);
        service.refreshBell();
        expect(service.bellCount()).toBe(120);
        expect(service.bellPendingRequestCount()).toBe(120);
      });

      it('(a) all seen and no updates: badge 0 while the pending count stays', () => {
        setBellEndpoints([req(1, true), req(2, true)], []);
        service.refreshBell();
        expect(service.bellCount()).toBe(0);
        expect(service.bellPendingRequestCount()).toBe(2);
      });

      it('(b) bellItems order fresh requests, fresh updates, seen requests, read updates; newest first; fresh tags', () => {
        setBellEndpoints(
          [req(1, true, '2026-03-01'), req(2, false, '2026-01-01'), req(3, false, '2026-01-05'), req(4, true, '2026-03-09')],
          [updateRow(1, '2026-05-01'), updateRow(2, '2026-05-09')]
        );
        service.refreshBell();
        service.bellReadUpdates.set([readUpdate(7, '2026-04-01'), readUpdate(8, '2026-04-09')]);
        const items = service.bellItems();
        expect(items.map(i => `${i.kind}:${i.share_result_request_id ?? i.notification_id}:${i.fresh}`)).toEqual([
          'decision:3:true',
          'decision:2:true',
          'update:2:true',
          'update:1:true',
          'decision:4:false',
          'decision:1:false',
          'update:8:false',
          'update:7:false'
        ]);
      });

      it('(b) a read update that is also still unread is listed once, as fresh', () => {
        setBellEndpoints([], [updateRow(1)]);
        service.refreshBell();
        service.bellReadUpdates.set([readUpdate(1)]);
        expect(service.bellItems()).toHaveLength(1);
        expect(service.bellItems()[0].fresh).toBe(true);
      });

      describe('markRequestSeen()', () => {
        beforeEach(() => {
          setBellEndpoints([req(1, false), req(2, false)], [updateRow(1)]);
          service.refreshBell();
        });

        it('(c) success: count -1, bell row and inbox row flip; the PATCH goes by request id', async () => {
          const inboxRow: any = { share_result_request_id: 1, seen: false };
          service.receivedData = { receivedContributionsPending: [inboxRow, { share_result_request_id: 9, seen: false }] as any, receivedContributionsDone: [] as any };
          mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(resolveSeen);
          expect(service.bellCount()).toBe(3);

          await expect(service.markRequestSeen(service.bellItems().find(i => i.share_result_request_id === 1)!)).resolves.toBe(true);

          expect(mockApiService.resultsSE.PATCH_markRequestSeen).toHaveBeenCalledWith(1);
          expect(service.bellCount()).toBe(2);
          expect(service.bellItems().find(i => i.share_result_request_id === 1)!.fresh).toBe(false);
          expect(inboxRow.seen).toBe(true);
          expect((service.receivedData.receivedContributionsPending as any)[1].seen).toBe(false);
        });

        it('(c) falsifier: no optimistic decrement while the PATCH is in flight', async () => {
          const pending$ = new Subject<any>();
          mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(() => pending$);
          const done = service.markRequestSeen(service.bellReceived()[0]);
          expect(service.bellCount()).toBe(3);
          pending$.next({ response: { seen: true } });
          pending$.complete();
          await done;
          expect(service.bellCount()).toBe(2);
        });

        it('(c) HTTP error: count unchanged, resolves false, never rejects', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});
          mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(() => throwError(() => ({ status: 500 })));
          await expect(service.markRequestSeen(service.bellReceived()[0])).resolves.toBe(false);
          expect(service.bellCount()).toBe(3);
        });

        it('(c) a 404 / not recorded answer does not drop the badge (BRS-R-3 BUT)', async () => {
          mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(() => of({ response: {}, status: 404 }));
          await expect(service.markRequestSeen(service.bellReceived()[0])).resolves.toBe(false);
          expect(service.bellCount()).toBe(3);
        });

        it('an already seen row issues no PATCH', async () => {
          mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(resolveSeen);
          await expect(service.markRequestSeen({ share_result_request_id: 5, seen: true })).resolves.toBe(true);
          expect(mockApiService.resultsSE.PATCH_markRequestSeen).not.toHaveBeenCalled();
        });
      });

      describe('markAllBellRead() (replaces markAllBellUpdatesRead)', () => {
        beforeEach(() => {
          mockApiService.resultsSE.PATCH_readAllNotifications = jest.fn(() => of({}));
          mockApiService.resultsSE.PATCH_markAllRequestsSeen = jest.fn(() => of({ response: { recorded: 2 } }));
        });

        it('(d) both succeed: both PATCHes with no arguments (phase-agnostic), refresh shows all seen, count 0, pending count unchanged', async () => {
          service.phaseFilter = '30';
          setBellEndpoints([req(1, false), req(2, false)], [updateRow(1)]);
          service.refreshBell();
          expect(service.bellCount()).toBe(3);

          setBellEndpoints([req(1, true), req(2, true)], []);
          const refreshSpy = jest.spyOn(service, 'refreshBell');
          const loadSpy = jest.spyOn(service, 'loadBellReadUpdates');
          await service.markAllBellRead();

          expect((mockApiService.resultsSE.PATCH_readAllNotifications.mock.calls[0] as any[]).length).toBe(0);
          expect((mockApiService.resultsSE.PATCH_markAllRequestsSeen.mock.calls[0] as any[]).length).toBe(0);
          expect(refreshSpy).toHaveBeenCalledTimes(1);
          expect(loadSpy).toHaveBeenCalledTimes(1);
          expect(service.bellCount()).toBe(0);
          expect(service.bellPendingRequestCount()).toBe(2);
          expect(mockApiService.resultsSE.PATCH_updateRequest).not.toHaveBeenCalled();
        });

        it('(d) read leg ok: unread inbox rows move to notificationsViewed as read, merged newest-first (R-9)', async () => {
          const unreadOld: any = { notification_id: 1, created_date: '2026-01-01', read: false };
          const unreadNew: any = { notification_id: 2, created_date: '2026-03-01', read: false };
          const viewedMid: any = { notification_id: 3, created_date: '2026-02-01', read: true };
          service.updatesData.notificationsPending = [unreadOld, unreadNew];
          service.updatesData.notificationsViewed = [viewedMid];

          await service.markAllBellRead();

          expect(service.updatesData.notificationsPending).toEqual([]);
          expect(service.updatesData.notificationsViewed.map((n: any) => n.notification_id)).toEqual([2, 3, 1]);
          expect(service.updatesData.notificationsViewed.every((n: any) => n.read === true)).toBe(true);
        });

        it('works with an empty inbox snapshot (does not depend on the phase-filtered updatesData)', async () => {
          service.updatesData.notificationsPending = [];
          await service.markAllBellRead();
          expect(mockApiService.resultsSE.PATCH_readAllNotifications).toHaveBeenCalledTimes(1);
          expect(mockApiService.resultsSE.PATCH_markAllRequestsSeen).toHaveBeenCalledTimes(1);
        });

        it('(d) seen-all fails, read-all succeeds: updates cleared, requests still counted, resolves', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});
          mockApiService.resultsSE.PATCH_markAllRequestsSeen = jest.fn(() => throwError(() => ({ status: 500 })));
          const inboxRow: any = { share_result_request_id: 1, seen: false };
          service.receivedData = { receivedContributionsPending: [inboxRow] as any, receivedContributionsDone: [] as any };
          setBellEndpoints([req(1, false), req(2, false)], [updateRow(1)]);
          service.refreshBell();

          setBellEndpoints([req(1, false), req(2, false)], []);
          await expect(service.markAllBellRead()).resolves.toBeUndefined();

          expect(service.bellUpdates()).toHaveLength(0);
          expect(service.bellCount()).toBe(2);
          expect(inboxRow.seen).toBe(false);
        });

        it('read-all fails, seen-all succeeds: inbox requests flip to seen, inbox updates untouched', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});
          mockApiService.resultsSE.PATCH_readAllNotifications = jest.fn(() => throwError(() => ({ status: 500 })));
          const inboxRow: any = { share_result_request_id: 1, seen: false };
          service.receivedData = { receivedContributionsPending: [inboxRow] as any, receivedContributionsDone: [] as any };
          service.updatesData.notificationsPending = [{ notification_id: 1, created_date: '2026-01-01', read: false }] as any;
          setBellEndpoints([req(1, true)], [updateRow(1)]);

          await service.markAllBellRead();

          expect(inboxRow.seen).toBe(true);
          expect(service.updatesData.notificationsPending).toHaveLength(1);
          expect(service.bellCount()).toBe(1);
        });

        it('(d) both fail: rejects, no refresh, state unchanged', async () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});
          mockApiService.resultsSE.PATCH_readAllNotifications = jest.fn(() => throwError(() => ({ status: 500 })));
          mockApiService.resultsSE.PATCH_markAllRequestsSeen = jest.fn(() => throwError(() => ({ status: 500 })));
          setBellEndpoints([req(1, false)], [updateRow(1)]);
          service.refreshBell();
          const refreshSpy = jest.spyOn(service, 'refreshBell');
          const loadSpy = jest.spyOn(service, 'loadBellReadUpdates');

          await expect(service.markAllBellRead()).rejects.toBeTruthy();

          expect(refreshSpy).not.toHaveBeenCalled();
          expect(loadSpy).not.toHaveBeenCalled();
          expect(service.bellCount()).toBe(2);
        });
      });

      describe('loadBellReadUpdates()', () => {
        it('(e) requests scope=history with limit=10 and no versionId, and stores the rows newest first', () => {
          service.phaseFilter = '30';
          mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsViewed: [readUpdate(1, '2026-01-01'), readUpdate(2, '2026-02-01')] } }));
          service.loadBellReadUpdates();
          expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ scope: 'history', limit: 10 });
          expect(service.bellReadUpdates().map(r => r.notification_id)).toEqual([2, 1]);
        });

        it('(e) a stale response is dropped', () => {
          const first$ = new Subject<any>();
          const second$ = new Subject<any>();
          const queue = [first$, second$];
          mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => queue.shift());
          service.loadBellReadUpdates();
          service.loadBellReadUpdates();
          second$.next({ response: { notificationsViewed: [readUpdate(2)] } });
          second$.complete();
          first$.next({ response: { notificationsViewed: [readUpdate(1), readUpdate(3)] } });
          first$.complete();
          expect(service.bellReadUpdates().map(r => r.notification_id)).toEqual([2]);
        });

        it('a failure keeps the previous rows', () => {
          jest.spyOn(console, 'error').mockImplementation(() => {});
          service.bellReadUpdates.set([readUpdate(1)]);
          mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => throwError(() => ({ status: 500 })));
          service.loadBellReadUpdates();
          expect(service.bellReadUpdates()).toHaveLength(1);
        });
      });

      it('decideRequest strips the bell tags and matches the row by request id even after it was flipped to seen', async () => {
        setBellEndpoints([req(1, false), req(2, false)], []);
        service.refreshBell();
        const tagged = service.bellItems().find(i => i.share_result_request_id === 1)!;
        mockApiService.resultsSE.PATCH_markRequestSeen = jest.fn(resolveSeen);
        await service.markRequestSeen(tagged);
        setBellEndpoints([req(2, false)], []);
        await service.decideRequest(tagged, true);
        const body = mockApiService.resultsSE.PATCH_updateRequest.mock.calls[0][0];
        expect('fresh' in body.result_request).toBe(false);
        expect('seen' in body.result_request).toBe(false);
        expect(service.bellReceived().map(r => r.share_result_request_id)).toEqual([2]);
      });
    });

    describe('decideRequest()', () => {
      beforeEach(() => {
        setBellEndpoints([decisionRow(1), decisionRow(2)], [updateRow(1)]);
        service.refreshBell();
      });

      it('sends the shared decision body with the P25 flag using the untagged row', async () => {
        const tagged = service.bellItems().find(i => i.share_result_request_id === 1)!;
        await service.decideRequest(tagged, true);
        const [body, isP25] = mockApiService.resultsSE.PATCH_updateRequest.mock.calls[0];
        expect(isP25).toBe(true);
        expect(body.request_status_id).toBe(2);
        expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
        expect(body.result_request.share_result_request_id).toBe(1);
        expect('kind' in body.result_request).toBe(false);
      });

      it('on success removes the row, toasts, and refreshes the bell without touching the inbox when no phase filter is set', async () => {
        const refreshSourceSpy = jest.spyOn(service, 'refreshSource');
        const bellSpy = jest.spyOn(service, 'refreshBell');
        setBellEndpoints([decisionRow(2)], [updateRow(1)]);
        await service.decideRequest(service.bellItems().find(i => i.share_result_request_id === 1)!, true);
        expect(service.bellReceived().map(r => r.share_result_request_id)).toEqual([2]);
        expect(service.bellCount()).toBe(2);
        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'noti', title: 'Request successfully accepted', status: 'success' })
        );
        expect(bellSpy).toHaveBeenCalled();
        expect(refreshSourceSpy).not.toHaveBeenCalled();
      });

      it('shows the rejected toast on decline', async () => {
        await service.decideRequest(service.bellItems()[0], false);
        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Request successfully rejected', status: 'information' })
        );
      });

      it('refreshes the received inbox source only when phaseFilter is set', async () => {
        service.phaseFilter = 30;
        const refreshSourceSpy = jest.spyOn(service, 'refreshSource');
        await service.decideRequest(service.bellItems()[0], true);
        expect(refreshSourceSpy).toHaveBeenCalledWith('received');
      });

      it('on 409 shows the stale message, refreshes the bell and does not reject', async () => {
        mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => throwError(() => ({ status: 409 })));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const bellSpy = jest.spyOn(service, 'refreshBell');
        setBellEndpoints([decisionRow(2)], [updateRow(1)]);
        await expect(service.decideRequest(service.bellItems()[0], true)).resolves.toBeUndefined();
        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'This request was already answered' }));
        expect(bellSpy).toHaveBeenCalled();
        expect(service.bellCount()).toBe(2);
      });

      it('PRA-R-3 acceptPrimaryForReview: sends the accept body, removes the row, refreshes the bell and never toasts', async () => {
        const bellSpy = jest.spyOn(service, 'refreshBell');
        setBellEndpoints([decisionRow(2)], [updateRow(1)]);
        await service.acceptPrimaryForReview(service.bellItems().find(i => i.share_result_request_id === 1)!);
        const [body] = mockApiService.resultsSE.PATCH_updateRequest.mock.calls[0];
        expect(body.request_status_id).toBe(2);
        expect('kind' in body.result_request).toBe(false);
        expect(service.bellReceived().map(r => r.share_result_request_id)).toEqual([2]);
        expect(bellSpy).toHaveBeenCalled();
        expect(mockApiService.alertsFe.show).not.toHaveBeenCalled();
      });

      it('PRA-R-3 acceptPrimaryForReview: a 409 resolves as success with NO already-answered toast', async () => {
        mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => throwError(() => ({ status: 409 })));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        await expect(service.acceptPrimaryForReview(service.bellItems()[0])).resolves.toBeUndefined();
        expect(mockApiService.alertsFe.show).not.toHaveBeenCalled();
      });

      it('PRA-R-3 acceptPrimaryForReview: a 500 rejects and leaves the row in place', async () => {
        mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => throwError(() => ({ status: 500 })));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        await expect(service.acceptPrimaryForReview(service.bellItems()[0])).rejects.toEqual({ status: 500 });
        expect(service.bellReceived().length).toBe(2);
      });

      it('on 500 rethrows, leaves the count and row unchanged, and does not refresh', async () => {
        mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => throwError(() => ({ status: 500 })));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const bellSpy = jest.spyOn(service, 'refreshBell');
        await expect(service.decideRequest(service.bellItems()[0], true)).rejects.toEqual({ status: 500 });
        expect(service.bellCount()).toBe(3);
        expect(service.bellReceived().length).toBe(2);
        expect(bellSpy).not.toHaveBeenCalled();
      });
    });
  });
});

// -----------------------------------------------------------------------------------------------
// @akili-spec notifications/admin-pending-paging — PPG-T-4 (bell: counts + bounded groups).
// Real ResultsApiService + HttpTestingController: the assertions are on the URLs that actually leave
// the client, for EVERY bell refresh path (PPG-R-2 BUT "no pending list without a limit", PPG-R-3).
// -----------------------------------------------------------------------------------------------
describe('ResultsNotificationsService bell over HTTP (PPG-T-4)', () => {
  let service: ResultsNotificationsService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl + 'api/';
  const received = base + 'results/request/get/received';
  const updates = base + 'notification/updates';
  const counts = base + 'notification/attention-counts';

  const adminCounts = { unseenRequests: 1000, pendingRequests: 1150, unreadUpdates: 6514 };
  const request = (n: number, seen: boolean) => ({
    share_result_request_id: n,
    request_status_id: 1,
    request_type: 'primary',
    requested_date: `2026-01-${String((n % 28) + 1).padStart(2, '0')}`,
    seen,
    obj_result: { obj_version: { obj_portfolio: { acronym: 'P25' } } }
  });
  const update = (n: number) => ({ notification_id: n, read: false, created_date: `2026-02-${String((n % 28) + 1).padStart(2, '0')}` });
  const ten = <T>(make: (n: number) => T, from = 1) => Array.from({ length: 10 }, (_, i) => make(from + i));

  /** Answers every pending GET of one bell refresh; returns the URLs seen (with query strings). */
  const answerBellGets = (countsBody: any = adminCounts): string[] => {
    const gets = httpMock.match(req => req.method === 'GET');
    gets.forEach(req => {
      const url = req.request.urlWithParams;
      const query = new URL(url).searchParams;
      if (url.startsWith(counts)) req.flush({ response: countsBody });
      else if (url.startsWith(received)) {
        const seen = query.get('seen') === 'true';
        req.flush({ response: { receivedContributionsPending: ten(n => request(n, seen), seen ? 100 : 1), pendingMeta: { hasMore: true, nextCursor: 'x', total: 1150 } } });
      } else if (url.startsWith(updates) && query.get('scope') === 'pending') {
        req.flush({ response: { notificationsPending: ten(update), notificationAnnouncement: [], pendingMeta: { hasMore: true, nextCursor: 'y', total: 6514 } } });
      } else req.flush({ response: { notificationsViewed: [], viewedMeta: { hasMore: false, nextCursor: null } } });
    });
    return gets.map(r => r.request.urlWithParams);
  };

  /** Every request for a pending list carries `limit` (counts has no list). */
  const expectBounded = (urls: string[]) => {
    const lists = urls.filter(u => u.startsWith(received) || u.startsWith(updates));
    expect(lists.length).toBeGreaterThan(0);
    lists.forEach(u => expect(u).toMatch(/[?&]limit=\d+/));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: SaveButtonService, useValue: {} },
        {
          provide: ApiService,
          useFactory: () => ({
            resultsSE: TestBed.inject(ResultsApiService),
            alertsFe: { show: jest.fn() },
            dataControlSE: { myInitiativesList: [], reportingCurrentPhase: null },
            rolesSE: { isAdmin: true }
          })
        }
      ]
    });
    service = TestBed.inject(ResultsNotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('refresh: admin counts + 10 rows per group -> badge input 7514, Decide 1150, at most 30 rows held', () => {
    service.refreshBell();
    const urls = answerBellGets();

    expect(urls).toHaveLength(4);
    expect(urls).toEqual(
      expect.arrayContaining([
        counts,
        `${received}?scope=pending&limit=10&seen=false`,
        `${received}?scope=pending&limit=10&seen=true`,
        `${updates}?scope=pending&limit=10`
      ])
    );
    expectBounded(urls);
    expect(service.bellCount()).toBe(7514);
    expect(service.bellPendingRequestCount()).toBe(1150);
    expect(service.bellReceived().length + service.bellUpdates().length).toBe(30);
    expect(service.bellItems().length).toBeLessThanOrEqual(30);
    expect(service.bellLoading()).toBe(false);
    expect(service.bellError()).toBe(false);
  });

  it('mark one read: the PATCH is followed by a bounded refresh', () => {
    service.updatesData.notificationsPending = [update(1)] as any;
    service.readUpdatesNotifications(service.updatesData.notificationsPending[0]);
    httpMock.expectOne(r => r.method === 'PATCH' && r.url === `${base}notification/read/1`).flush({});
    expectBounded(answerBellGets());
  });

  it('mark all read: both PATCHes, then a bounded refresh (and only bounded list GETs)', async () => {
    const done = service.markAllBellRead();
    httpMock.expectOne(r => r.method === 'PATCH' && r.url === `${base}notification/read-all`).flush({});
    httpMock.expectOne(r => r.method === 'PATCH' && r.url === `${base}results/request/seen-all`).flush({ response: { recorded: 1 } });
    await done;
    const urls = answerBellGets();
    expect(urls.filter(u => u.startsWith(counts))).toHaveLength(1);
    expectBounded(urls);
  });

  it('decide from the bell: the PATCH is followed by a bounded refresh', async () => {
    service.refreshBell();
    answerBellGets();
    const row = service.bellItems().find(i => i.kind === 'decision')!;
    const done = service.decideRequest(row, true);
    httpMock.expectOne(r => r.method === 'PATCH' && r.url.endsWith('request/update')).flush({});
    await done;
    expectBounded(answerBellGets());
  });

  it('decide with an inbox phase filter set: the bell part of the refresh stays bounded', async () => {
    service.phaseFilter = 30;
    service.refreshBell();
    answerBellGets();
    const done = service.decideRequest(service.bellItems().find(i => i.kind === 'decision')!, false);
    httpMock.expectOne(r => r.method === 'PATCH' && r.url.endsWith('request/update')).flush({});
    await done;
    // refreshSource('received') reloads the inbox (version_id, PPG-T-5 owns that paging) AND the bell (no version_id).
    const bellUrls = httpMock
      .match(r => r.method === 'GET')
      .map(r => r.request.urlWithParams)
      .filter(u => !u.includes('version_id'));
    expect(bellUrls.some(u => u.startsWith(counts))).toBe(true);
    expectBounded(bellUrls);
  });

  it('a failing counts request keeps the previous counts and sets bellError', () => {
    service.refreshBell();
    answerBellGets();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    service.refreshBell();
    httpMock
      .match(r => r.method === 'GET')
      .forEach(req => {
        if (req.request.urlWithParams.startsWith(counts)) req.flush({}, { status: 500, statusText: 'err' });
        else req.flush({ response: {} });
      });

    expect(service.bellCount()).toBe(7514);
    expect(service.bellPendingRequestCount()).toBe(1150);
    expect(service.bellError()).toBe(true);
    expect(service.bellLoading()).toBe(false);
  });
});
