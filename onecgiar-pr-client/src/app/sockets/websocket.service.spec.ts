import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { WebsocketService } from './websocket.service';
import { ApiService } from '../shared/services/api/api.service';
import { PrToastService } from '../shared/components/pr-toast';
import { ResultsNotificationsService } from '../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ResultFrameworkReportingHomeService } from '../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';

// @akili-spec notifications/inbox-paginated-load — PAGE-T-5 falsifier coverage: a socket
// `notifications` event must refresh ONLY its own source (pending + first history page) at the
// current `phaseFilter` via `refreshSource`, never a full/no-arg reload
// (`get_section_information`/`get_updates_notifications`).
//
// `ngx-socket-io`'s `Socket` is mocked so instantiating `WebsocketService` never opens a real
// socket.io-client connection (`socket = new Socket(...)` is a field initializer that would
// otherwise run for every test in this file).
jest.mock('ngx-socket-io', () => ({
  Socket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    fromEvent: jest.fn()
  }))
}));

describe('WebsocketService', () => {
  let service: WebsocketService;
  let mockResultsNotificationsService: { refreshSource: jest.Mock; updatesPopUpData: any[] };
  let mockResultFrameworkReportingHomeService: { getRecentActivity: jest.Mock };

  beforeEach(() => {
    mockResultsNotificationsService = {
      refreshSource: jest.fn(),
      updatesPopUpData: []
    };
    mockResultFrameworkReportingHomeService = {
      getRecentActivity: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        WebsocketService,
        { provide: ApiService, useValue: { authSE: { localStorageUser: { user_name: 'user', id: 1 } } } },
        { provide: PrToastService, useValue: { add: jest.fn() } },
        { provide: ResultsNotificationsService, useValue: mockResultsNotificationsService },
        { provide: ResultFrameworkReportingHomeService, useValue: mockResultFrameworkReportingHomeService }
      ]
    });

    service = TestBed.inject(WebsocketService);
    jest.spyOn(service, 'showToast1').mockImplementation(() => {});
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('refreshes the received source at the current phaseFilter when the event has no notification_id', () => {
      const msg = { result: {}, title: 'title', desc: 'desc' };
      jest.spyOn(service, 'listen').mockReturnValue(of(msg));

      service.getNotifications();

      expect(mockResultsNotificationsService.refreshSource).toHaveBeenCalledWith('received');
      expect(mockResultsNotificationsService.refreshSource).not.toHaveBeenCalledWith(undefined);
      expect(mockResultFrameworkReportingHomeService.getRecentActivity).toHaveBeenCalled();
    });

    it('refreshes the updates source at the current phaseFilter when the event has a notification_id', () => {
      const msg = { result: { notification_id: 5 }, title: 'title', desc: 'desc' };
      jest.spyOn(service, 'listen').mockReturnValue(of(msg));

      service.getNotifications();

      expect(mockResultsNotificationsService.refreshSource).toHaveBeenCalledWith('updates');
      expect(mockResultFrameworkReportingHomeService.getRecentActivity).toHaveBeenCalled();
    });
  });
});
