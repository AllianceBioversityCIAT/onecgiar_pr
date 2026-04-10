import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { WebsocketService } from './websocket.service';
import { ApiService } from '../shared/services/api/api.service';
import { ResultsNotificationsService } from '../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ResultFrameworkReportingHomeService } from '../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';

// Mock ngx-socket-io Socket
jest.mock('ngx-socket-io', () => {
  return {
    Socket: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      fromEvent: jest.fn().mockReturnValue(new Subject())
    }))
  };
});

describe('WebsocketService', () => {
  let service: WebsocketService;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockApiService: any;
  let mockMessageService: jest.Mocked<Partial<MessageService>>;
  let mockResultsNotificationsService: any;
  let mockResultFrameworkReportingHomeService: any;

  beforeEach(() => {
    mockRouter = {
      navigateByUrl: jest.fn()
    };

    mockApiService = {
      authSE: {
        localStorageUser: {
          user_name: 'TestUser',
          id: 1
        }
      }
    };

    mockMessageService = {
      add: jest.fn()
    };

    mockResultsNotificationsService = {
      updatesPopUpData: [],
      get_section_information: jest.fn(),
      get_updates_notifications: jest.fn()
    };

    mockResultFrameworkReportingHomeService = {
      getRecentActivity: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        WebsocketService,
        { provide: Router, useValue: mockRouter },
        { provide: ApiService, useValue: mockApiService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ResultsNotificationsService, useValue: mockResultsNotificationsService },
        { provide: ResultFrameworkReportingHomeService, useValue: mockResultFrameworkReportingHomeService }
      ]
    });

    service = TestBed.inject(WebsocketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('platform ternary', () => {
    it('should set platform to PRMS-TEST when environment.production is false', () => {
      expect(environment.production).toBe(false);
      expect(service.platform).toBe('PRMS-TEST');
    });
  });

  describe('getNotifications', () => {
    it('should call get_section_information when msg.result.notification_id is falsy', () => {
      const notifSubject = new Subject<any>();
      service.socket.fromEvent = jest.fn().mockReturnValue(notifSubject.asObservable());

      service.getNotifications();

      const msg = {
        result: { notification_id: null },
        title: 'Test title',
        desc: 'Test desc'
      };
      notifSubject.next(msg);

      expect(mockResultsNotificationsService.get_section_information).toHaveBeenCalled();
      expect(mockResultsNotificationsService.get_updates_notifications).not.toHaveBeenCalled();
    });

    it('should call get_updates_notifications when msg.result.notification_id is truthy', () => {
      const notifSubject = new Subject<any>();
      service.socket.fromEvent = jest.fn().mockReturnValue(notifSubject.asObservable());

      service.getNotifications();

      const msg = {
        result: { notification_id: 123 },
        title: 'Test title',
        desc: 'Test desc'
      };
      notifSubject.next(msg);

      expect(mockResultsNotificationsService.get_updates_notifications).toHaveBeenCalled();
      expect(mockResultsNotificationsService.get_section_information).not.toHaveBeenCalled();
    });

    it('should call get_section_information when msg.result is undefined (optional chaining)', () => {
      const notifSubject = new Subject<any>();
      service.socket.fromEvent = jest.fn().mockReturnValue(notifSubject.asObservable());

      service.getNotifications();

      const msg = {
        result: undefined,
        title: 'Test',
        desc: 'Test'
      };
      notifSubject.next(msg);

      expect(mockResultsNotificationsService.get_section_information).toHaveBeenCalled();
    });

    it('should call showToast1, unshift to updatesPopUpData, and call getRecentActivity', () => {
      const notifSubject = new Subject<any>();
      service.socket.fromEvent = jest.fn().mockReturnValue(notifSubject.asObservable());
      const showToastSpy = jest.spyOn(service, 'showToast1');

      service.getNotifications();

      const msg = {
        result: { notification_id: 1, someData: 'test' },
        title: 'Notif Title',
        desc: 'Notif Desc'
      };
      notifSubject.next(msg);

      expect(showToastSpy).toHaveBeenCalledWith(msg);
      expect(mockResultsNotificationsService.updatesPopUpData[0]).toEqual(msg.result);
      expect(mockResultFrameworkReportingHomeService.getRecentActivity).toHaveBeenCalled();
    });
  });

  describe('showToast1', () => {
    it('should call messageService.add with correct params', () => {
      const msg = { title: 'Title', desc: 'Description' };
      service.showToast1(msg);
      expect(mockMessageService.add).toHaveBeenCalledWith({
        key: 'globalUserNotification',
        severity: 'info',
        summary: 'Title',
        detail: 'Description'
      });
    });
  });

  describe('checkStatus', () => {
    it('should set socketStatus to true on connect', () => {
      const handlers: Record<string, Function> = {};
      service.socket.on = jest.fn((event: string, cb: Function) => {
        handlers[event] = cb;
      });

      service.checkStatus();

      handlers['connect']();
      expect(service.socketStatus).toBe(true);

      handlers['disconnect']();
      expect(service.socketStatus).toBe(false);
    });
  });

  describe('emit', () => {
    it('should call socket.emit', () => {
      const callback = jest.fn();
      service.emit('test-event', { data: 1 }, callback);
      expect(service.socket.emit).toHaveBeenCalledWith('test-event', { data: 1 }, callback);
    });
  });

  describe('logoutWS', () => {
    it('should reset user and navigate to empty route', () => {
      service.user = { name: 'test' } as any;
      service.logoutWS();
      expect(service.user).toBeNull();
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('');
    });
  });

  describe('configUser', () => {
    it('should emit config-user and resolve', async () => {
      service.socket.emit = jest.fn((event, payload, callback) => {
        callback({});
      });

      await service.configUser('TestUser', 1);
      expect(service.user).toBeTruthy();
      expect(service.user!.name).toBe('TestUser');
    });
  });

  describe('getUser', () => {
    it('should return the user', () => {
      service.user = null;
      expect(service.getUser()).toBeNull();
    });
  });
});
