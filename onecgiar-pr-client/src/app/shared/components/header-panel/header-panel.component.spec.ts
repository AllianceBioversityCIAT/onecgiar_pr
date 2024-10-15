import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderPanelComponent } from './header-panel.component';
import { HttpClientModule } from '@angular/common/http';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';

describe('HeaderPanelComponent', () => {
  let component: HeaderPanelComponent;
  let fixture: ComponentFixture<HeaderPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderPanelComponent, PrButtonComponent],
      imports: [HttpClientModule, SatPopoverModule, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call get_updates_notifications and get_updates_pop_up_notifications on ngOnInit', () => {
    const getUpdatesNotificationsSpy = jest.spyOn(component.resultsNotificationsSE, 'get_updates_notifications').mockImplementation(() => {});
    const getUpdatesPopUpNotificationsSpy = jest
      .spyOn(component.resultsNotificationsSE, 'get_updates_pop_up_notifications')
      .mockImplementation(() => {});
    const updateUserDataSpy = jest.spyOn(component.api, 'updateUserData').mockImplementation(callback => callback());

    component.ngOnInit();

    expect(updateUserDataSpy).toHaveBeenCalled();
    expect(getUpdatesNotificationsSpy).toHaveBeenCalled();
    expect(getUpdatesPopUpNotificationsSpy).toHaveBeenCalled();

    getUpdatesNotificationsSpy.mockRestore();
    getUpdatesPopUpNotificationsSpy.mockRestore();
    updateUserDataSpy.mockRestore();
  });

  it('should return "0" when updatesPopUpData is empty', () => {
    component.resultsNotificationsSE.updatesPopUpData = [];
    expect(component.notificationBadgeLength()).toBe('0');
  });

  it('should return the correct length when updatesPopUpData has items', () => {
    component.resultsNotificationsSE.updatesPopUpData = ['notification1', 'notification2'];
    expect(component.notificationBadgeLength()).toBe('2');
  });

  it('should open the information link in a new window with correct parameters', () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const url = component.globalLinksSE.links.url_platform_information;
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;
    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;

    component.openInfoLink();

    expect(windowOpenSpy).toHaveBeenCalledWith(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);

    windowOpenSpy.mockRestore();
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
