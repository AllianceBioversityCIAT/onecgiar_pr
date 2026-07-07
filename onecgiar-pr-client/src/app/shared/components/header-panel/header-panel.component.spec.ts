import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderPanelComponent } from './header-panel.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('HeaderPanelComponent', () => {
  let component: HeaderPanelComponent;
  let fixture: ComponentFixture<HeaderPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrButtonComponent],
      imports: [HttpClientTestingModule, SatPopoverModule, TooltipModule, HeaderPanelComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the user name, email and platform role inline in the header bar', () => {
    // inLocal=true prevents the <app-tawk> *ngIf from rendering once name+email are set
    component.inLocal = true;
    component.api.authSE.localStorageUser = { user_name: 'Yeckzin Zuñiga', email: 'y.zuniga@cgiar.org' } as any;
    component.api.rolesSE.roles = { application: { description: 'Admin' } } as any;
    fixture.detectChanges();

    const trigger: HTMLElement = fixture.nativeElement.querySelector('.user_identity');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.querySelector('.user_identity_name')?.textContent).toContain('Yeckzin Zuñiga');
    expect(trigger.querySelector('.user_identity_email')?.textContent).toContain('y.zuniga@cgiar.org');
    expect(trigger.querySelector('.user_identity_role')?.textContent).toContain('Admin');

    // avoid leaking the user into the shared singleton (would render <app-tawk> in other specs)
    component.api.authSE.localStorageUser = null as any;
    component.api.rolesSE.roles = null as any;
  });

  it('should default platform role to Guest when no application role is available', () => {
    component.api.rolesSE.roles = null as any;
    expect(component.getPlatformRole()).toBe('Guest');
  });

  it('should return the platform role description when available', () => {
    component.api.rolesSE.roles = { application: { description: 'Administrator' } } as any;
    expect(component.getPlatformRole()).toBe('Administrator');
  });

  it('should call get_updates_notifications and get_updates_pop_up_notifications on ngOnInit', () => {
    const getUpdatesNotificationsSpy = jest.spyOn(component.resultsNotificationsSE, 'get_updates_notifications').mockImplementation(() => {});
    const getUpdatesPopUpNotificationsSpy = jest
      .spyOn(component.resultsNotificationsSE, 'get_updates_pop_up_notifications')
      .mockImplementation(() => {});
    const updateUserDataSpy = jest.spyOn(component.api, 'updateUserData').mockImplementation(callback => callback());
    const getCurrentPhasesSpy = jest.spyOn(component.api.dataControlSE, 'getCurrentPhases').mockImplementation(() => of({}));

    component.ngOnInit();

    expect(updateUserDataSpy).toHaveBeenCalled();
    expect(getUpdatesNotificationsSpy).toHaveBeenCalled();
    expect(getUpdatesPopUpNotificationsSpy).toHaveBeenCalled();
    expect(getCurrentPhasesSpy).toHaveBeenCalled();

    getUpdatesNotificationsSpy.mockRestore();
    getUpdatesPopUpNotificationsSpy.mockRestore();
    updateUserDataSpy.mockRestore();
    getCurrentPhasesSpy.mockRestore();
  });

  it('should return "0" when updatesPopUpData is empty', () => {
    component.resultsNotificationsSE.updatesPopUpData = [];
    expect(component.notificationBadgeLength()).toBe('0');
  });

  it('should return the correct length when updatesPopUpData has items', () => {
    component.resultsNotificationsSE.updatesPopUpData = ['notification1', 'notification2'];
    expect(component.notificationBadgeLength()).toBe('2');
  });

  it('should navigate to results-notifications/requests', () => {
    const routerNavigateSpy = jest.spyOn(component.router, 'navigate').mockImplementation(() => null);

    component.goToNotifications();

    expect(routerNavigateSpy).toHaveBeenCalledWith(['result/results-outlet/results-notifications/requests']);

    routerNavigateSpy.mockRestore();
  });

  it('should do nothing if updatesPopUpData is empty', () => {
    component.resultsNotificationsSE.updatesPopUpData = [];
    const handlePopUpNotificationLastViewedSpy = jest.spyOn(component.resultsNotificationsSE, 'handlePopUpNotificationLastViewed');

    component.handleClosePopUp();

    expect(component.resultsNotificationsSE.updatesPopUpData.length).toBe(0);
    expect(handlePopUpNotificationLastViewedSpy).not.toHaveBeenCalled();
  });

  it('should clear updatesPopUpData and call handlePopUpNotificationLastViewed if updatesPopUpData is not empty', () => {
    component.resultsNotificationsSE.updatesPopUpData = ['notification1', 'notification2'];
    const handlePopUpNotificationLastViewedSpy = jest.spyOn(component.resultsNotificationsSE, 'handlePopUpNotificationLastViewed');

    component.handleClosePopUp();

    expect(component.resultsNotificationsSE.updatesPopUpData.length).toBe(0);
    expect(handlePopUpNotificationLastViewedSpy).toHaveBeenCalled();
  });
});
