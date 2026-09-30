import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterModule } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture;
  let apiServiceMock: any;
  let shareRequestModalServiceMock: any;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;
  let routerEvents$: Subject<any>;

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
      markAllUpdatesNotificationsAsRead: jest.fn(),
      resetNotificationInformation: jest.fn(),
      resetFilters: jest.fn(),
      getAllPhases: jest.fn(),
      onPhaseChange: jest.fn(),
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
      updatesData: { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] }
    };

    routerEvents$ = new Subject<any>();

    routerMock = {
      navigate: jest.fn(),
      url: '/result/results-outlet/results-notifications',
      events: routerEvents$.asObservable()
    };

    activatedRouteMock = {
      snapshot: {
        queryParams: {}
      }
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
  });

  // The fallback: when getAllPhases() resolves NO phase at all (rare — e.g. before the active
  // reporting phase is known), the callback passed by ngOnInit is the only remaining way the page
  // gets any data, so it must still fetch the three feeds itself.
  it('falls back to fetching Received, Sent and Updates directly when getAllPhases() resolves no phase', () => {
    component.ngOnInit();
    const onPhaseUnresolved = resultsNotificationsServiceMock.getAllPhases.mock.calls[0][0];

    onPhaseUnresolved();

    expect(resultsNotificationsServiceMock.get_section_information).toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_sent_notifications).toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_updates_notifications).toHaveBeenCalled();
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

    const getTriggerButton = () => (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
    const getPanel = () => (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement | null;

    it('toggles the popover open state', () => {
      expect(component.filterPopoverOpen()).toBe(false);
      component.toggleFilterPopover();
      expect(component.filterPopoverOpen()).toBe(true);
      component.toggleFilterPopover();
      expect(component.filterPopoverOpen()).toBe(false);
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

    it('renders the Filter trigger button and toggles a real @if-rendered panel into the DOM', () => {
      routerMock.url = '/result/results-outlet/results-notifications';
      fixture.detectChanges();

      expect(getPanel()).toBeNull();
      getTriggerButton().click();
      fixture.detectChanges();

      expect(getPanel()).toBeTruthy();
      expect(getTriggerButton().getAttribute('aria-expanded')).toBe('true');
    });

    it('clicking outside the panel closes it; clicking inside it (a checkbox) does not', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [bilateralRow()], receivedContributionsDone: [] };
      routerMock.url = '/result/results-outlet/results-notifications';
      fixture.detectChanges();
      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      const checkbox = getPanel()!.querySelector('hlm-checkbox') as HTMLElement;
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(component.filterPopoverOpen()).toBe(false);
      expect(getPanel()).toBeNull();
    });

    it('pressing Escape closes the panel', () => {
      routerMock.url = '/result/results-outlet/results-notifications';
      fixture.detectChanges();
      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(component.filterPopoverOpen()).toBe(false);
      expect(getPanel()).toBeNull();
    });

    it('never renders the Filter popover trigger on the settings route', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      fixture.detectChanges();
      expect(getTriggerButton()).toBeFalsy();
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

    it('renders "Mark all as read" only when there is at least one unread Update, and it delegates to the service', () => {
      resultsNotificationsServiceMock.updatesData = {
        notificationAnnouncements: [],
        notificationsPending: [{ notification_id: 1 }],
        notificationsViewed: []
      };
      fixture.detectChanges();

      const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
        b.textContent?.includes('Mark all as read')
      ) as HTMLButtonElement;
      expect(button).toBeTruthy();

      button.click();
      expect(resultsNotificationsServiceMock.markAllUpdatesNotificationsAsRead).toHaveBeenCalled();
    });

    it('does not render "Mark all as read" when there is nothing pending', () => {
      resultsNotificationsServiceMock.updatesData = { notificationAnnouncements: [], notificationsPending: [], notificationsViewed: [] };
      fixture.detectChanges();

      const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
        b.textContent?.includes('Mark all as read')
      );
      expect(button).toBeFalsy();
    });
  });
});
