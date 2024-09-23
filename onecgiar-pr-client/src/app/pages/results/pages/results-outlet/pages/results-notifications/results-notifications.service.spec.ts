import { TestBed } from '@angular/core/testing';
import { ResultsNotificationsService } from './results-notifications.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';

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
        ]
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
        expect(service.receivedData).toEqual({ receivedContributionsDone: [], receivedContributionsPending: [] });
      });
    });
  });

  describe('get_section_innovation_packages()', () => {
    it('should update dataIPSR for get_section_innovation_packages', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 1;

      service.get_section_innovation_packages();

      expect(service.dataIPSR).toEqual([
        {
          approving_inititiative_id: 1,
          result_type_id: 10,
          readOnly: true
        },
        {
          requester_initiative_id: 1,
          request_status_id: 4,
          shared_inititiative_id: 1,
          result_type_id: 10,
          pending: true
        }
      ]);
    });
    it('should update dataIPSR for get_section_innovation_packages when request_status_id is not 1', () => {
      mockGET_allRequestResponse.requestPendingData[0].request_status_id = 2;

      service.get_section_innovation_packages();

      expect(service.dataIPSR).toEqual([
        {
          approving_inititiative_id: 1,
          result_type_id: 10,
          readOnly: true
        },
        {
          requester_initiative_id: 1,
          request_status_id: 2,
          result_type_id: 10
        }
      ]);
    });
    it('should not update dataIPSR for get_section_innovation_packages', () => {
      mockApiService.resultsSE.GET_requestIPSR = () => of({});
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_requestIPSR');

      service.get_section_innovation_packages();

      expect(spy).toHaveBeenCalled();
      expect(service.dataIPSR).toEqual([]);
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

      expect(service.receivedData).toEqual({ receivedContributionsPending: [], receivedContributionsDone: [] });
      expect(service.sentData).toEqual({ sentContributionsPending: [], sentContributionsDone: [] });
    });

    it('should call resetFilters', () => {
      const resetFiltersSpy = jest.spyOn(service, 'resetFilters');

      service.resetNotificationInformation();

      expect(resetFiltersSpy).toHaveBeenCalled();
    });
  });

  describe('resetFilters', () => {
    it('should reset filters correctly', () => {
      service.hideInitFilter = true;
      service.initiativeIdFilter = 1;
      service.searchFilter = 'test';

      service.resetFilters();

      expect(service.hideInitFilter).toBe(false);
      expect(service.initiativeIdFilter).toBe(null);
      expect(service.searchFilter).toBe(null);
    });
  });
});
