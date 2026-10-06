import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterModule, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ResultsNotificationsComponent, FilterFacetKey } from './results-notifications.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
// @akili-spec notifications/detail-side-panel (DSP-T-6)
import { NotificationDetailPanelService } from './services/notification-detail-panel.service';
// @akili-spec notifications/filter-toolbar-dropdowns (FTD-T-3): the per-facet toolbar's own DOM
// tests need the REAL Spartan popover directives imported (not just `NO_ERRORS_SCHEMA`), because
// `*hlmPopoverPortal` is a structural directive — see the `FTD-T-3` describe block below for why.
import { HlmPopoverImports } from '@spartan/popover';
import { BrnPopover } from '@spartan-ng/brain/popover';
import { NgIcon } from '@ng-icons/core';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture;
  let apiServiceMock: any;
  let shareRequestModalServiceMock: any;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;
  let routerEvents$: Subject<any>;
  let queryParamMap$: BehaviorSubject<any>;

  beforeEach(async () => {
    apiServiceMock = {
      rolesSE: { isAdmin: true },
      dataControlSE: { myInitiativesList: [], getCurrentPhases: jest.fn(() => of({})), getCurrentIPSRPhase: jest.fn(() => of({})) },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
      },
      updateUserData: jest.fn(callback => callback())
    };

    shareRequestModalServiceMock = {
      inNotifications: false
    };

    resultsNotificationsServiceMock = {
      get_section_information: jest.fn(),
      get_sent_notifications: jest.fn(),
      get_updates_notifications: jest.fn(),
      markAllBellRead: jest.fn().mockResolvedValue(undefined),
      bellCount: signal(0),
      resetNotificationInformation: jest.fn(),
      resetFilters: jest.fn(),
      getAllPhases: jest.fn(),
      onPhaseChange: jest.fn(),
      // @akili-spec notifications/inbox-paginated-load (PAGE-T-6, T-5 audit forward pointer):
      // `ngOnInit()`'s no-phase-resolved fallback now calls this directly (design.md §2.2/§6.2,
      // PAGE-R-1 "no phase") instead of the three legacy wrappers above, which are still mocked only
      // because `refreshAllNotifications()` (called after an Accept/Decline) still uses them.
      loadInbox: jest.fn(),
      phaseList: [],
      filteredInitiatives: [],
      entityLabel: 'Entity',
      phaseFilter: null,
      initiativeIdFilter: null,
      searchFilter: null,
      centerIdsFilter: [],
      bilateralProjectIdsFilter: [],
      receivedData: { receivedContributionsPending: [], receivedContributionsDone: [] },
      sentData: { sentContributionsPending: [], sentContributionsDone: [] },
      updatesData: { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] },
      // @akili-spec notifications/inbox-paginated-load (PAGE-T-6): paging state the component's
      // template/getters now read straight off the service (design.md §6.2) — defaults match a
      // fully-loaded, exhausted inbox so pre-existing tests above (written before this task) keep
      // seeing the "Load more" control and skeleton gates hidden unless a test opts in.
      initialLoading: false,
      hasMore: false,
      historyLoading: false,
      loadingMore: false,
      loadMore: jest.fn()
    };

    routerEvents$ = new Subject<any>();

    routerMock = {
      navigate: jest.fn(),
      url: '/result/results-outlet/results-notifications',
      events: routerEvents$.asObservable()
    };

    // BELL-T-5 attempt 2: the real `ActivatedRoute.queryParamMap` is a BehaviorSubject-backed stream
    // (emits the current params on subscribe, then on every same-route query-param change).
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    activatedRouteMock = {
      snapshot: {
        queryParams: {}
      },
      queryParamMap: queryParamMap$.asObservable()
    };

    await TestBed.configureTestingModule({
      declarations: [ResultsNotificationsComponent],
      // CommonModule: the template's `@if` (settings gating) is real; RouterOutlet is needed for the
      // trailing `<router-outlet>`; RouterModule for `routerLink`.
      imports: [RouterOutlet, RouterModule, CommonModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ShareRequestModalService, useValue: shareRequestModalServiceMock },
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ],
      // The template renders real Spartan/custom-fields elements (app-pr-select, hlm-checkbox,
      // app-pr-button, app-pr-info-icon, ...) this lean unit-test module doesn't declare/import —
      // NO_ERRORS_SCHEMA lets them render as opaque tags instead of failing on unknown element/
      // property errors.
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsNotificationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct data on ngOnInit', () => {
    activatedRouteMock.snapshot.queryParams['phase'] = 'somePhase';
    activatedRouteMock.snapshot.queryParams['init'] = 'someInit';
    activatedRouteMock.snapshot.queryParams['search'] = 'someSearch';

    component.ngOnInit();

    expect(resultsNotificationsServiceMock.getAllPhases).toHaveBeenCalled();
    expect(shareRequestModalServiceMock.inNotifications).toBe(true);
    expect(resultsNotificationsServiceMock.phaseFilter).toBe('somePhase');
    expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('someInit');
    expect(resultsNotificationsServiceMock.searchFilter).toBe('someSearch');
  });

  // NOTIF-T-6 rework (double-fetch fix): `getAllPhases()`'s own `onPhaseChange()` is now the single
  // source of the Received/Sent/Updates fetch whenever a phase resolves — ngOnInit must NOT also
  // fetch them directly, or a normal page load issues every feed twice (up to 6 requests).
  it('ngOnInit delegates the fetch to getAllPhases() and does NOT fetch directly', () => {
    component.ngOnInit();

    expect(resultsNotificationsServiceMock.getAllPhases).toHaveBeenCalledWith(expect.any(Function));
    expect(resultsNotificationsServiceMock.get_section_information).not.toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_sent_notifications).not.toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_updates_notifications).not.toHaveBeenCalled();
    // @akili-spec notifications/inbox-paginated-load (PAGE-T-6): the no-phase-resolved fallback
    // (below) must not fire either, on a normal page load where a phase DOES resolve.
    expect(resultsNotificationsServiceMock.loadInbox).not.toHaveBeenCalled();
  });

  // The fallback: when getAllPhases() resolves NO phase at all (rare — e.g. before the active
  // reporting phase is known), the callback passed by ngOnInit is the only remaining way the page
  // gets any data.
  //
  // @akili-spec notifications/inbox-paginated-load (PAGE-T-6, PAGE-T-5 audit forward pointer): this
  // used to assert the three legacy wrapper calls (`get_section_information`, `get_sent_notifications`,
  // `get_updates_notifications` — each called with no arguments, each a thin `refreshSource()`
  // delegate). Finding: `initialLoading` (PAGE-T-6's skeleton-gate flag) is ONLY ever set by
  // `loadInbox()` in the service — `refreshSource()`/the legacy wrappers never touch it — so calling
  // them here left the skeleton gate permanently disengaged on this fallback path (pending/history
  // could paint in arrival order, the PAGE-R-2/PAGE-AC-5 regression the gate exists to prevent). The
  // fix calls `loadInbox()` (no phase — PAGE-R-1 "no phase" means all phases) once instead, which
  // both reloads the whole inbox AND engages/resolves the skeleton gate correctly.
  it('falls back to loadInbox() (no phase) when getAllPhases() resolves no phase — engages the skeleton gate correctly', () => {
    component.ngOnInit();
    const onPhaseUnresolved = resultsNotificationsServiceMock.getAllPhases.mock.calls[0][0];

    expect(resultsNotificationsServiceMock.loadInbox).not.toHaveBeenCalled();

    onPhaseUnresolved();

    expect(resultsNotificationsServiceMock.loadInbox).toHaveBeenCalledTimes(1);
    expect(resultsNotificationsServiceMock.loadInbox).toHaveBeenCalledWith();
    // The legacy wrappers are NOT called from this path any more — `loadInbox()` is the only call.
    expect(resultsNotificationsServiceMock.get_section_information).not.toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_sent_notifications).not.toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_updates_notifications).not.toHaveBeenCalled();
  });

  // The skeleton gate itself reads `initialLoading` straight off the service (design.md §6.2). Two
  // separate tests (not one toggling `initialLoading` mid-test) — a second `detectChanges()` after
  // mutating state tripped Angular's own `checkNoChanges()` dev-mode pass on an unrelated internal
  // timing detail in this same spec file's pre-existing "settings-route isolation" tests (see that
  // describe block's own comment above); one `detectChanges()` per test sidesteps it here too.
  it('the no-phase fallback: skeleton gate is up (no rows) while the service reports initialLoading=true', () => {
    routerMock.url = '/result/results-outlet/results-notifications';
    resultsNotificationsServiceMock.initialLoading = true;
    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [{ share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' }],
      receivedContributionsDone: []
    };

    component.ngOnInit();
    const onPhaseUnresolved = resultsNotificationsServiceMock.getAllPhases.mock.calls[0][0];
    onPhaseUnresolved();
    fixture.detectChanges();

    expect(resultsNotificationsServiceMock.loadInbox).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-notification-item')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-skeleton-notification-item').length).toBeGreaterThan(0);
  });

  // The gate is not bypassed either: once the service (which the component only reads, never drives)
  // reports `initialLoading=false` on the SAME fallback path, rows render normally — proving the gate
  // does not stay up forever once `loadInbox()`'s own pending-settlement clears the flag.
  it('the no-phase fallback: rows render once the service reports initialLoading=false', () => {
    routerMock.url = '/result/results-outlet/results-notifications';
    resultsNotificationsServiceMock.initialLoading = false;
    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [{ share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' }],
      receivedContributionsDone: []
    };

    component.ngOnInit();
    const onPhaseUnresolved = resultsNotificationsServiceMock.getAllPhases.mock.calls[0][0];
    onPhaseUnresolved();
    fixture.detectChanges();

    expect(resultsNotificationsServiceMock.loadInbox).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-notification-item')).toBeTruthy();
  });

  it('should update query params', () => {
    component.updateQueryParams();

    expect(routerMock.navigate).toHaveBeenCalledWith([], {
      relativeTo: activatedRouteMock,
      queryParams: {
        init: resultsNotificationsServiceMock.initiativeIdFilter,
        phase: resultsNotificationsServiceMock.phaseFilter,
        search: resultsNotificationsServiceMock.searchFilter
      },
      queryParamsHandling: 'merge'
    });
  });

  it('should call resetFilters if initiativeIdFilter is set', () => {
    resultsNotificationsServiceMock.initiativeIdFilter = 'someInitiative';
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should call resetFilters if searchFilter is set', () => {
    resultsNotificationsServiceMock.searchFilter = 'someSearch';
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should not call resetFilters if neither initiativeIdFilter nor searchFilter is set', () => {
    resultsNotificationsServiceMock.initiativeIdFilter = null;
    resultsNotificationsServiceMock.searchFilter = null;
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
  });

  // NOTIF-T-6 (Pivot re-scope, item 1) — the NEW Falsifier: navigating to
  // `results-notifications/settings` renders ONLY the Settings page, no notification list above it.
  // `isSettingsRoute` reads `router.url` live (same established pattern this file's own
  // `notificationsInfoTooltip` getter already used pre-Pivot), so mutating `routerMock.url` and
  // re-running change detection is enough to drive it, matching how the rest of this spec file
  // already exercises router-derived getters.
  describe('Settings-route isolation (NOTIF-T-6 Pivot re-scope — the new Falsifier)', () => {
    it('renders the unified list (tabs) when NOT on the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications';
      fixture.detectChanges();

      expect(component.isSettingsRoute).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="tablist"][aria-label="Notification decision filter"]')).toBeTruthy();
    });

    it('renders NOTHING of the unified list (no tabs, no toolbar, no rows) once on the settings route', () => {
      // A single `detectChanges()` at the final URL — mutating `routerMock.url` and re-rendering
      // TWICE in one test tripped Angular's own `checkNoChanges()` dev-mode verification pass
      // (NG0100) on an unrelated internal timing detail, not on anything this test needs to prove;
      // "renders the unified list when NOT on settings" (above) already covers the non-settings case.
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      fixture.detectChanges();

      expect(component.isSettingsRoute).toBe(true);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[role="tablist"][aria-label="Notification decision filter"]')).toBeNull();
      expect(compiled.querySelector('app-notification-item')).toBeNull();
      expect(compiled.querySelector('h1.notifications_title')).toBeNull();
    });
  });

  describe('notificationsInfoTooltip — ⓘ tooltip content, replacing the old always-visible paragraph', () => {
    it('returns non-empty combined copy when not on the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications';
      expect(component.notificationsInfoTooltip.length).toBeGreaterThan(0);
    });

    it('returns empty on the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      expect(component.notificationsInfoTooltip).toBe('');
    });

    it('does not render the ⓘ trigger button on Settings', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sgi-dac-info')).toBeNull();
    });

    it('renders the ⓘ trigger button off the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sgi-dac-info')).not.toBeNull();
    });
  });

  // NOTIF-T-6 (Pivot re-scope, item 3): the Filter toolbar (Search/Phase/Program/Center/Bilateral
  // project + chips + "Clear all"), migrated (in substance) from the retired `requests.component.ts`.
  // Ported from `requests.component.spec.ts`'s own "Filter popover"/"Filter dropdown" suites.
  describe('Filter toolbar — migrated from the retired requests.component.ts (NOTIF-T-6 Pivot re-scope)', () => {
    const bilateralRow = (overrides: Record<string, unknown> = {}) => ({
      obj_result: {
        source_name: 'W3/Bilaterals',
        obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'Bilateral result one' } }],
        result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10, acronym: 'CTR' } } }],
        ...overrides
      }
    });

    it('derives Center facet options from bilateral rows only, keyed on clarisa_institution.id', () => {
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [bilateralRow(), { obj_result: { source_name: 'W1/W2', result_code: 'W1-1' } }],
        receivedContributionsDone: []
      };

      expect(component.centerFacetOptions).toEqual([{ id: 10, label: 'CTR' }]);
    });

    it('derives Bilateral-project facet options from bilateral rows only, keyed on clarisa_projects.short_name/full_name', () => {
      resultsNotificationsServiceMock.sentData = {
        sentContributionsPending: [
          bilateralRow(),
          {
            obj_result: {
              source_name: 'W1/W2',
              obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'Bilateral result one' } }]
            }
          }
        ],
        sentContributionsDone: []
      };

      expect(component.bilateralProjectFacetOptions).toEqual([{ code: 'BIL-1', label: 'BIL-1 - Bilateral result one' }]);
    });

    it('checking one Center facet adds exactly one chip and increments the active-filter count to 1', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [bilateralRow()], receivedContributionsDone: [] };

      expect(component.activeFilterCount).toBe(0);

      component.onCenterFilterChange(10, true);

      expect(resultsNotificationsServiceMock.centerIdsFilter).toEqual([10]);
      expect(component.isCenterFilterChecked(10)).toBe(true);
      expect(component.activeFilterCount).toBe(1);
      expect(component.activeFilterChips).toEqual([{ type: 'center', id: '10', label: 'CTR' }]);
    });

    it('removing a Center chip clears the filter and decrements the active-filter count back to 0', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [bilateralRow()], receivedContributionsDone: [] };
      resultsNotificationsServiceMock.centerIdsFilter = [10];

      component.removeFilterChip({ type: 'center', id: '10', label: 'CTR' });

      expect(resultsNotificationsServiceMock.centerIdsFilter).toEqual([]);
      expect(component.activeFilterCount).toBe(0);
      expect(component.activeFilterChips).toEqual([]);
    });

    it('includes the Program facet in the active-filter count and chips, and "Clear all" resets every facet', () => {
      resultsNotificationsServiceMock.initiativeIdFilter = '5';
      resultsNotificationsServiceMock.filteredInitiatives = [{ initiative_id: '5', full_name: 'My Initiative' }];
      resultsNotificationsServiceMock.centerIdsFilter = [10];
      resultsNotificationsServiceMock.bilateralProjectIdsFilter = ['BIL-1'];

      expect(component.activeFilterCount).toBe(3);
      expect(component.activeFilterChips).toEqual(expect.arrayContaining([{ type: 'program', id: '5', label: 'My Initiative' }]));

      component.clearAllFilters();

      expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
      expect(resultsNotificationsServiceMock.phaseFilter).toBeNull();
      expect(resultsNotificationsServiceMock.entityLabel).toBe('Entity');
      expect(resultsNotificationsServiceMock.filteredInitiatives).toEqual([]);
    });

  });

  // @akili-spec notifications/filter-toolbar-dropdowns (FTD-T-1, design.md §6.2): the per-facet
  // dropdown state added additively alongside the legacy popover above (removed in FTD-T-2).
  describe('FTD — facet dropdown state', () => {
    it('filterFacets lists the seven facets in the fixed order Phase, Type, Funding, Result type, Program, Center, Bilateral project', () => {
      expect(component.filterFacets.map(facet => facet.key)).toEqual([
        'phase',
        'type',
        'funding',
        'resultType',
        'program',
        'center',
        'bilateral'
      ]);
    });

    describe('toggleFacet / closeFacet — at most one open', () => {
      it('opens a facet that was closed', () => {
        expect(component.openFacet()).toBeNull();
        component.toggleFacet('type');
        expect(component.openFacet()).toBe('type');
      });

      it('re-activating the open facet closes it (FTD-R-3.S2)', () => {
        component.toggleFacet('type');
        component.toggleFacet('type');
        expect(component.openFacet()).toBeNull();
      });

      it('activating a different facet replaces the open one, leaving exactly one open (FTD-R-3.S1 / FTD-AC-4)', () => {
        component.toggleFacet('type');
        component.toggleFacet('funding');
        expect(component.openFacet()).toBe('funding');
        expect(component.openFacet()).not.toBe('type');
      });

      it('closeFacet() is a no-op when nothing is open', () => {
        expect(() => component.closeFacet()).not.toThrow();
        expect(component.openFacet()).toBeNull();
      });
    });

    describe('onFacetStateChanged + the FTD-DD-4 re-open guard', () => {
      let nowSpy: jest.SpyInstance;

      afterEach(() => {
        nowSpy?.mockRestore();
      });

      it('an "open" transition is ignored (only "closed" is acted on)', () => {
        component.toggleFacet('type');
        component.onFacetStateChanged('type', 'open');
        expect(component.openFacet()).toBe('type');
      });

      it('a "closed" transition for the currently open facet clears openFacet', () => {
        component.toggleFacet('type');
        component.onFacetStateChanged('type', 'closed');
        expect(component.openFacet()).toBeNull();
      });

      it('a stale "closed" transition for an already-replaced facet does not clear the NEW open facet', () => {
        component.toggleFacet('type');
        component.toggleFacet('funding');
        component.onFacetStateChanged('type', 'closed');
        expect(component.openFacet()).toBe('funding');
      });

      it('re-toggling the same facet INSIDE the 50 ms guard window is ignored (Disqualifier: explicit performance.now values, not fake timers)', () => {
        // `toggleFacet('type')`'s FIRST call (opening, no prior close recorded) short-circuits
        // before reaching `performance.now()` — only the close and the re-toggle check call it.
        component.toggleFacet('type');

        nowSpy = jest.spyOn(performance, 'now');
        nowSpy.mockReturnValueOnce(1000); // onFacetStateChanged closes it, records the guard at t=1000
        component.onFacetStateChanged('type', 'closed');

        nowSpy.mockReturnValueOnce(1030); // 30ms later — still inside the 50ms window
        component.toggleFacet('type');

        expect(component.openFacet()).toBeNull();
      });

      it('re-toggling the same facet OUTSIDE the 50 ms guard window reopens it', () => {
        component.toggleFacet('type');

        nowSpy = jest.spyOn(performance, 'now');
        nowSpy.mockReturnValueOnce(1000); // onFacetStateChanged closes it, records the guard at t=1000
        component.onFacetStateChanged('type', 'closed');

        nowSpy.mockReturnValueOnce(1070); // 70ms later — outside the 50ms window
        component.toggleFacet('type');

        expect(component.openFacet()).toBe('type');
      });
    });

    describe('facetSelectedCount — reads the same service fields activeFilterCount reads', () => {
      it('counts multi-select facets off their own filter array length', () => {
        resultsNotificationsServiceMock.centerIdsFilter = [1, 2];
        expect(component.facetSelectedCount('center')).toBe(2);

        resultsNotificationsServiceMock.typeFilter = ['Contribution request'];
        expect(component.facetSelectedCount('type')).toBe(1);

        resultsNotificationsServiceMock.fundingFilter = [];
        expect(component.facetSelectedCount('funding')).toBe(0);
      });

      it('counts Program as 1 when initiativeIdFilter is set, else 0', () => {
        resultsNotificationsServiceMock.initiativeIdFilter = null;
        expect(component.facetSelectedCount('program')).toBe(0);

        resultsNotificationsServiceMock.initiativeIdFilter = '5';
        expect(component.facetSelectedCount('program')).toBe(1);
      });

      it('Phase has no count (FTD-R-6)', () => {
        expect(component.facetSelectedCount('phase')).toBe(0);
      });
    });

    describe('selectedPhaseLabel', () => {
      it('reads the selected phase’s phase_name_status off phaseList', () => {
        resultsNotificationsServiceMock.phaseList = [
          { id: 'P25', phase_name_status: 'Reporting 2025' },
          { id: 'P24', phase_name_status: 'Reporting 2024' }
        ];
        resultsNotificationsServiceMock.phaseFilter = 'P25';
        expect(component.selectedPhaseLabel).toBe('Reporting 2025');
      });

      it('is empty before any phase resolves', () => {
        resultsNotificationsServiceMock.phaseList = [];
        resultsNotificationsServiceMock.phaseFilter = null;
        expect(component.selectedPhaseLabel).toBe('');
      });
    });

    describe('selectPhase — no-op on the same id, applies + reloads on a different one (FTD-R-5.S3 / FTD-AC-9)', () => {
      it('re-picking the already-selected phase does NOT call onPhaseChange and does not reload (Falsifier)', () => {
        resultsNotificationsServiceMock.phaseFilter = 'P25';
        component.toggleFacet('phase');

        component.selectPhase('P25');

        expect(resultsNotificationsServiceMock.onPhaseChange).not.toHaveBeenCalled();
        expect(resultsNotificationsServiceMock.phaseFilter).toBe('P25');
      });

      it('picking a different phase sets phaseFilter, calls onPhaseChange and closes the dropdown', () => {
        resultsNotificationsServiceMock.phaseFilter = 'P24';
        component.toggleFacet('phase');

        component.selectPhase('P25');

        expect(resultsNotificationsServiceMock.phaseFilter).toBe('P25');
        expect(resultsNotificationsServiceMock.onPhaseChange).toHaveBeenCalledWith('P25');
        expect(component.openFacet()).toBeNull();
      });
    });

    describe('selectProgram — toggles initiativeIdFilter, always closes (FTD-R-5.S3 / FTD-AC-9)', () => {
      it('picking a program sets initiativeIdFilter and closes', () => {
        resultsNotificationsServiceMock.initiativeIdFilter = null;
        component.toggleFacet('program');

        component.selectProgram('5');

        expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('5');
        expect(component.openFacet()).toBeNull();
      });

      it('picking the already-selected program clears it back to null (toggle)', () => {
        resultsNotificationsServiceMock.initiativeIdFilter = '5';
        component.toggleFacet('program');

        component.selectProgram('5');

        expect(resultsNotificationsServiceMock.initiativeIdFilter).toBeNull();
      });

      it('picking the same program TWICE in a row leaves initiativeIdFilter null, never stuck non-null (Falsifier)', () => {
        resultsNotificationsServiceMock.initiativeIdFilter = null;

        component.selectProgram('5');
        expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('5');

        component.selectProgram('5');
        expect(resultsNotificationsServiceMock.initiativeIdFilter).toBeNull();
      });
    });

    describe('filteredProgramOptions — FTD-R-5.S4 Program search', () => {
      beforeEach(() => {
        resultsNotificationsServiceMock.filteredInitiatives = [
          { initiative_id: '5', full_name: 'Accelerating livestock genetics' },
          { initiative_id: '6', full_name: 'Climate resilience' }
        ];
      });

      it('returns every option when the search query is empty', () => {
        expect(component.filteredProgramOptions).toHaveLength(2);
      });

      it('narrows to the options whose full_name matches the query, case-insensitively', () => {
        component.programSearchQuery.set('climate');
        expect(component.filteredProgramOptions).toEqual([{ initiative_id: '6', full_name: 'Climate resilience' }]);
      });

      it('returns an empty list when nothing matches (FTD-R-5.S4 "Nothing matches that search.")', () => {
        component.programSearchQuery.set('zzz-no-match');
        expect(component.filteredProgramOptions).toEqual([]);
      });
    });
  });

  // @akili-spec notifications/filter-toolbar-dropdowns (FTD-T-3, design.md §10/§13, tasks.md
  // FTD-T-3): DOM-level coverage for the per-facet toolbar — trigger order, the retired single
  // Filter button, settings-route absence, `aria-expanded` wiring, the REAL `BrnPopover`
  // `stateChanged` output closing a facet, and that each facet's OWN `hlm-popover-content` renders
  // only that facet's own controls.
  //
  // Own TestBed (same pattern as the `DSP-T-6` block above), because this block needs
  // `HlmPopoverImports` (+ `NgIcon`) actually IMPORTED — the outer block's `NO_ERRORS_SCHEMA` lets
  // `<hlm-popover>`/`<hlm-popover-content>` render as opaque tags, but `*hlmPopoverPortal`
  // (`HlmPopoverPortal`, a host directive wrapping `BrnPopoverContent`) is a STRUCTURAL directive —
  // without it imported, Angular never instantiates the `<ng-template>` it compiles to, so the
  // popover body never renders at all. (None of the existing facet-option/chip tests above need this:
  // they call the component's own methods directly and never read popover-content DOM.)
  //
  // Disqualifier recorded (tasks.md FTD-T-3): under Jest, `BrnPopoverContent`
  // (`tests/mocks/spartanBrainMock.ts`) renders its template INLINE and UNCONDITIONALLY, regardless
  // of `state` — there is no real CDK overlay, so EVERY facet's `hlm-popover-content` is present in
  // the DOM at once, open or not (confirmed by reading the mock: unlike `BrnSheetContent`'s sibling,
  // which gates on an `effect()` reading the sheet's own open signal, `BrnPopoverContent`/
  // `BrnDialogContent` have no such gate). The "only its facet" test below therefore does NOT assert
  // on open/closed visibility (jsdom cannot prove that at all — real dismissal/positioning is this
  // task's browser part) — it scopes the query to that facet's own `hlm-popover-content[aria-label=…]`
  // element, which the DOM genuinely has one-per-facet regardless of state. This is still a real
  // falsifier: swapping a `@switch` case body (falsifier 2 below) breaks it.
  describe('FTD-T-3 — toolbar DOM (per-facet popovers, design.md §6.3/§10)', () => {
    let ftdFixture: any;
    let ftdComponent: ResultsNotificationsComponent;

    function bilateralRow(overrides: Record<string, unknown> = {}) {
      return {
        obj_result: {
          source_name: 'W3/Bilaterals',
          obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'Bilateral result one' } }],
          result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10, acronym: 'CTR' } } }],
          ...overrides
        }
      };
    }

    function triggers(): HTMLButtonElement[] {
      return Array.from((ftdFixture.nativeElement as HTMLElement).querySelectorAll('button[data-facet]'));
    }

    function triggerFor(key: FilterFacetKey): HTMLButtonElement {
      const el = triggers().find(b => b.getAttribute('data-facet') === key);
      expect(el).toBeTruthy();
      return el!;
    }

    function popoverContentFor(label: string): HTMLElement {
      const el = (ftdFixture.nativeElement as HTMLElement).querySelector(`hlm-popover-content[aria-label="${label}"]`);
      expect(el).toBeTruthy();
      return el as HTMLElement;
    }

    function brnPopoverFor(key: FilterFacetKey): BrnPopover {
      const index = ftdComponent.filterFacets.findIndex(f => f.key === key);
      const debugEls = ftdFixture.debugElement.queryAll(By.directive(BrnPopover));
      expect(debugEls.length).toBe(ftdComponent.filterFacets.length);
      return debugEls[index].injector.get(BrnPopover);
    }

    beforeEach(async () => {
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [bilateralRow()],
        receivedContributionsDone: []
      };
      resultsNotificationsServiceMock.sentData = {
        sentContributionsPending: [bilateralRow()],
        sentContributionsDone: []
      };

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [ResultsNotificationsComponent],
        imports: [RouterOutlet, RouterModule, CommonModule, ...HlmPopoverImports, NgIcon],
        providers: [
          { provide: ApiService, useValue: apiServiceMock },
          { provide: ShareRequestModalService, useValue: shareRequestModalServiceMock },
          { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
          { provide: Router, useValue: routerMock },
          { provide: ActivatedRoute, useValue: activatedRouteMock }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();

      ftdFixture = TestBed.createComponent(ResultsNotificationsComponent);
      ftdComponent = ftdFixture.componentInstance;
      // NOT calling `detectChanges()` here, same discipline as the outer block's own `beforeEach`
      // (no initial render there either) — a test that mutates `routerMock.url` must do so BEFORE its
      // own first (and, per this file's established precedent elsewhere, ideally only) `detectChanges()`.
    });

    it('renders the seven triggers in the fixed order phase,type,funding,resultType,program,center,bilateral — FALSIFIER: swapping two `filterFacets` entries turns this red', () => {
      ftdFixture.detectChanges();
      expect(triggers().map(b => b.getAttribute('data-facet'))).toEqual([
        'phase',
        'type',
        'funding',
        'resultType',
        'program',
        'center',
        'bilateral'
      ]);
    });

    it('renders no "Filter" button anywhere in the toolbar (the retired single popover trigger)', () => {
      ftdFixture.detectChanges();
      const anyFilterButton = Array.from((ftdFixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Filter'
      );
      expect(anyFilterButton).toBeUndefined();
    });

    it('renders no [data-facet] trigger at all on the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      ftdFixture.detectChanges();
      expect(triggers().length).toBe(0);
    });

    it('aria-expanded toggles true on the clicked trigger only, and clicking it again closes it', () => {
      ftdFixture.detectChanges();
      const typeTrigger = triggerFor('type');
      const fundingTrigger = triggerFor('funding');
      expect(typeTrigger.getAttribute('aria-expanded')).toBe('false');

      typeTrigger.click();
      ftdFixture.detectChanges();
      expect(typeTrigger.getAttribute('aria-expanded')).toBe('true');
      expect(fundingTrigger.getAttribute('aria-expanded')).toBe('false');

      typeTrigger.click();
      ftdFixture.detectChanges();
      expect(typeTrigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('the overlay\'s own stateChanged("closed") output closes the facet and flips aria-expanded back, even without a trigger click', () => {
      ftdFixture.detectChanges();
      ftdComponent.toggleFacet('type');
      ftdFixture.detectChanges();
      expect(ftdComponent.openFacet()).toBe('type');

      brnPopoverFor('type').stateChanged.emit('closed');
      ftdFixture.detectChanges();

      expect(ftdComponent.openFacet()).toBeNull();
      expect(triggerFor('type').getAttribute('aria-expanded')).toBe('false');
    });

    // a11y regression (FTD-T-2 -> FTD-T-3 browser run): spartan's popover default puts role="dialog" on the
    // CDK overlay container; ours must be neutralised (role="none" on hlm-popover) so exactly ONE named dialog
    // exists per facet (hlm-popover-content). Under Jest the brain mock renders no overlay container, so the
    // container's real ARIA is only provable in the browser; this asserts the template wiring only.
    it('each facet has exactly one named dialog: hlm-popover-content carries role=dialog + facet label, and its hlm-popover host neutralises the overlay container role with role=none', () => {
      ftdFixture.detectChanges();
      const root = ftdFixture.nativeElement as HTMLElement;
      const popovers = Array.from(root.querySelectorAll('hlm-popover'));
      expect(popovers.length).toBeGreaterThan(0);
      for (const popover of popovers) {
        expect(popover.getAttribute('role')).toBe('none');
        const contents = popover.querySelectorAll('hlm-popover-content');
        expect(contents.length).toBe(1);
        expect(contents[0].getAttribute('role')).toBe('dialog');
        expect(contents[0].getAttribute('aria-label')).toBeTruthy();
      }
      expect(root.querySelectorAll('hlm-popover-content[role="dialog"]').length).toBe(popovers.length);
      // Wiring proof: the template attribute alone survives a revert of the helm edit, but the BrnPopover
      // instance only receives `role` if 'role' is forwarded in hlm-popover.ts hostDirectives.inputs.
      for (const facet of ftdComponent.filterFacets) {
        expect(brnPopoverFor(facet.key).role).toBe('none');
      }
    });

    it('every facet popover is anchored to its own trigger button via attachTo (no globally centred overlay) - FALSIFIER: removing [attachTo] turns this red', () => {
      ftdFixture.detectChanges();
      const root = ftdFixture.nativeElement as HTMLElement;
      for (const facet of ftdComponent.filterFacets) {
        const button = root.querySelector(`button[data-facet="${facet.key}"]`);
        expect(button).toBeTruthy();
        expect(brnPopoverFor(facet.key).attachTo).toBe(button);
      }
    });

    it('the Center facet\'s own hlm-popover-content renders only Center controls, never the Bilateral project search/checkbox — FALSIFIER: rendering the bilateral body in every popover turns this red', () => {
      ftdFixture.detectChanges();
      ftdComponent.toggleFacet('center');
      ftdFixture.detectChanges();

      const centerContent = popoverContentFor(ftdComponent.copy.filterToolbar.centerLabel);
      expect(centerContent.querySelector(`input[placeholder="${ftdComponent.copy.filterToolbar.centerSearchPlaceholder}"]`)).toBeTruthy();
      expect(centerContent.textContent).toContain('CTR');
      expect(
        centerContent.querySelector(`input[placeholder="${ftdComponent.copy.filterToolbar.bilateralProjectSearchPlaceholder}"]`)
      ).toBeNull();
      expect(centerContent.textContent).not.toContain('BIL-1');
    });
  });

  // NOTIF-T-6: Tabs UI (All / Needs your decision / For your information) over the unified list.
  // Fixture matches NOTIF-T-1's own Falsifier fixture exactly (2 pending Received, 1 resolved
  // Received, 1 Sent, 2 Updates = 2 decision + 4 info = 6 total across the WHOLE account).
  describe('NOTIF-T-6 — Tabs UI: All / Needs your decision / For your information', () => {
    const pendingReceived1 = { share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' };
    const pendingReceived2 = { share_result_request_id: 2, request_status_id: 1, requested_date: '2026-09-28T09:00:00Z' };
    const resolvedReceived = { share_result_request_id: 3, request_status_id: 2, requested_date: '2026-09-27T09:00:00Z' };
    const sentRow = { share_result_request_id: 4, request_status_id: 1, requested_date: '2026-09-26T09:00:00Z' };
    const updateRow1 = { notification_id: 1, created_date: '2026-09-25T09:00:00Z' };
    const updateRow2 = { notification_id: 2, created_date: '2026-09-24T09:00:00Z' };

    beforeEach(() => {
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [pendingReceived1, pendingReceived2],
        receivedContributionsDone: [resolvedReceived]
      };
      resultsNotificationsServiceMock.sentData = {
        sentContributionsPending: [sentRow],
        sentContributionsDone: []
      };
      resultsNotificationsServiceMock.updatesData = {
        notificationAnnouncements: [],
        notificationsPending: [updateRow1],
        notificationsViewed: [updateRow2]
      };
    });

    it('unifiedList (the RAW merge, unscoped by the Received/Sent toggle) still returns all 6 rows — NOTIF-T-1 Falsifier, unchanged', () => {
      expect(component.unifiedList).toHaveLength(6);
    });

    // NOTIF-T-6 (Pivot re-scope): allTabCount/decisionTabCount/infoTabCount are now scoped to the
    // active Received/Sent side (default 'received'), so the badge next to each tab never lies about
    // what actually renders — the ORIGINAL Disqualifier ("if the tab counts don't match the rendered
    // row count in any fixture, stop") still holds; it is verified below against this new, correct
    // baseline instead of the pre-toggle, unscoped total.
    it('under the default "received" side, classifies 2 decision rows and 3 info rows (2 Received/1 Sent excluded + 2 Updates)', () => {
      expect(component.activeSource()).toBe('received');
      expect(component.allTabCount).toBe(5);
      expect(component.decisionTabCount).toBe(2);
      expect(component.infoTabCount).toBe(3);
    });

    it('switching to "sent" shows 0 decision rows and 3 info rows (the 1 Sent row + 2 Updates — Received rows excluded)', () => {
      component.setActiveSource('sent');

      expect(component.allTabCount).toBe(3);
      expect(component.decisionTabCount).toBe(0);
      expect(component.infoTabCount).toBe(3);
    });

    it('"All" tab renders exactly allTabCount rows for the active side', () => {
      component.setActiveTab('all');
      fixture.detectChanges();

      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item');
      expect(rows.length).toBe(component.allTabCount);
    });

    it('"Needs your decision" tab shows a count of 2 and renders exactly those 2 rows (decision rows are always Received-origin, unaffected by the toggle)', () => {
      component.setActiveTab('decision');
      fixture.detectChanges();

      expect(component.decisionTabCount).toBe(2);
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item');
      expect(rows.length).toBe(2);
    });

    it('"For your information" tab renders exactly infoTabCount rows', () => {
      component.setActiveTab('info');
      fixture.detectChanges();

      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item');
      expect(rows.length).toBe(component.infoTabCount);
    });

    it('tab counts always match the rendered row count for every tab, on both sides of the toggle (disqualifier guard: no lying badge)', () => {
      (['received', 'sent'] as const).forEach(source => {
        component.setActiveSource(source);
        (['all', 'decision', 'info'] as const).forEach(tab => {
          component.setActiveTab(tab);
          fixture.detectChanges();

          const rendered = (fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item').length;
          const badgeCount = tab === 'all' ? component.allTabCount : tab === 'decision' ? component.decisionTabCount : component.infoTabCount;
          expect(rendered).toBe(badgeCount);
        });
      });
    });

    it('setActiveTab updates the active tab signal and marks the matching tab button data-active', () => {
      component.setActiveTab('decision');
      fixture.detectChanges();

      expect(component.activeTab()).toBe('decision');
      // Scoped to the decision-tab row specifically — the page ALSO has a Received/Sent segmented
      // control using the same `role="tab"`/`data-active` pattern (NOTIF-T-6 Pivot re-scope item 4),
      // so an unscoped selector would grab whichever renders first in DOM order instead.
      const activeButton = (fixture.nativeElement as HTMLElement).querySelector(
        '[role="tablist"][aria-label="Notification decision filter"] [role="tab"][data-active]'
      );
      expect(activeButton?.textContent).toContain('Needs your decision');
    });

    it('an empty unified list renders zero rows on every tab and no count lies about it', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [] };
      resultsNotificationsServiceMock.sentData = { sentContributionsPending: [], sentContributionsDone: [] };
      resultsNotificationsServiceMock.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };

      fixture.detectChanges();

      expect(component.allTabCount).toBe(0);
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item').length).toBe(0);
    });

    it('the search filter (existing toolbar state) narrows the unified list before the tab split', () => {
      resultsNotificationsServiceMock.searchFilter = 'nonexistent-search-term-xyz';
      fixture.detectChanges();

      expect(component.allTabCount).toBe(0);
    });
  });

  // NOTIF-T-6 (Pivot re-scope, item 4): the Received/Sent in-list toggle (`NOTIF-R-8` amended).
  describe('Received/Sent in-list toggle (NOTIF-T-6 Pivot re-scope, NOTIF-R-8 amended)', () => {
    const receivedRow = { share_result_request_id: 1, request_status_id: 2, requested_date: '2026-09-27T09:00:00Z' };
    const sentRow = { share_result_request_id: 2, request_status_id: 2, requested_date: '2026-09-26T09:00:00Z' };
    const updateRow = { notification_id: 1, created_date: '2026-09-25T09:00:00Z' };

    beforeEach(() => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [receivedRow] };
      resultsNotificationsServiceMock.sentData = { sentContributionsPending: [], sentContributionsDone: [sentRow] };
      resultsNotificationsServiceMock.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [updateRow] };
    });

    it('defaults to "received"', () => {
      expect(component.activeSource()).toBe('received');
    });

    it('under "received", the sourceScopedList excludes the Sent row but keeps the Received and Updates rows', () => {
      const origins = component.sourceScopedList.map((item: any) => item.origin);
      expect(origins.sort()).toEqual(['received', 'update']);
    });

    it('under "sent", the sourceScopedList excludes the Received row but keeps the Sent and Updates rows', () => {
      component.setActiveSource('sent');
      const origins = component.sourceScopedList.map((item: any) => item.origin);
      expect(origins.sort()).toEqual(['sent', 'update']);
    });

    it('setActiveSource updates the segmented control\'s data-active attribute', () => {
      fixture.detectChanges();
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tablist"][aria-label="Received or Sent"] [role="tab"]');
      expect(buttons[0].getAttribute('data-active')).toBe('');
      expect(buttons[1].hasAttribute('data-active')).toBe(false);

      component.setActiveSource('sent');
      fixture.detectChanges();

      expect(buttons[0].hasAttribute('data-active')).toBe(false);
      expect(buttons[1].getAttribute('data-active')).toBe('');
    });

    // NOTIF-T-6 (Pivot re-scope, item 4): "switching the toggle closes any open detail panel"
    // (`notification-item.component.ts` is closed scope — it may not gain a new Input/method to be
    // told to close). Achieved via the template's `@switch (activeSource())` wrapper around every
    // `<app-notification-item>` — a `@switch` case change is a genuine structural teardown/recreate,
    // unconditionally, so every row instance (received/sent/update alike) is destroyed and a fresh
    // one created on a toggle flip, discarding that instance's own `drawerOpen` signal along with it.
    // Proven at the DOM-instance-identity level (the only level reachable without touching the
    // closed-scope component). (A `@for`-track-key-only approach was tried first and measured to NOT
    // reliably force this — see `trackNotificationKey()`'s doc comment.)
    it('every rendered row is a NEW DOM instance after a source switch, including an Updates row visible on both sides', () => {
      fixture.detectChanges();
      const before = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item'));
      expect(before.length).toBeGreaterThan(0);

      component.setActiveSource('sent');
      fixture.detectChanges();
      const after = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-notification-item'));

      // No DOM node from `before` survives into `after` — every element reference is distinct.
      const beforeSet = new Set(before);
      after.forEach(node => expect(beforeSet.has(node)).toBe(false));
    });

    it('isSentRow uses the real origin tag, not the old needsDecision-based proxy — a resolved Received row is never mistaken for Sent', () => {
      const resolvedReceivedTagged = { ...receivedRow, source: 'request', needsDecision: false, origin: 'received' } as any;
      const sentTagged = { ...sentRow, source: 'request', needsDecision: false, origin: 'sent' } as any;

      expect(component.isSentRow(resolvedReceivedTagged)).toBe(false);
      expect(component.isSentRow(sentTagged)).toBe(true);
    });
  });

  // @akili-spec notifications/detail-side-panel (DSP-T-6, design.md §2.1/§6.2): the page's docked
  // panel layout. A mock `NotificationDetailPanelService` (writable signals) is swapped in via
  // `TestBed.overrideComponent` so `isWide()`/`portal()` are deterministic here — the service's OWN
  // isWide/BreakpointObserver wiring is covered independently in
  // `notification-detail-panel.service.spec.ts`.
  describe('DSP-T-6 — docked panel layout (page side)', () => {
    let panelIsWide: ReturnType<typeof signal<boolean>>;
    let panelPortal: ReturnType<typeof signal<unknown>>;
    let panelLabelledBy: ReturnType<typeof signal<string | null>>;
    let panelMock: any;
    let dspFixture: any;
    let dspComponent: ResultsNotificationsComponent;

    beforeEach(async () => {
      panelIsWide = signal(false);
      panelPortal = signal<unknown>(null);
      panelLabelledBy = signal<string | null>(null);
      panelMock = {
        isWide: panelIsWide,
        portal: panelPortal,
        labelledBy: panelLabelledBy,
        activeKey: signal<string | null>(null),
        open: jest.fn(),
        close: jest.fn(),
        closeAll: jest.fn()
      };

      // The outer `beforeEach` already configured + compiled + created a component instance from
      // the shared TestBed — `overrideComponent` cannot run after that, so this block gets its own
      // fresh TestBed, reusing the same service mocks the outer block built.
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        declarations: [ResultsNotificationsComponent],
        imports: [RouterOutlet, RouterModule, CommonModule],
        providers: [
          { provide: ApiService, useValue: apiServiceMock },
          { provide: ShareRequestModalService, useValue: shareRequestModalServiceMock },
          { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
          { provide: Router, useValue: routerMock },
          { provide: ActivatedRoute, useValue: activatedRouteMock }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      })
        .overrideComponent(ResultsNotificationsComponent, {
          add: { providers: [{ provide: NotificationDetailPanelService, useValue: panelMock }] }
        })
        .compileComponents();

      dspFixture = TestBed.createComponent(ResultsNotificationsComponent);
      dspComponent = dspFixture.componentInstance;
    });

    it('FALSIFIER: with isWide=false the aside must NOT be in the DOM, even with a non-null portal', () => {
      panelIsWide.set(false);
      panelPortal.set({ kind: 'stub-portal' });
      dspFixture.detectChanges();

      // Broken-code check performed manually (see task report): rendering the aside off
      // `panel.portal()` alone (dropping the `panel.isWide() &&` guard) makes this assertion fail —
      // restored before this run.
      const aside = (dspFixture.nativeElement as HTMLElement).querySelector('aside[role="complementary"]');
      expect(aside).toBeNull();
    });

    it('renders the aside when BOTH isWide=true and a portal are present', () => {
      panelIsWide.set(true);
      panelPortal.set({ kind: 'stub-portal' });
      dspFixture.detectChanges();

      const aside = (dspFixture.nativeElement as HTMLElement).querySelector('aside[role="complementary"]');
      expect(aside).not.toBeNull();
    });

    it('does not render the aside when isWide=true but no portal is open', () => {
      panelIsWide.set(true);
      panelPortal.set(null);
      dspFixture.detectChanges();

      const aside = (dspFixture.nativeElement as HTMLElement).querySelector('aside[role="complementary"]');
      expect(aside).toBeNull();
    });

    it('binds the aside\'s aria-labelledby to panel.labelledBy()', () => {
      panelIsWide.set(true);
      panelPortal.set({ kind: 'stub-portal' });
      panelLabelledBy.set('detail-heading-123');
      dspFixture.detectChanges();

      const aside = (dspFixture.nativeElement as HTMLElement).querySelector('aside[role="complementary"]');
      expect(aside?.getAttribute('aria-labelledby')).toBe('detail-heading-123');
    });

    it('DSP-T-9 F-1: the aside offsets its sticky top/height from --pr-shell-header-height, not a static 24px/140px', () => {
      panelIsWide.set(true);
      panelPortal.set({ kind: 'stub-portal' });
      dspFixture.detectChanges();

      const aside = (dspFixture.nativeElement as HTMLElement).querySelector('aside[role="complementary"]') as HTMLElement;
      // FALSIFIER: reverting to the old static `top-[24px] h-[calc(100vh-140px)]` classes (no
      // `--pr-shell-header-height` reference) fails this assertion — observed red before the fix.
      // Asserted on the raw `style` attribute string, not `el.style.top/.height`: jsdom's CSSOM does
      // not parse a `calc(var(...))` value back into those properties (verified empty in this suite).
      const styleAttr = aside.getAttribute('style') ?? '';
      expect(styleAttr).toContain('--pr-shell-header-height');
      expect(styleAttr.replace(/\s+/g, ' ')).toContain('top: calc(var(--pr-shell-header-height, 56px) + 24px)');
      expect(styleAttr.replace(/\s+/g, ' ')).toContain('height: calc(100vh - var(--pr-shell-header-height, 56px) - 48px)');
    });

    it('FALSIFIER: switching Received -> Sent must leave portal() non-null false — setActiveSource must call panel.closeAll()', () => {
      dspFixture.detectChanges();

      dspComponent.setActiveSource('sent');

      // Broken-code check performed manually: removing the `this.panel.closeAll();` line from
      // `setActiveSource()` makes `panelMock.closeAll` never get called — restored before this run.
      expect(panelMock.closeAll).toHaveBeenCalled();
    });
  });

  // NOTIF-T-6 (Pivot re-scope): Announcements + "Mark all as read", ported from the retired
  // `updates.component.html`/`.ts` so real capability doesn't silently disappear with those files.
  describe('Announcements + Mark all as read — ported from the retired updates.component.* (NOTIF-T-6 Pivot re-scope)', () => {
    it('renders an Announcements section when notificationAnnouncements is non-empty', () => {
      resultsNotificationsServiceMock.updatesData = {
        notificationAnnouncements: [{ notification_id: 99 }],
        notificationsPending: [],
        notificationsViewed: []
      };
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Announcements');
    });

    it('does not render the Announcements section when there are none', () => {
      resultsNotificationsServiceMock.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Announcements');
    });

    const findMarkAll = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
        b.textContent?.includes('Mark all as read')
      ) as HTMLButtonElement | undefined;

    // BRS-T-7 (BRS-R-3/R-5): the button follows the bell badge (all phases), not the phase-filtered
    // `notificationsPending`, and delegates to the shared `markAllBellRead()`.
    it('shows "Mark all as read" while the bell has a badge even if the filtered view has 0 unread updates, and delegates to markAllBellRead', () => {
      resultsNotificationsServiceMock.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
      resultsNotificationsServiceMock.bellCount.set(3);
      fixture.detectChanges();

      const button = findMarkAll();
      expect(button).toBeTruthy();

      button.click();
      expect(resultsNotificationsServiceMock.markAllBellRead).toHaveBeenCalledTimes(1);
    });

    it('does not render "Mark all as read" when the bell count is 0, even with unread updates in the filtered view', () => {
      resultsNotificationsServiceMock.updatesData = {
        notificationAnnouncements: [],
        notificationsPending: [{ notification_id: 1 }],
        notificationsViewed: []
      };
      resultsNotificationsServiceMock.bellCount.set(0);
      fixture.detectChanges();

      expect(findMarkAll()).toBeFalsy();
    });

    it('ignores a second click while the first markAllBellRead() is still in flight', async () => {
      let resolve: () => void;
      resultsNotificationsServiceMock.markAllBellRead.mockReturnValue(new Promise<void>(r => (resolve = r)));
      resultsNotificationsServiceMock.bellCount.set(2);
      fixture.detectChanges();

      const p1 = component.onMarkAllRead();
      const p2 = component.onMarkAllRead();
      expect(resultsNotificationsServiceMock.markAllBellRead).toHaveBeenCalledTimes(1);
      resolve();
      await Promise.all([p1, p2]);
      await component.onMarkAllRead();
      expect(resultsNotificationsServiceMock.markAllBellRead).toHaveBeenCalledTimes(2);
    });

    it('swallows a markAllBellRead() rejection (both legs failed) without an unhandled error', async () => {
      resultsNotificationsServiceMock.markAllBellRead.mockRejectedValue(new Error('x'));
      await expect(component.onMarkAllRead()).resolves.toBeUndefined();
    });
  });

  // @akili-spec notifications/inbox-paginated-load (PAGE-T-6): skeleton gate, "Load more", the
  // filtered-scope hint and the identity-keyed memoization (design.md §6.2/§6.3, PAGE-R-2/R-4/R-10/
  // R-11). Falsifiers (a)-(e) from the task brief, one `it` per letter plus the skeleton-gate and
  // "Loading history…" rendering this task also owns.
  describe('Paginated inbox — skeleton gate, Load more, hint, memoization (PAGE-T-6)', () => {
    const getLoadMoreButton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent?.includes('Load more')) as
        | HTMLButtonElement
        | undefined;

    beforeEach(() => {
      routerMock.url = '/result/results-outlet/results-notifications';
    });

    it('renders the skeleton gate (no rows, no groups) while initialLoading is true', () => {
      resultsNotificationsServiceMock.initialLoading = true;
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [{ share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' }],
        receivedContributionsDone: []
      };
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-notification-item')).toBeNull();
      expect(compiled.querySelectorAll('app-skeleton-notification-item').length).toBeGreaterThan(0);
    });

    it('renders rows (not the skeleton gate) once initialLoading is false', () => {
      resultsNotificationsServiceMock.initialLoading = false;
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [{ share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' }],
        receivedContributionsDone: []
      };
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('app-notification-item')).toBeTruthy();
    });

    it('shows a trailing "Loading history…" row while historyLoading is true', () => {
      resultsNotificationsServiceMock.initialLoading = false;
      resultsNotificationsServiceMock.historyLoading = true;
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading history…');
    });

    it('does not show the "Loading history…" row when historyLoading is false', () => {
      resultsNotificationsServiceMock.historyLoading = false;
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Loading history…');
    });

    // Falsifier (a): all hasMore=false and the button is rendered -> fail.
    it('falsifier (a): does not render "Load more" when every source is exhausted (hasMore=false)', () => {
      resultsNotificationsServiceMock.hasMore = false;
      fixture.detectChanges();

      expect(getLoadMoreButton()).toBeUndefined();
    });

    // Falsifier (b): any hasMore=true and the button is absent -> fail.
    it('falsifier (b): renders "Load more" when at least one source still has more (hasMore=true)', () => {
      resultsNotificationsServiceMock.hasMore = true;
      fixture.detectChanges();

      expect(getLoadMoreButton()).toBeTruthy();
    });

    it('"Load more" is not shown during the initial skeleton gate even if hasMore is already true', () => {
      resultsNotificationsServiceMock.initialLoading = true;
      resultsNotificationsServiceMock.hasMore = true;
      fixture.detectChanges();

      expect(getLoadMoreButton()).toBeUndefined();
    });

    it('clicking "Load more" delegates to the service', () => {
      resultsNotificationsServiceMock.hasMore = true;
      fixture.detectChanges();

      getLoadMoreButton()!.click();

      expect(resultsNotificationsServiceMock.loadMore).toHaveBeenCalled();
    });

    // Falsifier (c): loading -> button not disabled or no aria-busy -> fail.
    it('falsifier (c): "Load more" is disabled and aria-busy while loadingMore is true', () => {
      resultsNotificationsServiceMock.hasMore = true;
      resultsNotificationsServiceMock.loadingMore = true;
      fixture.detectChanges();

      const button = getLoadMoreButton()!;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('"Load more" is enabled and not aria-busy while loadingMore is false', () => {
      resultsNotificationsServiceMock.hasMore = true;
      resultsNotificationsServiceMock.loadingMore = false;
      fixture.detectChanges();

      const button = getLoadMoreButton()!;
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-busy')).toBe('false');
    });

    // Falsifier (d): filter active + hasMore -> hint absent fails; no filter -> hint present fails.
    it('falsifier (d): shows the filtered-scope hint when a filter is active and hasMore is true', () => {
      resultsNotificationsServiceMock.hasMore = true;
      resultsNotificationsServiceMock.centerIdsFilter = [10];
      fixture.detectChanges();

      expect(component.showFilteredHistoryHint).toBe(true);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Filters apply to loaded notifications. Load more to include older ones.'
      );
    });

    it('falsifier (d): shows the filtered-scope hint when the search box is active (no filter chip) and hasMore is true', () => {
      resultsNotificationsServiceMock.hasMore = true;
      resultsNotificationsServiceMock.searchFilter = 'foo';
      fixture.detectChanges();

      expect(component.showFilteredHistoryHint).toBe(true);
    });

    it('falsifier (d): hides the hint when NO filter/search is active, even if hasMore is true', () => {
      resultsNotificationsServiceMock.hasMore = true;
      fixture.detectChanges();

      expect(component.showFilteredHistoryHint).toBe(false);
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Filters apply to loaded notifications');
    });

    it('falsifier (d): hides the hint when a filter is active but every source is exhausted (hasMore=false)', () => {
      resultsNotificationsServiceMock.hasMore = false;
      resultsNotificationsServiceMock.centerIdsFilter = [10];
      fixture.detectChanges();

      expect(component.showFilteredHistoryHint).toBe(false);
    });

    // Falsifier (e): calling groupedTabList twice with unchanged inputs must not invoke the pipes
    // twice; changing a filter must recompute.
    describe('identity-keyed memoization (PAGE-R-11, PAGE-DD-8)', () => {
      beforeEach(() => {
        resultsNotificationsServiceMock.receivedData = {
          receivedContributionsPending: [{ share_result_request_id: 1, request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' }],
          receivedContributionsDone: []
        };
      });

      it('falsifier (e): calling groupedTabList twice with unchanged inputs does not re-invoke the recency pipe', () => {
        const transformSpy = jest.spyOn((component as any).groupByRecencyPipe, 'transform');

        component.groupedTabList;
        component.groupedTabList;

        expect(transformSpy).toHaveBeenCalledTimes(1);
      });

      it('falsifier (e): calling groupedTabList twice with unchanged inputs does not re-invoke the filter pipes either', () => {
        const searchSpy = jest.spyOn((component as any).filterBySearchPipe, 'transform');

        component.groupedTabList;
        component.groupedTabList;

        expect(searchSpy).toHaveBeenCalledTimes(1);
      });

      it('falsifier (e): changing a filter (searchFilter) DOES recompute on the next read', () => {
        const transformSpy = jest.spyOn((component as any).groupByRecencyPipe, 'transform');

        component.groupedTabList;
        resultsNotificationsServiceMock.searchFilter = 'changed';
        component.groupedTabList;

        expect(transformSpy).toHaveBeenCalledTimes(2);
      });

      it('falsifier (e): changing the active tab DOES recompute on the next read', () => {
        const transformSpy = jest.spyOn((component as any).groupByRecencyPipe, 'transform');

        component.groupedTabList;
        component.setActiveTab('decision');
        component.groupedTabList;

        expect(transformSpy).toHaveBeenCalledTimes(2);
      });

      it('falsifier (e): a NEW history array reference (an appended Load-more page) DOES recompute on the next read', () => {
        const transformSpy = jest.spyOn((component as any).groupByRecencyPipe, 'transform');

        component.groupedTabList;
        resultsNotificationsServiceMock.receivedData = {
          ...resultsNotificationsServiceMock.receivedData,
          receivedContributionsDone: [{ share_result_request_id: 2, request_status_id: 2, requested_date: '2026-09-01T09:00:00Z' }]
        };
        component.groupedTabList;

        expect(transformSpy).toHaveBeenCalledTimes(2);
      });

      it('reading unifiedList/filteredUnifiedList/sourceScopedList/tabFilteredList/groupedTabList in the same tick shares one recomputation', () => {
        const transformSpy = jest.spyOn((component as any).groupByRecencyPipe, 'transform');

        component.unifiedList;
        component.filteredUnifiedList;
        component.sourceScopedList;
        component.tabFilteredList;
        component.groupedTabList;

        expect(transformSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
  // @akili-spec notifications/bell-quick-inbox (BELL-T-5, BELL-DD-4, BELL-R-6/R-7, BELL-AC-4/AC-6):
  // the inbox reads `request` + `action`, hands `autoAction` to the ONE matching row, and clears both
  // params once the row consumed them. jsdom proves the wiring only - that the real drawer/dialog/
  // global modal opens after a real route transition is BELL-T-6 manual pass.
  describe('BELL-T-5 - deep link request + action', () => {
    const pendingRow = (id: number) => ({
      share_result_request_id: id,
      request_status_id: 1,
      requested_date: '2026-09-29T09:00:00Z'
    });

    const rowEls = () => fixture.debugElement.queryAll(By.css('app-notification-item'));

    beforeEach(() => {
      routerMock.url = '/result/results-outlet/results-notifications';
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [pendingRow(76), pendingRow(77)],
        receivedContributionsDone: []
      };
    });

    it('?request=77&action=accept with rows [76, 77] -> only row 77 receives autoAction="accept"', () => {
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '77', action: 'accept' };

      component.ngOnInit();
      fixture.detectChanges();

      const els = rowEls();
      expect(els.length).toBe(2);
      expect(els.map(el => el.properties['autoAction'] ?? null)).toEqual([null, 'accept']);
    });

    it('action=decline is passed as "decline" to the matching row', () => {
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '76', action: 'decline' };

      component.ngOnInit();
      fixture.detectChanges();

      expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual(['decline', null]);
    });

    it('unknown id ?request=999 -> no row receives autoAction and nothing throws', () => {
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '999', action: 'accept' };

      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();

      expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, null]);
    });

    it('an invalid action value is ignored (no row receives anything)', () => {
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '77', action: 'explode' };

      component.ngOnInit();
      fixture.detectChanges();

      expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, null]);
    });

    it('an Updates row sharing the numeric id 77 never receives the request autoAction (id spaces collide)', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [pendingRow(76)], receivedContributionsDone: [] };
      resultsNotificationsServiceMock.updatesData = {
        notificationAnnouncements: [],
        notificationsPending: [{ notification_id: 77, read: false, created_date: '2026-09-29T09:00:00Z', obj_notification_type: { name: 'x' } }],
        notificationsViewed: []
      };
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '77', action: 'accept' };

      component.ngOnInit();

      const updateRow = component.sourceScopedList.find((item: any) => item.origin === 'update');
      expect(updateRow).toBeDefined();
      expect(component.autoActionFor(updateRow as any)).toBeNull();
    });

    it('resets program, search and every facet filter so the row is not hidden, and forces the Received view', () => {
      resultsNotificationsServiceMock.resetFilters.mockImplementation(() => {
        resultsNotificationsServiceMock.initiativeIdFilter = null;
        resultsNotificationsServiceMock.searchFilter = null;
        resultsNotificationsServiceMock.centerIdsFilter = [];
        resultsNotificationsServiceMock.bilateralProjectIdsFilter = [];
        resultsNotificationsServiceMock.typeFilter = [];
        resultsNotificationsServiceMock.fundingFilter = [];
        resultsNotificationsServiceMock.resultTypeFilter = [];
      });
      resultsNotificationsServiceMock.initiativeIdFilter = 5;
      resultsNotificationsServiceMock.searchFilter = 'zzz';
      resultsNotificationsServiceMock.centerIdsFilter = [1];
      resultsNotificationsServiceMock.typeFilter = ['Contribution request'];
      component.activeSource.set('sent');
      component.activeTab.set('info');
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '77', action: 'accept', init: '5', search: 'zzz' };

      component.ngOnInit();

      expect(resultsNotificationsServiceMock.phaseFilter).toBe('30');
      expect(resultsNotificationsServiceMock.initiativeIdFilter).toBeNull();
      expect(resultsNotificationsServiceMock.searchFilter).toBeNull();
      expect(resultsNotificationsServiceMock.centerIdsFilter).toEqual([]);
      expect(resultsNotificationsServiceMock.typeFilter).toEqual([]);
      expect(component.activeSource()).toBe('received');
      expect(component.activeTab()).toBe('all');
    });

    it('without `request`, init/search/phase behave exactly as before and nothing is reset or forced', () => {
      resultsNotificationsServiceMock.resetFilters.mockClear();
      component.activeSource.set('sent');
      activatedRouteMock.snapshot.queryParams = { phase: '30', init: '5', search: 'abc' };

      component.ngOnInit();
      fixture.detectChanges();

      expect(resultsNotificationsServiceMock.phaseFilter).toBe('30');
      expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('5');
      expect(resultsNotificationsServiceMock.searchFilter).toBe('abc');
      expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
      expect(component.activeSource()).toBe('sent');
    });

    it('autoActionConsumed -> router.navigate clears request/action with replaceUrl, and no row keeps autoAction', () => {
      activatedRouteMock.snapshot.queryParams = { phase: '30', request: '77', action: 'accept' };
      component.ngOnInit();
      fixture.detectChanges();

      rowEls()[1].triggerEventHandler('autoActionConsumed', undefined);
      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledTimes(1);
      const [commands, extras] = routerMock.navigate.mock.calls[0];
      expect(commands).toEqual([]);
      expect(extras.queryParams).toEqual({ request: null, action: null });
      expect(extras.queryParamsHandling).toBe('merge');
      expect(extras.replaceUrl).toBe(true);
      expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, null]);
    });

    // BELL-T-6 D-1 (attempt 2): the user is ALREADY on the inbox when the bell hands off, so the params
    // change on the same route after init. Every test here initializes FIRST, then changes the params.
    describe('hand-off while the inbox is already open (D-1)', () => {
      const emitQueryParams = (params: Record<string, string>) => {
        activatedRouteMock.snapshot.queryParams = params;
        queryParamMap$.next(convertToParamMap(params));
        fixture.detectChanges();
      };

      const initOnPhase36 = () => {
        activatedRouteMock.snapshot.queryParams = { phase: '36' };
        queryParamMap$.next(convertToParamMap({ phase: '36' }));
        // the first detectChanges() runs ngOnInit() exactly once, like the real page
        fixture.detectChanges();
        resultsNotificationsServiceMock.resetFilters.mockClear();
        resultsNotificationsServiceMock.onPhaseChange.mockClear();
      };

      it('?phase=36 open, then request=77&action=accept arrives -> row 77 gets autoAction, filters reset, Received/All forced', () => {
        initOnPhase36();
        component.activeSource.set('sent');
        component.activeTab.set('info');
        expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, null]);

        emitQueryParams({ phase: '36', request: '77', action: 'accept' });

        expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalledTimes(1);
        expect(component.activeSource()).toBe('received');
        expect(component.activeTab()).toBe('all');
        expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, 'accept']);
      });

      it('after the row consumes it, request/action are cleared with replaceUrl, and the clearing emission does not re-arm', () => {
        initOnPhase36();
        emitQueryParams({ phase: '36', request: '77', action: 'accept' });

        rowEls()[1].triggerEventHandler('autoActionConsumed', undefined);
        expect(routerMock.navigate).toHaveBeenCalledTimes(1);
        const [commands, extras] = routerMock.navigate.mock.calls[0];
        expect(commands).toEqual([]);
        expect(extras.queryParams).toEqual({ request: null, action: null });
        expect(extras.replaceUrl).toBe(true);

        // the router now reports the cleared params: must be ignored (no reset, no new pending action)
        resultsNotificationsServiceMock.resetFilters.mockClear();
        emitQueryParams({ phase: '36' });

        expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
        expect(component.pendingAutoAction()).toBeNull();
        expect(rowEls().map(el => el.properties['autoAction'] ?? null)).toEqual([null, null]);
      });

      it('a different phase in the hand-off loads that phase; the same phase does not reload', () => {
        initOnPhase36();
        resultsNotificationsServiceMock.phaseFilter = '36';

        emitQueryParams({ phase: '36', request: '77', action: 'accept' });
        expect(resultsNotificationsServiceMock.onPhaseChange).not.toHaveBeenCalled();

        emitQueryParams({ phase: '30', request: '76', action: 'decline' });
        expect(resultsNotificationsServiceMock.phaseFilter).toBe('30');
        expect(resultsNotificationsServiceMock.onPhaseChange).toHaveBeenCalledTimes(1);
        expect(resultsNotificationsServiceMock.onPhaseChange).toHaveBeenCalledWith('30');
        expect(component.pendingAutoAction()).toEqual({ requestId: '76', action: 'decline' });
      });

      it('an invalid action, or a change without `request`, is ignored (no reset, nothing armed)', () => {
        initOnPhase36();

        emitQueryParams({ phase: '36', request: '77', action: 'explode' });
        emitQueryParams({ phase: '36', init: '5', search: 'abc' });

        expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
        expect(component.pendingAutoAction()).toBeNull();
      });

      it('the subscription is torn down with the component (no handler after destroy)', () => {
        initOnPhase36();
        fixture.destroy();
        resultsNotificationsServiceMock.resetFilters.mockClear();

        queryParamMap$.next(convertToParamMap({ phase: '36', request: '77', action: 'accept' }));

        expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
        expect(component.pendingAutoAction()).toBeNull();
      });
    });
  });
});
