import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { HlmSidebarService } from '@spartan/sidebar';

import { ReportingNavSidebarComponent } from './reporting-nav-sidebar.component';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { ApiService } from '../../services/api/api.service';
import { FontScaleService } from '../../services/font-scale.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { environment } from '../../../../environments/environment';

const PLANNED = '/result-framework-reporting/planned-toc';

describe('ReportingNavSidebarComponent', () => {
  let component: ReportingNavSidebarComponent;
  let fixture: ComponentFixture<ReportingNavSidebarComponent>;

  let events$: Subject<any>;
  let routerMock: any;
  let rolesMock: any;
  let dataControlMock: any;
  let homeMock: any;
  let apiMock: any;
  let fontScaleMock: any;
  let notificationsMock: any;
  let sidebarMock: any;

  /** Emit a NavigationEnd for `url` after pointing the router at it. */
  const navigateTo = (url: string) => {
    routerMock.url = url;
    events$.next(new NavigationEnd(1, url, url));
  };

  const build = async (startUrl = '/result-framework-reporting/home') => {
    routerMock.url = startUrl;
    await TestBed.configureTestingModule({
      imports: [ReportingNavSidebarComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: RolesService, useValue: rolesMock },
        { provide: DataControlService, useValue: dataControlMock },
        { provide: ResultFrameworkReportingHomeService, useValue: homeMock },
        { provide: ApiService, useValue: apiMock },
        { provide: FontScaleService, useValue: fontScaleMock },
        { provide: ResultsNotificationsService, useValue: notificationsMock },
        { provide: HlmSidebarService, useValue: sidebarMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ReportingNavSidebarComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ReportingNavSidebarComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(() => {
    events$ = new Subject<any>();

    routerMock = {
      url: '/result-framework-reporting/home',
      events: events$.asObservable(),
      navigate: jest.fn(),
      parseUrl: jest.fn().mockReturnValue({ queryParams: {} })
    };

    rolesMock = { isAdmin: false, getMyCenters: jest.fn().mockReturnValue([{ code: 'CIAT' }]) };

    dataControlMock = {
      reportingPhaseVersion: signal(0),
      reportingCurrentPhase: { portfolioAcronym: 'P25', phaseName: '2026' },
      myInitiativesList: []
    };

    homeMock = {
      mySPsList: signal<any[]>([]),
      otherSPsList: signal<any[]>([]),
      otherProjectsList: signal<any[]>([]),
      getScienceProgramsProgress: jest.fn()
    };

    apiMock = {
      authSE: { localStorageUser: null as any, logout: jest.fn() },
      rolesSE: { roles: null as any, getMyCenters: jest.fn().mockReturnValue(['CIAT']) },
      dataControlSE: { myInitiativesList: [] as any[] }
    };

    fontScaleMock = { set: jest.fn(), scale: signal('default') };
    notificationsMock = { updatesPopUpData: [] as any[] };
    sidebarMock = { state: signal('expanded'), isMobile: signal(false) };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------- basics
  it('creates and triggers the lazy Science Programs fetch once', async () => {
    await build();
    expect(component).toBeTruthy();
    expect(homeMock.getScienceProgramsProgress).toHaveBeenCalledTimes(1);

    // second call is a no-op thanks to the internal guard
    component.ensureRfrLoaded();
    expect(homeMock.getScienceProgramsProgress).toHaveBeenCalledTimes(1);
  });

  it('does not fetch the programs when a list is already populated', async () => {
    homeMock.otherProjectsList.set([{ initiativeCode: 'SGP-02' }]);
    await build();
    expect(homeMock.getScienceProgramsProgress).not.toHaveBeenCalled();
  });

  it('exposes the four RFR section links split around the programs block', async () => {
    await build();
    expect(component.rfrSectionLinks).toHaveLength(4);
    expect(component.rfrLinksBeforePrograms).toEqual([component.rfrSectionLinks[0]]);
    expect(component.rfrLinksAfterPrograms).toEqual(component.rfrSectionLinks.slice(2));
    expect(component.rfrPlannedPath).toBe(PLANNED);
    expect(component.fontScaleOptions.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------- isCollapsed
  describe('isCollapsed', () => {
    it('is true only when the rail is collapsed on desktop', async () => {
      await build();
      expect(component.isCollapsed()).toBe(false);

      sidebarMock.state.set('collapsed');
      expect(component.isCollapsed()).toBe(true);

      sidebarMock.isMobile.set(true);
      expect(component.isCollapsed()).toBe(false);
    });
  });

  // -------------------------------------------------------- reportingPhaseLabel
  describe('reportingPhaseLabel', () => {
    it('joins the portfolio acronym and the phase name', async () => {
      await build();
      expect(component.reportingPhaseLabel()).toBe('P25 - 2026');
    });

    it('is empty when the phase is not loaded yet', async () => {
      dataControlMock.reportingCurrentPhase = null;
      await build();
      expect(component.reportingPhaseLabel()).toBe('');
    });

    it('is empty when the phase is missing its name', async () => {
      dataControlMock.reportingCurrentPhase = { portfolioAcronym: 'P25' };
      await build();
      expect(component.reportingPhaseLabel()).toBe('');
    });
  });

  // -------------------------------------------------------------------- sections
  describe('sections + admin gating', () => {
    it('hides the admin module for a non-admin', async () => {
      await build();
      expect(component.sections().some(s => s.path === 'admin-module')).toBe(false);
    });

    it('appends the admin module for an admin', async () => {
      rolesMock.isAdmin = true;
      await build();
      expect(component.sections().some(s => s.path === 'admin-module')).toBe(true);
    });

    it('validateAdminModuleAndRole lets an admin through', async () => {
      rolesMock.isAdmin = true;
      await build();
      expect(component.validateAdminModuleAndRole({ path: 'init-admin-module' } as any)).toBe(false);
    });

    it('validateAdminModuleAndRole hides My Admin for a plain user', async () => {
      await build();
      dataControlMock.myInitiativesList = [{ role: 'Contributor' }];
      expect(component.validateAdminModuleAndRole({ path: 'init-admin-module' } as any)).toBe(true);
    });

    it('validateAdminModuleAndRole keeps My Admin for a Lead / Coordinator', async () => {
      await build();
      dataControlMock.myInitiativesList = [{ role: 'Lead' }];
      expect(component.validateAdminModuleAndRole({ path: 'init-admin-module' } as any)).toBe(false);
      dataControlMock.myInitiativesList = [{ role: 'Coordinator' }];
      expect(component.validateCoordAndLead()).toBe(false);
    });

    it('validateAdminModuleAndRole returns false for any other section', async () => {
      await build();
      expect(component.validateAdminModuleAndRole({ path: 'result' } as any)).toBe(false);
      expect(component.validateAdminModuleAndRole(undefined as any)).toBe(false);
    });

    it('hides test-only sections in production', async () => {
      await build();
      const original = environment.production;
      (environment as any).production = true;
      expect(component.validateAdminModuleAndRole({ path: 'result', onlyTest: true } as any)).toBe(true);
      (environment as any).production = original;
    });

    it('validateCoordAndLead defaults to hidden when there are no initiatives', async () => {
      await build();
      dataControlMock.myInitiativesList = null;
      expect(component.validateCoordAndLead()).toBe(true);
    });
  });

  // -------------------------------------------------------------------- iconFor
  describe('iconFor', () => {
    it('maps a known section path to its lucide icon', async () => {
      await build();
      expect(component.iconFor({ path: 'result' } as any)).toBe('lucideFileText');
    });

    it('falls back to a dot for an unknown or missing path', async () => {
      await build();
      expect(component.iconFor({ path: 'nope' } as any)).toBe('lucideCircleDot');
      expect(component.iconFor({} as any)).toBe('lucideCircleDot');
    });
  });

  // ------------------------------------------------------------ router reactions
  describe('router reactions', () => {
    it('marks Planned active on its own URL and inactive elsewhere', async () => {
      await build();
      expect(component.isPlannedActive()).toBe(false);

      navigateTo(`${PLANNED}?sp=3`);
      expect(component.isPlannedActive()).toBe(true);

      navigateTo('/result-framework-reporting/home');
      expect(component.isPlannedActive()).toBe(false);
    });

    it('starts with Planned active when the entry URL is Planned', async () => {
      await build(PLANNED);
      expect(component.isPlannedActive()).toBe(true);
    });

    it('stays active on the Overview tab — the same program shell, not a different surface', async () => {
      await build();

      navigateTo('/result-framework-reporting/overview?sp=3');
      expect(component.isPlannedActive()).toBe(true);
    });

    it('expands My Admin and the Admin module on their own URLs', async () => {
      await build();
      expect(component.myAdminExpanded()).toBe(false);
      expect(component.adminModuleExpanded()).toBe(false);

      navigateTo('/init-admin-module/init-general-results-report');
      expect(component.myAdminExpanded()).toBe(true);

      navigateTo('/admin-module/tickets-dashboard');
      expect(component.adminModuleExpanded()).toBe(true);
    });

    it('reads the selected Science Program from the ?sp= query param', async () => {
      await build();
      expect(component.activeSpId()).toBeNull();
      expect(component.rfrSectionQueryParams()).toEqual({});

      routerMock.parseUrl.mockReturnValue({ queryParams: { sp: '12' } });
      navigateTo(`${PLANNED}?sp=12`);
      expect(component.activeSpId()).toBe(12);
      expect(component.rfrSectionQueryParams()).toEqual({ sp: 12 });
    });

    it('ignores a non numeric ?sp= value', async () => {
      await build();
      routerMock.parseUrl.mockReturnValue({ queryParams: { sp: 'abc' } });
      navigateTo(`${PLANNED}?sp=abc`);
      expect(component.activeSpId()).toBeNull();
    });
  });

  // ------------------------------------------------------------------- toggles
  describe('collapsible toggles', () => {
    it('toggleMyAdmin / toggleAdminModule flip when expanded and no-op when collapsed', async () => {
      await build();
      component.toggleMyAdmin();
      expect(component.myAdminExpanded()).toBe(true);
      component.toggleAdminModule();
      expect(component.adminModuleExpanded()).toBe(true);

      sidebarMock.state.set('collapsed');
      component.toggleMyAdmin();
      component.toggleAdminModule();
      expect(component.myAdminExpanded()).toBe(true);
      expect(component.adminModuleExpanded()).toBe(true);
    });

    it('toggleGroup adds and removes a program group', async () => {
      await build();
      expect(component.isGroupOpen('mine')).toBe(true);
      expect(component.isGroupOpen('other')).toBe(false);

      component.toggleGroup('other');
      expect(component.isGroupOpen('other')).toBe(true);

      component.toggleGroup('other');
      expect(component.isGroupOpen('other')).toBe(false);
    });
  });

  // ------------------------------------------------------------- active helpers
  describe('active state helpers', () => {
    it('isRfrSectionActive ignores the query string', async () => {
      await build(`${PLANNED}?sp=4`);
      expect(component.isRfrSectionActive(PLANNED)).toBe(true);
      expect(component.isRfrSectionActive('/result-framework-reporting/home')).toBe(false);
    });

    it('isSubLinkActive matches by prefix', async () => {
      await build('/admin-module/tickets-dashboard');
      expect(component.isSubLinkActive('/admin-module')).toBe(true);
      expect(component.isSubLinkActive('/init-admin-module')).toBe(false);
    });
  });

  // ----------------------------------------------------------------- flyout API
  describe('icon flyout', () => {
    const eventFor = (el: HTMLElement | null) => ({ currentTarget: el }) as unknown as Event;

    it('does nothing while the sidebar is expanded', async () => {
      await build();
      component.openIconFlyout('rfr', eventFor(document.createElement('div')));
      expect(component.iconFlyout()).toBeNull();
    });

    it('does nothing when the event has no target element', async () => {
      await build();
      sidebarMock.state.set('collapsed');
      component.openIconFlyout('my-admin', eventFor(null));
      expect(component.iconFlyout()).toBeNull();
    });

    it('positions the flyout next to the rail button', async () => {
      await build();
      sidebarMock.state.set('collapsed');
      const el = document.createElement('div');
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 2, right: 40 } as DOMRect);

      component.openIconFlyout('my-admin', eventFor(el));
      expect(component.iconFlyout()).toEqual({ key: 'my-admin', top: 8, left: 48 });
    });

    it('clamps the top position and triggers the RFR fetch for the rfr key', async () => {
      homeMock.mySPsList.set([{ initiativeCode: 'SP1' }]);
      await build();
      sidebarMock.state.set('collapsed');
      const el = document.createElement('div');
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 120, right: 40 } as DOMRect);

      component.openIconFlyout('rfr', eventFor(el));
      expect(component.iconFlyout()).toEqual({ key: 'rfr', top: 120, left: 48 });
    });

    it('schedules the close, and reopening cancels the pending timer', async () => {
      jest.useFakeTimers();
      await build();
      sidebarMock.state.set('collapsed');
      const el = document.createElement('div');
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 30, right: 10 } as DOMRect);

      component.openIconFlyout('admin-module', eventFor(el));
      component.scheduleCloseIconFlyout();
      // a second schedule replaces the previous timer
      component.scheduleCloseIconFlyout();
      component.openIconFlyout('admin-module', eventFor(el));
      jest.advanceTimersByTime(500);
      expect(component.iconFlyout()).not.toBeNull();

      component.scheduleCloseIconFlyout();
      jest.advanceTimersByTime(200);
      expect(component.iconFlyout()).toBeNull();
    });

    it('keepIconFlyout cancels a pending close (and is safe with no timer)', async () => {
      jest.useFakeTimers();
      await build();
      component.keepIconFlyout();

      sidebarMock.state.set('collapsed');
      const el = document.createElement('div');
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 30, right: 10 } as DOMRect);
      component.openIconFlyout('rfr', eventFor(el));
      component.scheduleCloseIconFlyout();
      component.keepIconFlyout();
      jest.advanceTimersByTime(500);
      expect(component.iconFlyout()).not.toBeNull();
    });

    it('closeIconFlyout clears both the timer and the panel', async () => {
      jest.useFakeTimers();
      await build();
      component.closeIconFlyout();
      expect(component.iconFlyout()).toBeNull();

      sidebarMock.state.set('collapsed');
      const el = document.createElement('div');
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 30, right: 10 } as DOMRect);
      component.openIconFlyout('rfr', eventFor(el));
      component.scheduleCloseIconFlyout();
      component.closeIconFlyout();
      expect(component.iconFlyout()).toBeNull();
    });
  });

  // --------------------------------------------------------------- program tree
  describe('program tree helpers', () => {
    it('programGroups mirrors the three home service lists', async () => {
      homeMock.mySPsList.set([{ initiativeCode: 'SP1' }]);
      homeMock.otherSPsList.set([{ initiativeCode: 'SP2' }]);
      homeMock.otherProjectsList.set([{ initiativeCode: 'SGP-02' }]);
      await build();

      const groups = component.programGroups();
      expect(groups.map(g => g.key)).toEqual(['mine', 'other', 'projects']);
      expect(groups[0].items).toHaveLength(1);
    });

    it('iconSrc builds the program icon path', async () => {
      await build();
      expect(component.iconSrc({ initiativeCode: 'SP03' } as any)).toBe('/assets/result-framework-reporting/SPs-Icons/SP03.png');
    });

    // `count()` was removed with the programme-count badge: the reference's programme cards do
    // not carry a result count. Its three tests went with it — a passing test for unreachable
    // code is worse than no test, it reads as coverage.

    it('railPrograms exposes only the user\'s own programmes', async () => {
      homeMock.mySPsList.set([{ initiativeId: 1, initiativeCode: 'SP01' }]);
      homeMock.otherSPsList.set([{ initiativeId: 2, initiativeCode: 'SP99' }]);
      await build();
      // The collapsed rail has no room for "other programmes" — listing them there would push the
      // user's own off-screen, and the reference uses a dashed "+" affordance for the rest.
      expect(component.railPrograms().map((sp: any) => sp.initiativeCode)).toEqual(['SP01']);
    });

    it('railPrograms tolerates the list being absent', async () => {
      homeMock.mySPsList.set(undefined as any);
      await build();
      expect(component.railPrograms()).toEqual([]);
    });

    it('every programme dot clears 3:1 against the dark sidebar surface', async () => {
      await build();
      // These dots are the ONLY thing distinguishing programmes on the collapsed rail, so an
      // invisible one is a real failure. Two candidates were dropped for measuring below the floor.
      const palette = ['SP01', 'SP02', 'SP03', 'SP04', 'SP05', 'SP06', 'SP07', 'SP08'].map(c => component.programDotColor(c));
      expect(new Set(palette).size).toBe(8);
      palette.forEach(v => expect(v).toMatch(/^var\(--pr-/));
      // The primary itself (#6b46e5, 2.6072 on #271862) must not be in the palette.
      expect(palette).not.toContain('var(--pr-chart-2)');
      expect(palette).not.toContain('var(--pr-color-red-300)');
    });

    it('programDotColor is deterministic and derives from the numeric part of the code', async () => {
      await build();
      // Same code always yields the same swatch — no persistence, no request.
      expect(component.programDotColor('SP01')).toBe(component.programDotColor('SP01'));
      // Sequential codes land on different swatches (a character hash collided: SP01/SP12).
      const codes = ['SP01', 'SP06', 'SP10', 'SP12'];
      expect(new Set(codes.map(c => component.programDotColor(c))).size).toBe(codes.length);
      // Every result is a token reference, never a literal.
      codes.forEach(c => expect(component.programDotColor(c)).toMatch(/^var\(--pr-/));
    });

    it('programDotColor tolerates a missing, empty or non-numeric code', async () => {
      await build();
      // Centre IDs are passed through the same helper and are not always numeric.
      [null, undefined, '', 'CIAT', 'SP', '999999999999'].forEach(c => {
        expect(component.programDotColor(c as any)).toMatch(/^var\(--pr-/);
      });
    });
  });

  // ------------------------------------------------------------------ user menu
  describe('user chrome', () => {
    it('getUserInitials prefers the stored acronym', async () => {
      apiMock.authSE.localStorageUser = { user_acronym: 'YZ', user_name: 'Yecksin Zuniga' };
      await build();
      expect(component.getUserInitials()).toBe('YZ');
    });

    it('getUserInitials derives them from the full name', async () => {
      apiMock.authSE.localStorageUser = { user_name: 'yecksin mauricio zuniga' };
      await build();
      expect(component.getUserInitials()).toBe('YM');
    });

    it('getUserInitials falls back to the email local part', async () => {
      apiMock.authSE.localStorageUser = { user_name: '', email: 'yecksin.zuniga@cgiar.org' };
      await build();
      expect(component.getUserInitials()).toBe('YZ');
    });

    it('getUserInitials returns an empty string when there is no user', async () => {
      await build();
      expect(component.getUserInitials()).toBe('');
      expect(component.getUserName()).toBe('');
      expect(component.getUserEmail()).toBe('');
    });

    it('exposes the user name / email when present', async () => {
      apiMock.authSE.localStorageUser = { user_name: 'Yecksin', email: 'y@cgiar.org', user_acronym: 'Y' };
      await build();
      expect(component.getUserName()).toBe('Yecksin');
      expect(component.getUserEmail()).toBe('y@cgiar.org');
    });

    it('getPlatformRole falls back to Guest', async () => {
      await build();
      expect(component.getPlatformRole()).toBe('Guest');

      apiMock.rolesSE.roles = { application: { description: 'Admin' } };
      expect(component.getPlatformRole()).toBe('Admin');
    });

    it('getInitiativeSeparatedByPortfolio only keeps portfolio 3', async () => {
      apiMock.dataControlSE.myInitiativesList = [{ portfolio_id: 3 }, { portfolio_id: 2 }];
      await build();
      expect(component.getInitiativeSeparatedByPortfolio()).toHaveLength(1);
    });

    it('getMyCenters delegates to the roles service', async () => {
      await build();
      expect(component.getMyCenters()).toEqual(['CIAT']);
      expect(apiMock.rolesSE.getMyCenters).toHaveBeenCalled();
    });

    it('notificationBadgeCount counts the pending updates and tolerates no service data', async () => {
      notificationsMock.updatesPopUpData = [{ id: 1 }, { id: 2 }];
      await build();
      expect(component.notificationBadgeCount()).toBe(2);

      notificationsMock.updatesPopUpData = undefined;
      expect(component.notificationBadgeCount()).toBe(0);
    });

    it('goToNotifications navigates to the requests tab', async () => {
      await build();
      component.goToNotifications();
      expect(routerMock.navigate).toHaveBeenCalledWith(['result/results-outlet/results-notifications/requests']);
    });

    it('selectFontScale delegates to the font scale service', async () => {
      await build();
      component.selectFontScale('large');
      expect(fontScaleMock.set).toHaveBeenCalledWith('large');
    });

    it('logout closes the menu and delegates to auth', async () => {
      await build();
      component.userMenuOpen.set(true);
      component.logout();
      expect(component.userMenuOpen()).toBe(false);
      expect(apiMock.authSE.logout).toHaveBeenCalled();
    });

    it('escape closes every overlay', async () => {
      await build();
      component.userMenuOpen.set(true);
      component.fontMenuOpen.set(true);
      component.onEscape();
      expect(component.userMenuOpen()).toBe(false);
      expect(component.fontMenuOpen()).toBe(false);
      expect(component.iconFlyout()).toBeNull();
    });
  });
});
