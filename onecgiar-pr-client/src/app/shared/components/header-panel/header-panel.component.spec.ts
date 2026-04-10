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

  describe('getUserInitials', () => {
    it('should return user_acronym when available', () => {
      component.api.authSE.localStorageUser = { user_acronym: 'YG' };
      expect(component.getUserInitials()).toBe('YG');
    });

    it('should compute initials from user_name when no acronym', () => {
      component.api.authSE.localStorageUser = { user_name: 'John Doe' };
      expect(component.getUserInitials()).toBe('JD');
    });

    it('should return at most 2 initials', () => {
      component.api.authSE.localStorageUser = { user_name: 'John Michael Doe Smith' };
      expect(component.getUserInitials()).toBe('JM');
    });

    it('should handle empty user_name', () => {
      component.api.authSE.localStorageUser = { user_name: '' };
      expect(component.getUserInitials()).toBe('');
    });

    it('should handle null/undefined localStorageUser gracefully', () => {
      component.api.authSE.localStorageUser = null;
      expect(component.getUserInitials()).toBe('');
    });

    it('should filter out empty strings from split result', () => {
      component.api.authSE.localStorageUser = { user_name: '  John   Doe  ' };
      expect(component.getUserInitials()).toBe('JD');
    });
  });

  describe('isInNotificationsRoute', () => {
    it('should return true when URL includes results-notifications', () => {
      jest.spyOn(component.router, 'url', 'get').mockReturnValue('/result/results-outlet/results-notifications/requests');
      expect(component.isInNotificationsRoute()).toBe(true);
    });

    it('should return false when URL does not include results-notifications', () => {
      jest.spyOn(component.router, 'url', 'get').mockReturnValue('/result/results-outlet/results-list');
      expect(component.isInNotificationsRoute()).toBe(false);
    });
  });

  describe('loadReportingAccessStatus', () => {
    it('should return early when phaseId is falsy', () => {
      component.api.dataControlSE.reportingCurrentPhase = { phaseId: null };
      const spy = jest.spyOn(component.api.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(of({ response: { science_programs: [] } }));
      (component as any).loadReportingAccessStatus();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should populate closedInitiativeCodes from non-reporting programs', () => {
      component.api.dataControlSE.reportingCurrentPhase = { phaseId: 5 };
      jest.spyOn(component.api.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(of({
        response: {
          science_programs: [
            { official_code: 'SP-01', reporting_enabled: false },
            { official_code: 'SP-02', reporting_enabled: true },
            { official_code: 'SP-03', reporting_enabled: false }
          ]
        }
      }));

      (component as any).loadReportingAccessStatus();

      expect(component.closedInitiativeCodes.has('SP-01')).toBe(true);
      expect(component.closedInitiativeCodes.has('SP-02')).toBe(false);
      expect(component.closedInitiativeCodes.has('SP-03')).toBe(true);
    });
  });

  describe('isInitiativeClosed', () => {
    it('should return true when code is in closedInitiativeCodes', () => {
      component.closedInitiativeCodes.add('SP-01');
      expect(component.isInitiativeClosed('SP-01')).toBe(true);
    });

    it('should return false when code is NOT in closedInitiativeCodes', () => {
      expect(component.isInitiativeClosed('SP-99')).toBe(false);
    });
  });

  describe('getInitiativeSeparatedByPortfolio', () => {
    it('should filter initiatives by portfolio_id === 3', () => {
      component.api.dataControlSE.myInitiativesList = [
        { portfolio_id: 3, name: 'A' },
        { portfolio_id: 1, name: 'B' },
        { portfolio_id: 3, name: 'C' }
      ] as any;
      const result = component.getInitiativeSeparatedByPortfolio();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('C');
    });
  });
});
