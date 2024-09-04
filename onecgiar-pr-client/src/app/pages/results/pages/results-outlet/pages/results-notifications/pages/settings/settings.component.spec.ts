import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { Observable, of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { InputSwitchModule } from 'primeng/inputswitch';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { MessageService } from 'primeng/api';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockRouter: jest.Mocked<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockResultsNotificationsService: jest.Mocked<ResultsNotificationsService>;

  beforeEach(() => {
    mockApiService = {
      dataControlSE: {
        myInitiativesList: [{ id: '1', name: 'Initiative 1' }]
      },
      resultsSE: {
        GET_userNotificationSettingsByInitiativeId: jest.fn(),
        PATCH_userNotificationSettingsByInitiativeId: jest.fn()
      }
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    mockActivatedRoute = {
      snapshot: {
        title: 'Settings',
        queryParams: {},
        url: [],
        params: {},
        fragment: '',
        data: {},
        outlet: '',
        component: undefined,
        routeConfig: undefined,
        root: new ActivatedRouteSnapshot(),
        parent: new ActivatedRouteSnapshot(),
        firstChild: new ActivatedRouteSnapshot(),
        children: [],
        pathFromRoot: [],
        paramMap: undefined,
        queryParamMap: undefined
      }
    };

    mockResultsNotificationsService = {} as any;

    TestBed.configureTestingModule({
      declarations: [SettingsComponent, AlertStatusComponent],
      imports: [RouterTestingModule, InputSwitchModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ResultsNotificationsService, useValue: mockResultsNotificationsService },
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should navigate to settings with first initiative id if no init param', () => {
      component.ngOnInit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['result/results-outlet/results-notifications/settings'], { queryParams: { init: '1' } });
    });

    it('should call getNotificationSettings if init param exists', () => {
      mockActivatedRoute.snapshot.queryParams['init'] = '1';

      const spy = jest.spyOn(component, 'getNotificationSettings');
      const mockGetUserNotificationSettingsSpy = jest.spyOn(mockApiService.resultsSE, 'GET_userNotificationSettingsByInitiativeId').mockReturnValue({
        subscribe: jest.fn(),
        source: undefined,
        operator: undefined,
        lift: function <R>(operator?: any): Observable<R> {
          throw new Error('Function not implemented.');
        },
        forEach: function (next: (value: any) => void): Promise<void> {
          throw new Error('Function not implemented.');
        },
        pipe: function (): Observable<any> {
          throw new Error('Function not implemented.');
        },
        toPromise: function (): Promise<any> {
          throw new Error('Function not implemented.');
        }
      });

      component.ngOnInit();

      expect(spy).toHaveBeenCalledWith('1');
      expect(mockGetUserNotificationSettingsSpy).toHaveBeenCalledWith('1');
    });
  });

  describe('getNotificationSettings', () => {
    it('should set notification settings on success', () => {
      const mockResponse = {
        response: {
          email_notifications_contributing_request_enabled: true,
          email_notifications_updates_enabled: false
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_userNotificationSettingsByInitiativeId').mockReturnValue(of(mockResponse));

      component.getNotificationSettings('1');

      expect(component.emailNotifications).toBe(true);
      expect(component.systemNotifications).toBe(false);
      expect(component.isLoading).toBe(false);
    });

    it('should handle error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(mockApiService.resultsSE, 'GET_userNotificationSettingsByInitiativeId').mockReturnValue(throwError(() => new Error('Test error')));

      component.getNotificationSettings('1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('handleInitiative', () => {
    it('should not navigate if no initiative', () => {
      component.handleInitiative(null);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate and get notification settings', () => {
      const initiative = { id: '2', name: 'Initiative 2' };
      const getNotificationSettingsSpy = jest.spyOn(component, 'getNotificationSettings');
      const mockGetUserNotificationSettingsSpy = jest.spyOn(mockApiService.resultsSE, 'GET_userNotificationSettingsByInitiativeId').mockReturnValue({
        subscribe: jest.fn(),
        source: undefined,
        operator: undefined,
        lift: function <R>(operator?: any): Observable<R> {
          throw new Error('Function not implemented.');
        },
        forEach: function (next: (value: any) => void): Promise<void> {
          throw new Error('Function not implemented.');
        },
        pipe: function (): Observable<any> {
          throw new Error('Function not implemented.');
        },
        toPromise: function (): Promise<any> {
          throw new Error('Function not implemented.');
        }
      });

      component.handleInitiative(initiative);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['result/results-outlet/results-notifications/settings'], { queryParams: { init: '2' } });
      expect(mockGetUserNotificationSettingsSpy).toHaveBeenCalledWith('2');
      expect(component.emailNotifications).toBe(false);
      expect(component.systemNotifications).toBe(false);
      expect(getNotificationSettingsSpy).toHaveBeenCalledWith('2');
    });
  });

  describe('onSaveSection', () => {
    it('should not save notification settings if isSaving or no init param', () => {
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_userNotificationSettingsByInitiativeId).not.toHaveBeenCalled();
    });

    it('should save notification settings', () => {
      mockActivatedRoute.snapshot.queryParams['init'] = '1';
      component.emailNotifications = true;
      component.systemNotifications = false;
      const mockResponse = { success: true };
      jest.spyOn(mockApiService.resultsSE, 'PATCH_userNotificationSettingsByInitiativeId').mockReturnValue(of(mockResponse));
      const getNotificationSettingsSpy = jest.spyOn(component, 'getNotificationSettings');

      component.onSaveSection();

      expect(mockApiService.resultsSE.PATCH_userNotificationSettingsByInitiativeId).toHaveBeenCalledWith({
        initiative_id: '1',
        email_notifications_contributing_request_enabled: true,
        email_notifications_updates_enabled: false
      });
      expect(component.isSaving).toBe(false);
      expect(getNotificationSettingsSpy).toHaveBeenCalledWith('1');
    });

    it('should handle error when saving', () => {
      mockActivatedRoute.snapshot.queryParams['init'] = '1';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(mockApiService.resultsSE, 'PATCH_userNotificationSettingsByInitiativeId').mockReturnValue(throwError(() => new Error('Test error')));

      component.onSaveSection();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(component.isSaving).toBe(false);
    });
  });
});
