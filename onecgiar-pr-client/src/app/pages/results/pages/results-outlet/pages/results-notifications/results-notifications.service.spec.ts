import { TestBed } from '@angular/core/testing';
import { ResultsNotificationsService } from './results-notifications.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { StatusPhaseEnum, ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';

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
        GET_allRequest: () => of({ response: mockGET_allRequestResponse }),
        GET_requestStatus: () => of({}),
        GET_requestIPSR: () => of({ response: mockGET_allRequestResponse }),
        GET_sentRequest: () => of({}),
        GET_requestUpdates: () => of({}),
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

  describe('get_section_information()', () => {
    it('should update data for get_section_information', () => {
      const response = {
        receivedContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }],
        receivedContributionsPending: [{ requested_date: '2023-01-02' }, { requested_date: '2023-01-04' }]
      };

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest').mockReturnValue(of({ response }));

      service.get_section_information(() => {
        expect(spy).toHaveBeenCalled();
        expect(service.receivedData).toEqual({
          receivedContributionsDone: [{ requested_date: '2023-02-01' }, { requested_date: '2023-01-01' }],
          receivedContributionsPending: [{ requested_date: '2023-01-04' }, { requested_date: '2023-01-02' }]
        });
      });
    });
    it('should update data for get_section_information when item.request_status_id is not 1', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 2;
      service.get_section_information(() => {
        expect(service.receivedData).toEqual([
          {
            approving_inititiative_id: 1,
            result_type_id: 10,
            readOnly: true
          },
          {
            result_type_id: 10,
            requester_initiative_id: 1,
            request_status_id: 2
          }
        ]);
      });
    });
    it('should not update data for get_section_information', () => {
      mockApiService.resultsSE.GET_allRequest = () => of({});
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest');

      service.get_section_information(() => {
        expect(spy).toHaveBeenCalled();
        expect(service.receivedData).toEqual([]);
      });
    });
    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_allRequest').mockReturnValue(throwError(() => 'error'));

      service.get_section_information(() => {
        expect(spy).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('error');
        expect(service.receivedData).toEqual({ receivedContributionsDone: null, receivedContributionsPending: null });
      });
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
    it('should update sentData correctly', () => {
      const response = {
        sentContributionsDone: [{ requested_date: '2023-01-01' }, { requested_date: '2023-02-01' }],
        sentContributionsPending: [{ requested_date: '2023-01-02' }, { requested_date: '2023-01-04' }]
      };

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_sentRequest').mockReturnValue(of({ response }));

      service.get_sent_notifications();

      expect(spy).toHaveBeenCalled();
      expect(service.sentData).toEqual({
        sentContributionsDone: [{ requested_date: '2023-02-01' }, { requested_date: '2023-01-01' }],
        sentContributionsPending: [{ requested_date: '2023-01-04' }, { requested_date: '2023-01-02' }]
      });
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_sentRequest').mockReturnValue(throwError(() => 'error'));

      service.get_sent_notifications();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('error');
      expect(service.sentData).toEqual({ sentContributionsDone: [], sentContributionsPending: [] });
    });

    it('should not update sentData when response is empty', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_sentRequest').mockReturnValue(of({}));

      service.get_sent_notifications();

      expect(spy).toHaveBeenCalled();
      expect(service.sentData).toEqual({ sentContributionsDone: [], sentContributionsPending: [] });
    });
  });

  describe('get_updates_notifications', () => {
    it('should update updatesData correctly', () => {
      const response = {
        notificationsPending: [{ created_date: '2023-01-01' }, { created_date: '2023-01-03' }],
        notificationsViewed: [{ created_date: '2023-01-02' }, { created_date: '2023-01-04' }],
        notificationAnnouncement: []
      };

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_requestUpdates').mockReturnValue(of({ response }));

      service.get_updates_notifications();

      expect(spy).toHaveBeenCalled();
      expect(service.updatesData).toEqual({
        notificationsPending: [{ created_date: '2023-01-03' }, { created_date: '2023-01-01' }],
        notificationsViewed: [{ created_date: '2023-01-04' }, { created_date: '2023-01-02' }],
        notificationAnnouncements: []
      });
    });

    it('should handle errors correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_requestUpdates').mockReturnValue(throwError(() => 'error'));

      service.get_updates_notifications();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('error');
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
    });

    describe('onPhaseChange()', () => {
      it('re-fetches Updates/Received/Sent and re-derives filteredInitiatives for the new phase', () => {
        service.phaseList = [{ id: 1, obj_portfolio: { id: 2, acronym: 'INIT' } }];
        const updatesSpy = jest.spyOn(service, 'get_updates_notifications').mockImplementation();
        const sectionSpy = jest.spyOn(service, 'get_section_information').mockImplementation();
        const sentSpy = jest.spyOn(service, 'get_sent_notifications').mockImplementation();

        service.onPhaseChange(1);

        expect(updatesSpy).toHaveBeenCalledWith(1);
        expect(sectionSpy).toHaveBeenCalledWith(1);
        expect(sentSpy).toHaveBeenCalledWith(1);
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
});
