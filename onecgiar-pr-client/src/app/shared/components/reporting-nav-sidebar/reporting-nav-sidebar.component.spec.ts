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
      rolesSE: { roles: null as any, getMyCenters: jest.fn().mockReturnValue([{ center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Member' }]) },
      dataControlSE: { myInitiativesList: [] as any[] }
    };

    fontScaleMock = { set: jest.fn(), scale: signal('default') };
    notificationsMock = { updatesPopUpData: [] as any[] };
    sidebarMock = { state: signal('expanded'), isMobile: signal(false) };

    // Pinned programmes persist in localStorage, so one test's pins would otherwise seed the next.
    localStorage.clear();
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

  it('exposes Platform without RFR/Emerging; SP cards own reporting entry', async () => {
    await build();
    const paths = component.sections().map(s => s.path);
    expect(paths).not.toContain('result-framework-reporting');
    expect(paths).not.toContain('emerging');
    // Reference order: Results Center · Innovation Packages · Quality Assurance · Bilateral · My Admin.
    // Bilateral used to be absent because its route carried `prHide: true` (GAP-ANALYSIS §1 S1).
    const result = paths.indexOf('result');
    const qa = paths.indexOf('quality-assurance');
    const bilateral = paths.indexOf('bilateral');
    const myAdmin = paths.indexOf('init-admin-module');
    expect(bilateral).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(bilateral);
    expect(qa).toBeLessThan(bilateral);
    if (myAdmin >= 0) expect(bilateral).toBeLessThan(myAdmin);
    expect(component.rfrPlannedPath).toBe(PLANNED);
    expect(component.programGroups().find(g => g.key === 'other')?.label).toBe('Other science programs');
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

    it('programLink addresses a programme by CODE, matching the path prtest uses', async () => {
      await build();
      expect(component.programLink({ initiativeCode: 'SP01' } as any)).toEqual([
        '/result-framework-reporting/entity-details',
        'SP01'
      ]);
    });

    it('reads the open programme CODE from the entity-details path segment', async () => {
      await build();
      expect(component.activeSpCode()).toBeNull();

      navigateTo('/result-framework-reporting/entity-details/SP06');
      expect(component.activeSpCode()).toBe('SP06');

      navigateTo('/result-framework-reporting/entity-details/SP06/aow/all');
      expect(component.activeSpCode()).toBe('SP06');
    });

    it('still resolves a CODE from a legacy ?sp=<id> link so old saved URLs stay highlighted', async () => {
      homeMock.mySPsList.set([{ initiativeId: 12, initiativeCode: 'SP12' }]);
      await build();
      routerMock.parseUrl.mockReturnValue({ queryParams: { sp: '12' } });
      navigateTo(`${PLANNED}?sp=12`);
      expect(component.activeSpCode()).toBe('SP12');
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

    // The result sections moved to `app-result-sections-sidebar`, so this row has no special
    // in-result branch any more: it is a plain link to the results table everywhere.
    it('the Results Center row points at the results table in and out of a result', async () => {
      await build();
      const section = component.sections().find(s => s.path === 'result')!;
      expect(component.sectionRootLink(section)).toBe('/result');

      navigateTo('/result/result-detail/1234/general-information');
      expect(component.sectionRootLink(section)).toBe('/result');
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

    it('railPrograms exposes the user\'s own programmes and nothing unpinned', async () => {
      homeMock.mySPsList.set([{ initiativeId: 1, initiativeCode: 'SP01' }]);
      homeMock.otherSPsList.set([{ initiativeId: 2, initiativeCode: 'SP99' }]);
      await build();
      // Projects and unpinned "other" programmes stay off the rail — listing them all would push
      // the user's own off-screen.
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

  // ---------------------------------------------------- footer / rail chrome
  // The user (account) menu is NOT part of this component any more — it lives only in the
  // topbar (PROGRAM-SHELL-SPEC.md §2). Its getters and their specs moved to
  // shell-topbar.component.spec.ts; what stays here is the centres / notifications /
  // text-size chrome the sidebar still owns.
  // ------------------------------------------------------------- pinned programmes
  describe('pinned programmes (favourites)', () => {
    const KEY = 'pr-sidebar-pinned-programs';
    const sp = (id: number, code: string) => ({ initiativeId: id, initiativeCode: code, initiativeName: code });
    /** A click on the star also hits the row's routerLink, so both must be stopped. */
    const clickEvent = () => ({ preventDefault: jest.fn(), stopPropagation: jest.fn() }) as unknown as Event;

    const seedOthers = (...codes: string[]) => homeMock.otherSPsList.set(codes.map((c, i) => sp(100 + i, c)));

    it('starts empty when nothing was ever pinned', async () => {
      await build();
      expect(component.pinnedCodes()).toEqual([]);
      expect(component.canPinMore()).toBe(true);
    });

    it('restores the pinned codes from localStorage, clamped to the cap', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP01', 'SP02', 'SP03', 'SP04', 'SP05', 'SP06']));
      await build();
      expect(component.pinnedCodes()).toEqual(['SP01', 'SP02', 'SP03', 'SP04', 'SP05']);
      expect(component.canPinMore()).toBe(false);
    });

    it('survives a stored value that is not JSON', async () => {
      localStorage.setItem(KEY, '{not json');
      await build();
      expect(component.pinnedCodes()).toEqual([]);
    });

    it('survives a stored value that is not an array', async () => {
      localStorage.setItem(KEY, JSON.stringify({ SP01: true }));
      await build();
      expect(component.pinnedCodes()).toEqual([]);
    });

    it('drops non-string and empty entries from the stored list', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP01', 7, null, '']));
      await build();
      expect(component.pinnedCodes()).toEqual(['SP01']);
    });

    it('pins, persists, and never lets the star navigate the row', async () => {
      seedOthers('SP10');
      await build();

      const event = clickEvent();
      component.togglePin('SP10', event);

      expect(component.pinnedCodes()).toEqual(['SP10']);
      expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual(['SP10']);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('unpins an already pinned programme and clears its warning', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP10']));
      await build();
      component.pinLimitWarningCode.set('SP10');

      component.togglePin('SP10', clickEvent());

      expect(component.pinnedCodes()).toEqual([]);
      expect(component.pinLimitWarningCode()).toBeNull();
      expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual([]);
    });

    it('ignores a missing code', async () => {
      await build();
      component.togglePin(null, clickEvent());
      component.togglePin(undefined, clickEvent());
      expect(component.pinnedCodes()).toEqual([]);
    });

    it('refuses the 6th pin and raises the "up to 5" tooltip on that row', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP01', 'SP02', 'SP03', 'SP04', 'SP05']));
      await build();

      component.togglePin('SP06', clickEvent());

      expect(component.pinnedCodes()).toHaveLength(5);
      expect(component.pinnedCodes()).not.toContain('SP06');
      expect(component.pinLimitWarningCode()).toBe('SP06');
    });

    it('warns on hover only while the cap is reached, and clears on leave', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP01', 'SP02', 'SP03', 'SP04']));
      await build();

      // Room left → no tooltip.
      component.onOtherRowEnter('SP09');
      expect(component.pinLimitWarningCode()).toBeNull();

      component.togglePin('SP05', clickEvent()); // now full
      component.onOtherRowEnter('SP09');
      expect(component.pinLimitWarningCode()).toBe('SP09');

      // An already pinned row is not "blocked", so it must not warn.
      component.onOtherRowLeave('SP09');
      component.onOtherRowEnter('SP05');
      expect(component.pinLimitWarningCode()).toBeNull();

      // Leaving a different row must not clear someone else's tooltip.
      component.onOtherRowEnter('SP09');
      component.onOtherRowLeave('SP08');
      expect(component.pinLimitWarningCode()).toBe('SP09');
      component.onOtherRowLeave('SP09');
      expect(component.pinLimitWarningCode()).toBeNull();
    });

    it('pinnedPrograms keeps the PIN order and drops codes that no longer resolve', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP30', 'SP10', 'SP-GONE']));
      seedOthers('SP10', 'SP20', 'SP30');
      await build();

      expect(component.pinnedPrograms().map((p: any) => p.initiativeCode)).toEqual(['SP30', 'SP10']);
      expect(component.isPinned('SP30')).toBe(true);
      expect(component.isPinned('SP20')).toBe(false);
      expect(component.isPinned(null)).toBe(false);
    });

    it('otherProgramsRest excludes whatever the pinned block already shows', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP20']));
      seedOthers('SP10', 'SP20', 'SP30');
      await build();
      expect(component.otherProgramsRest().map((p: any) => p.initiativeCode)).toEqual(['SP10', 'SP30']);
    });

    it('carries the pinned favourites onto the collapsed rail, deduped against "my" programmes', async () => {
      localStorage.setItem(KEY, JSON.stringify(['SP20', 'SP01']));
      homeMock.mySPsList.set([sp(1, 'SP01')]);
      // SP01 is both a member programme and (stale) pinned — it must appear once.
      homeMock.otherSPsList.set([sp(2, 'SP20'), sp(1, 'SP01')]);
      await build();

      expect(component.railPrograms().map((p: any) => p.initiativeCode)).toEqual(['SP01', 'SP20']);
    });

    it('keeps the pins session-only when localStorage refuses to write', async () => {
      seedOthers('SP10');
      await build();
      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => component.togglePin('SP10', clickEvent())).not.toThrow();
      expect(component.pinnedCodes()).toEqual(['SP10']);

      setItem.mockRestore();
    });
  });

  describe('sidebar chrome', () => {
    it('no longer exposes the user-menu members the topbar owns', async () => {
      await build();
      const c = component as unknown as Record<string, unknown>;
      ['userMenuOpen', 'userMenuPositions', 'getUserName', 'getUserInitials', 'getUserEmail', 'getPlatformRole', 'getInitiativeSeparatedByPortfolio', 'logout'].forEach(
        member => expect(c[member]).toBeUndefined()
      );
    });

    it('getMyCenters delegates to the roles service', async () => {
      await build();
      expect(component.getMyCenters()).toEqual([
        { center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Member' }
      ]);
      expect(apiMock.rolesSE.getMyCenters).toHaveBeenCalled();
    });

    it('drops centres that have neither an acronym nor an id, so no link resolves to /bilateral/undefined/home', async () => {
      apiMock.rolesSE.getMyCenters.mockReturnValue([{ center_name: 'Nameless' }, { center_acronym: 'CIP' }]);
      await build();
      expect(component.getMyCenters()).toEqual([{ center_acronym: 'CIP' }]);
    });

    it('centerHomeLink falls back to the centre id when the acronym is missing', async () => {
      await build();
      expect(component.centerHomeLink({ center_acronym: 'CIP' })).toEqual(['/bilateral', 'CIP', 'home']);
      expect(component.centerHomeLink({ center_id: 42 })).toEqual(['/bilateral', '42', 'home']);
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

    it('escape closes every overlay', async () => {
      await build();
      component.fontMenuOpen.set(true);
      component.onEscape();
      expect(component.fontMenuOpen()).toBe(false);
      expect(component.iconFlyout()).toBeNull();
    });
  });
});
