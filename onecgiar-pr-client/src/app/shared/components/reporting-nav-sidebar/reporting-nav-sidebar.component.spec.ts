import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HlmSidebarService } from '@spartan/sidebar';

import { ReportingNavSidebarComponent } from './reporting-nav-sidebar.component';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { ApiService } from '../../services/api/api.service';
import { CentersService } from '../../services/global/centers.service';
import { CenterDto } from '../../interfaces/center.dto';
import { FontScaleService } from '../../services/font-scale.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { environment } from '../../../../environments/environment';
import { CLARISA_GLOSSARY_URL } from '../../constants/clarisa-links.constants';
import { ReportingGuideService } from '../../../pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service';

const PLANNED = '/result-framework-reporting/planned-toc';

/** CLARISA catalogue row builder — ASC-T-1 (`CenterDto` has no role field, `P-8`). */
const catalogueCenter = (acronym: string, overrides: Partial<CenterDto> = {}): CenterDto => ({
  code: acronym,
  financial_code: '',
  institutionId: 0,
  name: acronym,
  acronym,
  lead_center: '',
  full_name: acronym,
  ...overrides
});

describe('ReportingNavSidebarComponent', () => {
  let component: ReportingNavSidebarComponent;
  let fixture: ComponentFixture<ReportingNavSidebarComponent>;

  let events$: Subject<any>;
  let routerMock: any;
  let rolesMock: any;
  let dataControlMock: any;
  let homeMock: any;
  let apiMock: any;
  let centersMock: { centers: ReturnType<typeof signal<CenterDto[]>> };
  let fontScaleMock: any;
  let notificationsMock: any;
  let sidebarMock: any;
  let reportingGuideMock: { startSidebarTour: jest.Mock };

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
        { provide: CentersService, useValue: centersMock },
        { provide: FontScaleService, useValue: fontScaleMock },
        { provide: ResultsNotificationsService, useValue: notificationsMock },
        { provide: HlmSidebarService, useValue: sidebarMock },
        { provide: ReportingGuideService, useValue: reportingGuideMock }
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

    // Populated by default (not just for admin fixtures): the non-admin case MUST run against a
    // populated catalogue, or dropping the `isAdmin` guard (falsifier mutation (b)) reads the same
    // as correct code and the ASC-AC-3 gate asserts nothing.
    centersMock = { centers: signal<CenterDto[]>([catalogueCenter('IITA'), catalogueCenter('CIP')]) };

    fontScaleMock = { set: jest.fn(), scale: signal('default') };
    notificationsMock = { updatesPopUpData: [] as any[] };
    sidebarMock = { state: signal('expanded'), isMobile: signal(false), setOpen: jest.fn() };
    reportingGuideMock = { startSidebarTour: jest.fn() };

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
    // Reference order: Results Center · Innovation Packages · Quality Assurance · My Admin.
    // Bilateral is NOT a Platform row: the row would target a bare `/bilateral`, which has no page
    // (the module only routes `/bilateral/:acronym/...`) and bounced the user to their first
    // Science Program. Centres are entered from the MY CGIAR CENTERS cards instead.
    const result = paths.indexOf('result');
    const qa = paths.indexOf('quality-assurance');
    const myAdmin = paths.indexOf('init-admin-module');
    expect(paths).not.toContain('bilateral');
    expect(result).toBeLessThan(qa);
    if (myAdmin >= 0) expect(qa).toBeLessThan(myAdmin);
    expect(component.rfrPlannedPath).toBe(PLANNED);
    expect(component.programGroups().find(g => g.key === 'other')?.label).toBe('Other science programs');
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

    it('auto-expands other science programs by default when user has no science programs of their own', async () => {
      homeMock.mySPsList.set([]);
      homeMock.otherSPsList.set([{ initiativeId: 1, initiativeCode: 'SP01', initiativeName: 'Breeding' }]);
      await build();
      fixture.detectChanges();
      expect(component.isGroupOpen('mine')).toBe(true);
      expect(component.isGroupOpen('other')).toBe(true);
    });

    it('keeps other science programs collapsed by default when user has their own science programs', async () => {
      homeMock.mySPsList.set([{ initiativeId: 1, initiativeCode: 'SP01', initiativeName: 'Breeding' }]);
      homeMock.otherSPsList.set([{ initiativeId: 2, initiativeCode: 'SP02', initiativeName: 'Climate' }]);
      await build();
      fixture.detectChanges();
      expect(component.isGroupOpen('mine')).toBe(true);
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
  // The user (account) menu is NOT part of this component any more — the account chip belongs to
  // the topbar and only to the topbar. Its getters and their specs moved to
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

    // ASC-T-1: for a non-admin the wrapper still delegates verbatim (ASC-R-2, ASC-AC-3) — the
    // catalogue (populated by default in `centersMock`, see beforeEach) must be ignored entirely.
    it('getMyCenters delegates to the roles service for a non-admin, ignoring a populated catalogue (ASC-AC-3)', async () => {
      rolesMock.isAdmin = false;
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

    // ------------------------------------------------------------------------- ASC-T-1
    // Admin union: assignments ∪ catalogue, deduped on acronym (assignment wins), assignments
    // first, tagged by provenance. See `docs/specs/changes/admin-sees-all-centers/`.
    describe('admin centre union (ASC-T-1)', () => {
      it('ASC-AC-1 / D5: an admin with ZERO assignments gets the whole catalogue, not an empty block', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([]); // empty roles.center — the D5 trap
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA'), catalogueCenter('CIP')]);
        await build();

        const result = component.getMyCenters();
        expect(result).toHaveLength(3);
        expect(result.map((c: any) => c.center_acronym)).toEqual(['CIAT', 'IITA', 'CIP']);
        expect(result.every((c: any) => c.isAssigned === false)).toBe(true);
      });

      it('ASC-AC-2 / ASC-R-10 / D6: an assigned centre also present in the catalogue appears once, assigned, and sorts first', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([
          { center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' }
        ]);
        // The falsifier fixture: CIAT is in BOTH sources, or dedup mutation (a) is inert.
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA'), catalogueCenter('CIP')]);
        await build();

        const result = component.getMyCenters();
        expect(result).toHaveLength(3);
        expect(result.filter((c: any) => c.center_acronym === 'CIAT')).toHaveLength(1);
        expect(result[0]).toEqual({
          center_id: 'CIAT',
          center_name: 'CIAT',
          center_acronym: 'CIAT',
          role_name: 'Center User',
          isAssigned: true
        });
        expect(result.map((c: any) => c.center_acronym)).toEqual(['CIAT', 'IITA', 'CIP']);
      });

      it('ASC-AC-5 / D8-adjacent: an admin with a failed (empty) catalogue still sees their assignments, not an empty block', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([
          { center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' },
          { center_id: 'IITA', center_name: 'IITA', center_acronym: 'IITA', role_name: 'Center User' }
        ]);
        centersMock.centers.set([]); // catalogue fetch failed / empty
        await build();

        const result = component.getMyCenters();
        expect(result).toHaveLength(2);
        expect(result.map((c: any) => c.center_acronym)).toEqual(['CIAT', 'IITA']);
      });

      it('ASC-AC-6 / D7: catalogue landing AFTER first render grows the list — no computed(), no stale cache', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([]);
        centersMock.centers.set([]); // cold: nothing resolved yet at first render
        await build();

        expect(component.getMyCenters()).toHaveLength(0);

        // The catalogue resolves later — set AFTER first render/first read (D7's trap).
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA')]);
        expect(component.getMyCenters()).toHaveLength(2);
      });

      it('ASC-AC-8: does not mutate what RolesService.getMyCenters() returns while composing the admin union', async () => {
        rolesMock.isAdmin = true;
        const originalAssignment = { center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' };
        apiMock.rolesSE.getMyCenters.mockReturnValue([originalAssignment]);
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA')]);
        await build();

        component.getMyCenters();

        expect(apiMock.rolesSE.getMyCenters()).toEqual([originalAssignment]);
        expect(originalAssignment).toEqual({ center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' });
        expect((originalAssignment as any).isAssigned).toBeUndefined();
      });

      it('ASC-AC-9 / D4: a catalogue row with neither acronym nor code is omitted', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([]);
        centersMock.centers.set([catalogueCenter('IITA'), { ...catalogueCenter('CIP'), acronym: undefined as any, code: undefined as any }]);
        await build();

        const result = component.getMyCenters();
        expect(result).toHaveLength(1);
        expect(result[0].center_acronym).toBe('IITA');
      });
    });

    it('centerHomeLink falls back to the centre id when the acronym is missing', async () => {
      await build();
      expect(component.centerHomeLink({ center_acronym: 'CIP' })).toEqual(['/bilateral', 'CIP', 'home']);
      expect(component.centerHomeLink({ center_id: 42 })).toEqual(['/bilateral', '42', 'home']);
    });

    it('escape closes every overlay', async () => {
      await build();
      component.onEscape();
      expect(component.iconFlyout()).toBeNull();
    });
  });

  // ------------------------------------------------------------------------ ASC-T-2
  // Rendered (not parsed-text) checks for the "mine" marker and the tooltip. Every OTHER test in
  // this file overrides the template to `''` (see the block comment above the sidebar-toggle
  // describe below) because the real template trips `NG0311` from `hlmSidebarMenuButton`'s tooltip
  // host directive the instant it renders — but that directive lives only in the Platform/Extras
  // sections. This block extracts JUST the centres loop, verbatim, from the real `.html` file
  // (never hand-typed) via `extractTemplateBlock`, and compiles THAT as the component's template —
  // the real-artifact lock the ASC-T-2 disqualifier demands, without tripping the unrelated bug.
  describe('rendered centre markers (ASC-T-2)', () => {
    /** Extracts one balanced `@if (...) { ... }` block starting at `startMarker`, straight from the
     *  real template text — brace-counting skips `{{ }}` interpolations so they don't unbalance it. */
    const extractTemplateBlock = (html: string, startMarker: string): string => {
      const start = html.indexOf(startMarker);
      if (start === -1) throw new Error(`ASC-T-2 test anchor not found in the real template: ${startMarker}`);
      let depth = 0;
      let i = start;
      for (; i < html.length; i++) {
        if (html[i] === '{' && html[i + 1] === '{') {
          i++;
          continue;
        }
        if (html[i] === '}' && html[i + 1] === '}') {
          i++;
          continue;
        }
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      return html.slice(start, i);
    };

    /** Compiles `templateHtml` as `ReportingNavSidebarComponent`'s template and renders it, with a
     *  REAL `Router` (`provideRouter([])`) so `[routerLink]`/`routerLinkActive` resolve real hrefs —
     *  the hand-rolled `routerMock` used everywhere else has no `createUrlTree`. */
    const buildRendered = async (templateHtml: string) => {
      await TestBed.configureTestingModule({
        imports: [ReportingNavSidebarComponent],
        providers: [
          provideRouter([]),
          { provide: RolesService, useValue: rolesMock },
          { provide: DataControlService, useValue: dataControlMock },
          { provide: ResultFrameworkReportingHomeService, useValue: homeMock },
          { provide: ApiService, useValue: apiMock },
          { provide: CentersService, useValue: centersMock },
          { provide: FontScaleService, useValue: fontScaleMock },
          { provide: ResultsNotificationsService, useValue: notificationsMock },
          { provide: HlmSidebarService, useValue: sidebarMock },
          { provide: ReportingGuideService, useValue: reportingGuideMock }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      })
        .overrideComponent(ReportingNavSidebarComponent, { set: { template: templateHtml } })
        .compileComponents();

      const renderedFixture = TestBed.createComponent(ReportingNavSidebarComponent);
      renderedFixture.detectChanges();
      return renderedFixture;
    };

    const readTemplateHtml = (): string => readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');

    /** The falsifier fixture (tasks.md `ASC-T-2`): admin assigned to CIAT with role `Center User`
     *  (`AUTH-R-2` — the role every assignment carries), catalogue holding CIAT and IITA. The
     *  assigned role MUST be exactly `Center User`, or mutation (b) below passes when it should not. */
    const seedFalsifierFixture = () => {
      rolesMock.isAdmin = true;
      apiMock.rolesSE.getMyCenters.mockReturnValue([{ center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' }]);
      centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA')]);
    };

    it('ASC-AC-2 / ASC-AC-7 (expanded): marks CIAT, not IITA; no `undefined`; hrefs resolve', async () => {
      seedFalsifierFixture();

      const block = extractTemplateBlock(readTemplateHtml(), '@if (!isCollapsed() && getMyCenters().length > 0) {');
      const renderedFixture = await buildRendered(block);

      // ASC-T-6 (ASC-R-17): the block now starts CLOSED for everyone, so a collapsed render would
      // only carry the assigned CIAT — open it to see the full list this case is about.
      (renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement).click();
      renderedFixture.detectChanges();

      const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
      expect(links).toHaveLength(2);

      const ciat = links.find(a => a.textContent?.includes('CIAT'))!;
      const iita = links.find(a => a.textContent?.includes('IITA'))!;
      expect(ciat).toBeTruthy();
      expect(iita).toBeTruthy();

      // ASC-AC-7 / ASC-R-5 / D3 — checked FIRST, and named on IITA specifically (a catalogue row,
      // no role): mutation (a) (the unconditional `' · ' + center.role_name` concat) must be caught
      // HERE, on IITA's own tooltip, not incidentally on a later CIAT assertion (Jest stops at the
      // first failed `expect`, so ordering decides which case's name the red actually reports).
      expect(iita.getAttribute('title')).not.toContain('undefined');
      expect(renderedFixture.nativeElement.textContent).not.toContain('undefined');

      // ASC-AC-2 / ASC-DD-5: the marker comes from provenance (isAssigned), never from role text —
      // CIAT's role is `Center User`, which `shouldShowAssignmentRole` filters, yet CIAT still marks.
      expect(ciat.textContent).toContain(renderedFixture.componentInstance.assignedMarkerLabel);
      expect(iita.textContent).not.toContain(renderedFixture.componentInstance.assignedMarkerLabel);

      // ASC-DD-4: the role suffix is gated by shouldShowAssignmentRole — CIAT's `Center User` is
      // filtered (no suffix), and IITA (a catalogue row) has no role to begin with.
      expect(ciat.getAttribute('title')).toBe('CIAT');
      expect(iita.getAttribute('title')).toBe('IITA');

      // ASC-AC-7 / ASC-R-6: each link resolves to /bilateral/<acronym>/home.
      expect(ciat.getAttribute('href')).toBe('/bilateral/CIAT/home');
      expect(iita.getAttribute('href')).toBe('/bilateral/IITA/home');

      // Marker is not colour-only: an sr-only TEXT node carries it (a11y NFR).
      const srOnly = ciat.querySelector('.sr-only');
      expect(srOnly?.textContent).toBe(renderedFixture.componentInstance.assignedMarkerLabel);
    });

    it('ASC-AC-2 / ASC-AC-7 (collapsed rail): aria-label/title carry the marker and tolerate the absent role', async () => {
      seedFalsifierFixture();

      const block = extractTemplateBlock(readTemplateHtml(), '@if (getMyCenters().length > 0) {');
      const renderedFixture = await buildRendered(block);

      const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
      expect(links).toHaveLength(2);

      const ciat = links.find(a => a.getAttribute('href') === '/bilateral/CIAT/home')!;
      const iita = links.find(a => a.getAttribute('href') === '/bilateral/IITA/home')!;
      expect(ciat).toBeTruthy();
      expect(iita).toBeTruthy();

      // ASC-AC-7 / ASC-R-5 / D3 — checked FIRST and named on IITA (a catalogue row, no role), so
      // mutation (a)'s red is observed here, not on a later CIAT assertion.
      expect(iita.getAttribute('title')).not.toContain('undefined');
      expect(iita.getAttribute('aria-label')).not.toContain('undefined');
      expect(renderedFixture.nativeElement.textContent).not.toContain('undefined');

      // Rail keeps aria-label WITH the centre name (NFR Accessibility) and marks the assigned one.
      expect(ciat.getAttribute('aria-label')).toBe(`CIAT, ${renderedFixture.componentInstance.assignedMarkerLabel}`);
      expect(iita.getAttribute('aria-label')).toBe('IITA');

      expect(ciat.getAttribute('title')).toBe('CIAT');
      expect(iita.getAttribute('title')).toBe('IITA');
    });

    it('ASC-AC-4: a non-admin with zero assignments renders no block at all', async () => {
      // The extraction anchor IS the guard (`@if (!isCollapsed() && getMyCenters().length > 0) {`),
      // so rendering this fragment with an empty `getMyCenters()` proves the guard actually
      // suppresses the block — not just that the wrapper returns an empty array.
      rolesMock.isAdmin = false;
      apiMock.rolesSE.getMyCenters.mockReturnValue([]);
      centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA')]);

      const block = extractTemplateBlock(readTemplateHtml(), '@if (!isCollapsed() && getMyCenters().length > 0) {');
      const renderedFixture = await buildRendered(block);

      expect(renderedFixture.nativeElement.querySelector('[data-guide="platform-tour-sidebar-centers"]')).toBeNull();
      expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(0);
      expect(renderedFixture.nativeElement.textContent.trim()).toBe('');
    });
  });

  // ------------------------------------------------------------------------ ASC-T-4
  // Rendered checks for the collapsible "My CGIAR centers" block. Same real-artifact extraction
  // as ASC-T-2, but with a REAL `Router` that can actually navigate: a `**` catch-all route (the
  // same pattern `bilateral-overview.component.spec.ts` uses) lets `navigateByUrl` resolve, which
  // `provideRouter([])` alone cannot — there is no route to match `/bilateral/CIAT/home` against.
  describe('collapsible centres block (ASC-T-4)', () => {
    const extractTemplateBlock = (html: string, startMarker: string): string => {
      const start = html.indexOf(startMarker);
      if (start === -1) throw new Error(`ASC-T-4 test anchor not found in the real template: ${startMarker}`);
      let depth = 0;
      let i = start;
      for (; i < html.length; i++) {
        if (html[i] === '{' && html[i + 1] === '{') {
          i++;
          continue;
        }
        if (html[i] === '}' && html[i + 1] === '}') {
          i++;
          continue;
        }
        if (html[i] === '{') depth++;
        else if (html[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      return html.slice(start, i);
    };

    const readTemplateHtml = (): string => readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');

    const buildRendered = async (templateHtml: string) => {
      await TestBed.configureTestingModule({
        imports: [ReportingNavSidebarComponent],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          { provide: RolesService, useValue: rolesMock },
          { provide: DataControlService, useValue: dataControlMock },
          { provide: ResultFrameworkReportingHomeService, useValue: homeMock },
          { provide: ApiService, useValue: apiMock },
          { provide: CentersService, useValue: centersMock },
          { provide: FontScaleService, useValue: fontScaleMock },
          { provide: ResultsNotificationsService, useValue: notificationsMock },
          { provide: HlmSidebarService, useValue: sidebarMock },
          { provide: ReportingGuideService, useValue: reportingGuideMock }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      })
        .overrideComponent(ReportingNavSidebarComponent, { set: { template: templateHtml } })
        .compileComponents();

      const renderedFixture = TestBed.createComponent(ReportingNavSidebarComponent);
      renderedFixture.detectChanges();
      return renderedFixture;
    };

    /** Falsifier fixture (tasks.md `ASC-T-4`): admin assigned to CIAT, catalogue CIAT/IITA/CIP. */
    const seedThreeCenters = () => {
      rolesMock.isAdmin = true;
      apiMock.rolesSE.getMyCenters.mockReturnValue([{ center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' }]);
      centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA'), catalogueCenter('CIP')]);
    };

    const wholeBlock = () => extractTemplateBlock(readTemplateHtml(), '@if (!isCollapsed() && getMyCenters().length > 0) {');

    it('ASC-AC-10: the toggle collapses and reopens the list; aria-expanded follows', async () => {
      seedThreeCenters();
      const renderedFixture = await buildRendered(wholeBlock());

      const toggle = renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement;
      // ASC-T-6 (ASC-R-17): closed by default for everyone now — only the assigned CIAT shows,
      // nobody being "inside" a centre on the default route.
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(1);

      toggle.click();
      renderedFixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(3);

      toggle.click();
      renderedFixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(1);
    });

    it('ASC-AC-11: collapsed while inside CIAT shows only CIAT, active and marked', async () => {
      seedThreeCenters();
      const renderedFixture = await buildRendered(wholeBlock());
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/bilateral/CIAT/home');
      renderedFixture.detectChanges();

      // ASC-T-6 (ASC-R-17): already collapsed on first render — no click needed to get here.
      const toggle = renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
      expect(links).toHaveLength(1);
      expect(links[0].textContent).toContain('CIAT');
      expect(links[0].classList.contains('pr-nav-program-card--active')).toBe(true);
      expect(links[0].textContent).toContain(renderedFixture.componentInstance.assignedMarkerLabel);

      toggle.click();
      renderedFixture.detectChanges();
      expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(3);
    });

    // ----------------------------------------------------------- ASC-R-16 / ASC-AC-15
    // The user's own words: on ANY route under a centre — not only its `/home` link — that centre
    // must read as active. Reviewer's diagnosis: `routerLinkActive` on the `/home` link only
    // matches `/home` and its children, so `/bilateral/CIAT/result/…` left CIAT unmarked. Fixed by
    // driving both loops' active state from `isActiveCenter()` — the same URL source the collapsed
    // filter already uses — instead of `routerLinkActive`.
    describe('active on any /bilateral/<x>/… route, not only /home (ASC-R-16)', () => {
      const seedWithAfricaRice = () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([]);
        centersMock.centers.set([catalogueCenter('AfricaRice'), catalogueCenter('IITA'), catalogueCenter('CIP')]);
      };

      it('ASC-AC-15 (expanded): active with aria-current="page" on a deep route with a query string', async () => {
        seedWithAfricaRice();
        const renderedFixture = await buildRendered(wholeBlock());
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/bilateral/AfricaRice/result/9652?phase=36');
        renderedFixture.detectChanges();

        // ASC-T-6 (ASC-R-17): closed by default; none of these three are assigned, so a collapsed
        // render would only carry the active AfricaRice — open it to see all three and their state.
        (renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement).click();
        renderedFixture.detectChanges();

        const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
        expect(links).toHaveLength(3);
        const africaRice = links.find(a => a.textContent?.includes('AfricaRice'))!;
        const others = links.filter(a => a !== africaRice);
        expect(africaRice).toBeTruthy();

        expect(africaRice.classList.contains('pr-nav-program-card--active')).toBe(true);
        expect(africaRice.getAttribute('aria-current')).toBe('page');
        others.forEach(a => {
          expect(a.classList.contains('pr-nav-program-card--active')).toBe(false);
          expect(a.getAttribute('aria-current')).toBeNull();
        });
      });

      it('ASC-AC-15 (rail): the rail button is active on the same deep route; the others are not', async () => {
        seedWithAfricaRice();
        // Same anchor ASC-T-2's collapsed-rail test uses: the INNER `@if`, so the fragment never
        // calls the outer rail guard's `homeSE.isLoadingSPLists()` (unstubbed on this mock).
        const railBlock = extractTemplateBlock(readTemplateHtml(), '@if (getMyCenters().length > 0) {');
        const renderedFixture = await buildRendered(railBlock);
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/bilateral/AfricaRice/result/9652?phase=36');
        renderedFixture.detectChanges();

        const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
        expect(links).toHaveLength(3);
        const africaRice = links.find(a => a.getAttribute('href') === '/bilateral/AfricaRice/home')!;
        const others = links.filter(a => a !== africaRice);
        expect(africaRice).toBeTruthy();

        expect(africaRice.classList.contains('pr-nav-rail-btn--active')).toBe(true);
        others.forEach(a => expect(a.classList.contains('pr-nav-rail-btn--active')).toBe(false));
      });

      it('ASC-R-16: a bare fragment (#x) still resolves to the centre', async () => {
        seedWithAfricaRice();
        const renderedFixture = await buildRendered(wholeBlock());
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/bilateral/AfricaRice#x');
        renderedFixture.detectChanges();

        const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
        const africaRice = links.find(a => a.textContent?.includes('AfricaRice'))!;
        expect(africaRice).toBeTruthy();
        expect(africaRice.classList.contains('pr-nav-program-card--active')).toBe(true);
        expect(africaRice.getAttribute('aria-current')).toBe('page');
      });
    });

    // ----------------------------------------------------------- ASC-T-6 / ASC-R-17 / ASC-DD-8
    // Supersedes ASC-T-4's open-by-default and active-only-when-closed: the block now starts
    // CLOSED for everyone, and while closed it shows the rows the user is assigned to PLUS
    // wherever they currently are, in `getMyCenters()` order.
    describe('closed by default; mine plus the current centre (ASC-T-6)', () => {
      it('ASC-AC-16: first render is collapsed, lists CIAT (mine) and IITA (active), not CIP; opening shows all three', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([
          { center_id: 'CIAT', center_name: 'CIAT', center_acronym: 'CIAT', role_name: 'Center User' }
        ]);
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA'), catalogueCenter('CIP')]);

        const renderedFixture = await buildRendered(wholeBlock());
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/bilateral/IITA/home');
        renderedFixture.detectChanges();

        const toggle = renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement;
        // First render, no click: collapsed.
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        const links = Array.from(renderedFixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
        expect(links).toHaveLength(2);
        expect(links[0].textContent).toContain('CIAT');
        expect(links[1].textContent).toContain('IITA');
        expect(links[0].textContent).toContain(renderedFixture.componentInstance.assignedMarkerLabel);
        expect(links[1].classList.contains('pr-nav-program-card--active')).toBe(true);

        toggle.click();
        renderedFixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(3);
      });

      it('ASC-AC-17: zero assignments and outside any centre — first render is collapsed and empty, toggle visible', async () => {
        rolesMock.isAdmin = true;
        apiMock.rolesSE.getMyCenters.mockReturnValue([]);
        // Populated catalogue (ASC-AC-1: an admin with zero assignments still gets it), so the
        // block itself renders and the toggle is there to be seen — only its CONTENT is empty.
        centersMock.centers.set([catalogueCenter('CIAT'), catalogueCenter('IITA'), catalogueCenter('CIP')]);

        const renderedFixture = await buildRendered(wholeBlock());
        renderedFixture.detectChanges();

        const toggle = renderedFixture.nativeElement.querySelector('.pr-nav-others-toggle') as HTMLButtonElement;
        expect(toggle).toBeTruthy();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(renderedFixture.nativeElement.querySelectorAll('a')).toHaveLength(0);
      });
    });
  });

  // ------------------------------------------------------- SGL-T-2 / SGL-R-1..R-2
  // Parsed-template checks — same rationale as SBAR-T-3 below: the real template trips BrnTooltip
  // under Jest, so markup authorship is asserted from the `.html` file on disk.
  // ------------------------------------------------------------------ P2-3682
  // The EXTRAS block used to carry five entries; the approved design carries one. Counting the
  // menu items is the lock: asserting only the ABSENCE of the four labels would stay green if a
  // sixth entry were added later, which is the drift this ticket exists to undo.
  describe('About block navigation entries (P2-3682 / quick/sidebar-about-links)', () => {
    const readExtrasMarkup = (): string => {
      const html = readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');
      const start = html.indexOf('pr-nav-extras');
      const end = html.indexOf('<!-- No footer');
      return html.slice(start, end);
    };

    it('renders the About entries: AI use, Developers, Terms and conditions, License', () => {
      const extras = readExtrasMarkup();
      expect(extras.split('<li hlmSidebarMenuItem>').length - 1).toBe(4);
      expect(extras).toContain('routerLink="/developers"');
      expect(extras).toContain('tooltip="Developers"');
      expect(extras).toContain('<span>Developers</span>');
      expect(extras).toContain('name="lucideCode"');
      // Release notes moved to the shell topbar, next to the notifications bell —
      // it no longer lives in the sidebar EXTRAS group.
      expect(extras).not.toContain('routerLink="/whats-new"');
    });

    it('exposes aiUseInPrmsUrl, termsAndConditionsUrl, and licenseUrl from environment', async () => {
      await build();
      // aiUseInPrmsUrl falls back to a hardcoded URL when a deployed environment.ts
      // (gitignored, injected by the CI pipeline) has not been updated with
      // footerUrls.aiUseInPrms yet — mirror that same contract here instead of
      // assuming the key is always present.
      const expectedAiUseInPrmsUrl =
        (environment.footerUrls as any)?.aiUseInPrms ??
        'https://cgiar-prms.notion.site/PRMS-AWS-Bedrock-Data-Privacy-Security-3dff2712247880468648c96cc02df681';
      expect(component.aiUseInPrmsUrl).toBe(expectedAiUseInPrmsUrl);
      expect(component.termsAndConditionsUrl).toBe(environment.footerUrls.termsAndCondition);
      expect(component.licenseUrl).toBe(environment.footerUrls.license);
    });

    it('keeps Glossary, Tour, Notifications, Text size and Release notes out of the whole sidebar', () => {
      const html = readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');
      for (const gone of [
        '<span>Glossary</span>',
        '<span>Tour</span>',
        '<span>Notifications</span>',
        '<span>Text size</span>',
        'routerLink="/whats-new"'
      ]) {
        expect(html).not.toContain(gone);
      }
      // Control: the same instrument still finds the entry that is meant to be there.
      expect(html).toContain('<span>AI use in PRMS</span>');
    });

    it('drops the component members those entries needed', async () => {
      await build();
      const moved = component as unknown as Record<string, unknown>;
      for (const member of ['goToNotifications', 'notificationBadgeCount', 'selectFontScale', 'startPlatformSidebarTour', 'clarisaGlossaryUrl', 'fontMenuOpen']) {
        expect(moved[member]).toBeUndefined();
      }
    });

    it('renders AI use in PRMS, Terms and conditions, and License links with external link contract', () => {
      const extras = readExtrasMarkup();
      expect(extras).toContain('About</div>');

      expect(extras).toContain('tooltip="AI use in PRMS"');
      expect(extras).toContain('[href]="aiUseInPrmsUrl"');
      expect(extras).toContain('<span>AI use in PRMS</span>');
      expect(extras).toContain('name="lucideSparkles"');

      expect(extras).toContain('tooltip="Terms and conditions"');
      expect(extras).toContain('[href]="termsAndConditionsUrl"');
      expect(extras).toContain('<span>Terms and conditions</span>');
      expect(extras).toContain('name="lucideFileText"');

      expect(extras).toContain('tooltip="License"');
      expect(extras).toContain('[href]="licenseUrl"');
      expect(extras).toContain('<span>License</span>');
      expect(extras).toContain('name="lucideAward"');
    });
  });

  // ------------------------------------------------------- SBAR-T-3 / SBAR-R-10 / STC-R-2..R-4
  // `[data-guide="sidebar-toggle"]` is the anchor `ReportingGuideService` (SBAR-T-4) targets for
  // the one-time discoverability hint (SBAR-DD-4). Since
  // `SPEC:changes/sidebar-toggle-consolidation` (STC-T-1), the sidebar owns TWO such buttons — one
  // per state (STC-DD-1) — each guarded by a mutually exclusive `@if` reading the same
  // `computed<boolean> isCollapsed()`, so exactly one is ever rendered.
  //
  // Why this is a markup (parsed-template) check and not a `TestBed`-rendered one: EVERY test
  // above renders this component with its template overridden to `''` — that pre-dates this task.
  // The real reason is `hlmSidebarMenuButton`'s `tooltip` host-directive binding to `BrnTooltip`
  // (`hlm-sidebar-menu-button.ts`) throws `NG0311: Directive BrnTooltip does not have an input
  // with a public name of brnTooltip` the instant the real template is instantiated under Jest —
  // a pre-existing `@spartan-ng/brain` version-resolution mismatch in the test runner, unrelated
  // to this attribute change and out of this task's scope to fix. Parsing the actual `.html` file
  // as markup proves the hook exists in the authored DOM without tripping that unrelated bug.
  //
  // `DOMParser` has no notion of `@if` — it sees BOTH authored branches, so a parsed-template count
  // is 2 (one per branch), never the runtime count of 1. That is a property of the workaround, not
  // an STC-R-4 regression; see `execution.md` → STC-T-1 for the Reviewer's adjudication. What this
  // proves: both buttons are authored correctly and sit in disjoint `@if` branches (the STC-R-4
  // invariant a text-parse CAN assert). What it does NOT prove: whether a driver.js popover
  // anchored to this selector renders sensibly (placement/legibility) — that is out of reach for a
  // DOM-presence assertion and is covered instead by the manual QA step in STC-T-2's done criteria.
  // Don't mistake this test passing for "the tour looks right".
  describe('sidebar toggle data-guide hook (SBAR-T-3, STC-R-2..R-4)', () => {
    const readTemplateDoc = (): Document => {
      const html = readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');
      return new DOMParser().parseFromString(html, 'text/html');
    };

    it('authors both state buttons with the hook — 2 authored branches, not a runtime duplicate', () => {
      const doc = readTemplateDoc();
      const hooks = doc.querySelectorAll('[data-guide="sidebar-toggle"]');
      // Two authored `@if` branches, one per sidebar state — see the block comment above for why
      // this is 2 here and provably 1 at runtime (STC-R-4).
      expect(hooks.length).toBe(2);
    });

    it('expanded-state button (STC-R-2/STC-R-10): "Collapse sidebar", no rail-centring class, toggles the sidebar', () => {
      const html = readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');
      const doc = readTemplateDoc();
      const hooks = Array.from(doc.querySelectorAll('[data-guide="sidebar-toggle"]')) as HTMLButtonElement[];
      const expandedButton = hooks.find(el => el.getAttribute('aria-label') === 'Collapse sidebar');

      expect(expandedButton).toBeTruthy();
      expect(expandedButton!.tagName.toLowerCase()).toBe('button');
      expect(expandedButton!.getAttribute('type')).toBe('button');
      expect(expandedButton!.getAttribute('title')).toBe('Collapse sidebar');
      expect(expandedButton!.outerHTML).toContain('(click)="sidebarSE.toggleSidebar()"');
      // `mx-auto` centres the button on the icon RAIL (collapsed state only) — it must NOT be on
      // the expanded button, which sits in a flex row beside the build badge (STC-R-10 review note).
      expect(expandedButton!.getAttribute('class')).not.toContain('mx-auto');

      // STC-R-4 invariant: the expanded button's `@if` and the collapsed button's `@if` read the
      // negated form of the same condition, so they are mutually exclusive branches, not two
      // independently-true conditions.
      expect(html).toContain('@if (!isCollapsed())');
    });

    it('collapsed-state button (STC-R-3, unchanged): "Expand sidebar", rail-centred, toggles the sidebar', () => {
      const html = readFileSync(join(__dirname, 'reporting-nav-sidebar.component.html'), 'utf8');
      const doc = readTemplateDoc();
      const hooks = Array.from(doc.querySelectorAll('[data-guide="sidebar-toggle"]')) as HTMLButtonElement[];
      const collapsedButton = hooks.find(el => el.getAttribute('aria-label') === 'Expand sidebar');

      expect(collapsedButton).toBeTruthy();
      expect(collapsedButton!.tagName.toLowerCase()).toBe('button');
      expect(collapsedButton!.getAttribute('type')).toBe('button');
      expect(collapsedButton!.getAttribute('title')).toBe('Expand sidebar');
      expect(collapsedButton!.outerHTML).toContain('(click)="sidebarSE.toggleSidebar()"');
      expect(collapsedButton!.getAttribute('class')).toBe(
        'hover:bg-sidebar-accent text-sidebar-foreground mx-auto flex size-8 items-center justify-center rounded-md'
      );

      // STC-R-4 invariant, other half: the collapsed branch reads the un-negated condition.
      expect(html).toContain('@if (isCollapsed())');
    });
  });
});
