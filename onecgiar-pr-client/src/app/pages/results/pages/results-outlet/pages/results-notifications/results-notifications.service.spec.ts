import { TestBed } from '@angular/core/testing';
import { ResultsNotificationsService } from './results-notifications.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 7, scope: 'pending' });
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

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 3, scope: 'pending' });
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

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'pending' });
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

      expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ versionId: 9, scope: 'pending' });
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

      expect(mockApiService.resultsSE.GET_requestUpdates).toHaveBeenCalledWith({ versionId: 7, scope: 'pending' });
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

      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledWith({ versionId: 42, scope: 'pending' });
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

  describe('markAllUpdatesNotificationsAsRead', () => {
    it('should not call the API when there are no notifications', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readAllNotifications').mockReturnValue(of({}));

      service.markAllUpdatesNotificationsAsRead();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should update updatesData correctly', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      const notification2 = { notification_id: 1, read: false, created_date: '2023-01-04' };
      service.updatesData.notificationsPending = [notification2, notification];
      service.updatesData.notificationsViewed = [];

      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readAllNotifications').mockReturnValue(of({}));

      service.markAllUpdatesNotificationsAsRead();

      expect(spy).toHaveBeenCalled();
      expect(service.updatesData.notificationsPending).toEqual([]);
      expect(service.updatesData.notificationsViewed).toEqual([
        { ...notification2, read: true },
        { ...notification, read: true }
      ]);
      expect(service.updatesData.notificationsViewed[0].read).toBe(true);
    });

    it('should handle errors correctly', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [notification];
      service.updatesData.notificationsViewed = [];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_readAllNotifications').mockReturnValue(throwError(() => 'error'));

      service.markAllUpdatesNotificationsAsRead();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('error');
      expect(service.updatesData.notificationsPending).toEqual([{ ...notification, read: false }]);
      expect(service.updatesData.notificationsViewed).toEqual([]);
    });

    // NOTIF-T-6 rework (Reviewer's remediation item 1): this button backs "Mark all as read" — the
    // navigate-away through the deleted `.../updates` route was throwing the user off the page.
    it('does not navigate away — the mutation above is the whole update', () => {
      const notification = { notification_id: 1, read: false, created_date: '2023-01-01' };
      service.updatesData.notificationsPending = [notification];
      service.updatesData.notificationsViewed = [];
      jest.spyOn(mockApiService.resultsSE, 'PATCH_readAllNotifications').mockReturnValue(of({}));
      const navigateByUrlSpy = jest.spyOn(Router.prototype, 'navigateByUrl');
      const navigateSpy = jest.spyOn(Router.prototype, 'navigate');

      service.markAllUpdatesNotificationsAsRead();

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

    const setBellEndpoints = (received: any[], updates: any[]) => {
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => of({ response: { receivedContributionsPending: received } }));
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsPending: updates } }));
    };

    beforeEach(() => {
      mockApiService.alertsFe = { show: jest.fn() };
      mockApiService.resultsSE.PATCH_updateRequest = jest.fn(() => of({}));
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
      expect(mockApiService.resultsSE.GET_allRequest).toHaveBeenCalledTimes(1);
      const allOpts = mockApiService.resultsSE.GET_allRequest.mock.calls[0][0];
      const updOpts = mockApiService.resultsSE.GET_requestUpdates.mock.calls[0][0];
      expect(allOpts).toEqual({ scope: 'pending' });
      expect('versionId' in allOpts).toBe(false);
      expect(updOpts).toEqual({ scope: 'pending' });
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
      const queue = [first$, second$];
      mockApiService.resultsSE.GET_allRequest = jest.fn(() => queue.shift());
      mockApiService.resultsSE.GET_requestUpdates = jest.fn(() => of({ response: { notificationsPending: [] } }));

      service.refreshBell();
      service.refreshBell();
      second$.next({ response: { receivedContributionsPending: [decisionRow(2)] } });
      second$.complete();
      first$.next({ response: { receivedContributionsPending: [decisionRow(1), decisionRow(3)] } });
      first$.complete();

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

    it('markAllUpdatesNotificationsAsRead calls refreshBell after success', () => {
      const spy = jest.spyOn(service, 'refreshBell');
      service.updatesData.notificationsPending = [{ notification_id: 1, created_date: '2026-01-01' }] as any;
      service.markAllUpdatesNotificationsAsRead();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    // BELL-T-10: the popover's "Mark as read" — phase-agnostic, decisions untouched.
    describe('markAllBellUpdatesRead() (BELL-T-10)', () => {
      it('PATCHes read-all with NO arguments (no versionId even with a phase filter), then refreshBell()', async () => {
        service.phaseFilter = '30';
        const patch = jest.fn(() => of({}));
        mockApiService.resultsSE.PATCH_readAllNotifications = patch;
        const spy = jest.spyOn(service, 'refreshBell');
        await service.markAllBellUpdatesRead();
        expect(patch).toHaveBeenCalledTimes(1);
        expect((patch.mock.calls[0] as any[]).length).toBe(0);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('works with an empty inbox snapshot (it must not depend on the phase-filtered updatesData)', async () => {
        service.updatesData.notificationsPending = [];
        const patch = jest.fn(() => of({}));
        mockApiService.resultsSE.PATCH_readAllNotifications = patch;
        await service.markAllBellUpdatesRead();
        expect(patch).toHaveBeenCalledTimes(1);
      });

      it('never touches pending decisions (no decision PATCH, bellReceived kept)', async () => {
        setBellEndpoints([decisionRow(1), decisionRow(2)], [updateRow(1)]);
        service.refreshBell();
        mockApiService.resultsSE.PATCH_readAllNotifications = jest.fn(() => of({}));
        setBellEndpoints([decisionRow(1), decisionRow(2)], []);
        await service.markAllBellUpdatesRead();
        expect(mockApiService.resultsSE.PATCH_updateRequest).not.toHaveBeenCalled();
        expect(service.bellReceived()).toHaveLength(2);
        expect(service.bellUpdates()).toHaveLength(0);
      });

      it('rejects and does NOT refresh the bell when the PATCH fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        mockApiService.resultsSE.PATCH_readAllNotifications = jest.fn(() => throwError(() => ({ status: 500 })));
        const spy = jest.spyOn(service, 'refreshBell');
        await expect(service.markAllBellUpdatesRead()).rejects.toBeTruthy();
        expect(spy).not.toHaveBeenCalled();
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
