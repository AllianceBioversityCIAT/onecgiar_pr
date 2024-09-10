import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let apiServiceMock: any;
  let activatedRouteMock: any;
  let messageServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      dataControlSE: {
        myInitiativesList: [{ id: '1' }]
      },
      resultsSE: {
        GET_userAllNotificationSettings: jest.fn().mockReturnValue(of({ response: [] })),
        PATCH_userNotificationSettingsByInitiativeId: jest.fn().mockReturnValue(of({}))
      }
    };

    activatedRouteMock = {
      snapshot: {
        queryParams: {
          init: '1'
        }
      }
    };

    messageServiceMock = {
      add: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct settings', () => {
    expect(apiServiceMock.resultsSE.GET_userAllNotificationSettings).toHaveBeenCalled();
    expect(component.settingsArray.length).toBe(1);
  });

  it('should navigate to settings with myInitiativesList first id when queryParams init is undefined', () => {
    activatedRouteMock.snapshot.queryParams.init = undefined;

    component.ngOnInit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['result/results-outlet/results-notifications/settings'], { queryParams: { init: '1' } });
  });

  it('should get notification settings when queryParams init is defined', () => {
    component.ngOnInit();
    expect(apiServiceMock.resultsSE.GET_userAllNotificationSettings).toHaveBeenCalled();
  });

  it('should handle initiative settings change', () => {
    component.emailNotifications = true;
    component.systemNotifications = true;
    component.handleInitiativeSettingsChange();
    expect(component.settingsArray[0].email_notifications_contributing_request_enabled).toBe(true);
    expect(component.settingsArray[0].email_notifications_updates_enabled).toBe(true);
  });

  it('should get notification settings', () => {
    component.getNotificationSettings('1');
    expect(component.isLoading).toBe(false);
    expect(component.settingsArray.length).toBe(1);
  });

  it('should handle get notification settings error', () => {
    const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    apiServiceMock.resultsSE.GET_userAllNotificationSettings.mockReturnValue(throwError(() => 'error'));

    component.getNotificationSettings('1');

    expect(component.isLoading).toBe(false);
    expect(spyConsole).toHaveBeenCalled();
  });

  it('should handle initiative', () => {
    component.handleInitiative({ id: '1' });
    expect(routerMock.navigate).toHaveBeenCalledWith(['result/results-outlet/results-notifications/settings'], { queryParams: { init: '1' } });
  });

  it('should not handle initiative if initiative is undefined', () => {
    component.handleInitiative(undefined);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should return if it is saving', () => {
    component.isSaving = true;
    component.onSaveSection();
    expect(apiServiceMock.resultsSE.PATCH_userNotificationSettingsByInitiativeId).not.toHaveBeenCalled();
  });

  it('should save section', () => {
    component.onSaveSection();
    expect(apiServiceMock.resultsSE.PATCH_userNotificationSettingsByInitiativeId).toHaveBeenCalled();
  });

  it('should handle save error', () => {
    const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    apiServiceMock.resultsSE.PATCH_userNotificationSettingsByInitiativeId.mockReturnValue(throwError(() => 'error'));

    component.onSaveSection();

    expect(component.isSaving).toBe(false);
    expect(spyConsole).toHaveBeenCalled();
  });

  it('should handle save success', () => {
    component.handleSaveSuccess();
    expect(messageServiceMock.add).toHaveBeenCalledWith({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!' });
  });
});
