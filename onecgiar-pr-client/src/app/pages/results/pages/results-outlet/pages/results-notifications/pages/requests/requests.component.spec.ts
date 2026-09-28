import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { RequestsComponent } from './requests.component';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

describe('RequestsComponent', () => {
  let component: RequestsComponent;
  let fixture: ComponentFixture<RequestsComponent>;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;
  let apiServiceMock: any;

  beforeEach(async () => {
    resultsNotificationsServiceMock = {
      get_updates_notifications: jest.fn(),
      get_section_information: jest.fn(),
      get_sent_notifications: jest.fn(),
      resetFilters: jest.fn(),
      // NOTIF-T-11 (rework attempt 2): phaseList/filteredInitiatives/entityLabel and
      // getAllPhases/onPhaseChange are now owned by the (real) ResultsNotificationsService — this
      // spec mocks the service, so it mocks these too.
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
      sentData: { sentContributionsPending: [], sentContributionsDone: [] }
    };

    routerMock = {
      url: '',
      navigate: jest.fn(),
      events: of(),
      createUrlTree: jest.fn().mockReturnValue({}),
      // The relocated "Notification settings" button (NOTIF-T-11) adds a real `routerLink`, whose
      // `RouterLink` directive computes an `href` via `serializeUrl` on render — needed once these
      // specs call `fixture.detectChanges()` (the pre-relocation suite never rendered the template).
      serializeUrl: jest.fn().mockReturnValue('')
    };

    apiServiceMock = {
      rolesSE: { isAdmin: true },
      dataControlSE: { myInitiativesList: [], reportingCurrentPhase: null },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [RequestsComponent],
      imports: [HttpClientTestingModule, RouterModule],
      providers: [
        RequestsComponent,
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ApiService, useValue: apiServiceMock }
      ],
      // The template renders real Spartan/custom-fields elements (hlm-popover, app-pr-select,
      // hlm-checkbox, ...) that this lean unit-test module doesn't declare/import — NO_ERRORS_SCHEMA
      // lets them render as opaque tags (same pattern the pre-relocation spec used for this popover
      // cluster in results-notifications.component.spec.ts).
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call resetFilters if initiativeIdFilter is not null', () => {
    routerMock.url = '/some-url';
    resultsNotificationsServiceMock.initiativeIdFilter = 1;
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should call resetFilters if searchFilter is not null', () => {
    routerMock.url = '/some-url';
    resultsNotificationsServiceMock.searchFilter = 'search';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  // NOTIF-T-11 (rework attempt 2): phaseList/filteredInitiatives/entityLabel and
  // getAllPhases/onPhaseChange/filterInitiativesByPhase moved to ResultsNotificationsService (single
  // owner, shared with ResultsNotificationsComponent — the real fetch/derivation logic these tests
  // used to exercise here is now tested against the real service in
  // results-notifications.service.spec.ts; the cross-component sharing behavior this fixes is
  // covered in results-notifications.component.spec.ts's "Cross-component Phase/Program state
  // sharing" suite). These tests assert the relocation itself: this component no longer owns any of
  // that state or those methods.
  //
  // NOTIF-T-11 (rework attempt 3, Reviewer FAIL #1): this component no longer implements `OnInit`
  // at all and never calls `getAllPhases()` — the previous "ngOnInit delegates the phase fetch"
  // test is REMOVED (it asserted the opposite of the fixed behavior). Only
  // `ResultsNotificationsComponent.ngOnInit()` (the always-mounted parent) calls `getAllPhases()` —
  // see that component's own spec for the fetch-count trace.
  describe('Phase/Program state — relocated to ResultsNotificationsService (NOTIF-T-11 attempt 2)', () => {
    it('does NOT implement ngOnInit — the redundant getAllPhases() delegation was removed entirely (NOTIF-T-11 attempt 3)', () => {
      expect((component as any).ngOnInit).toBeUndefined();
      expect(resultsNotificationsServiceMock.getAllPhases).not.toHaveBeenCalled();
    });

    it('no longer owns its own Phase/Program state or methods', () => {
      expect((component as any).phaseList).toBeUndefined();
      expect((component as any).filteredInitiatives).toBeUndefined();
      expect((component as any).entityLabel).toBeUndefined();
      expect((component as any).getAllPhases).toBeUndefined();
      expect((component as any).onPhaseChange).toBeUndefined();
      expect((component as any).filterInitiativesByPhase).toBeUndefined();
    });
  });

  // NOTIF-T-6 (relocated by NOTIF-T-11) — Filter popover (Phase + Program + Center + Bilateral project)
  describe('Filter popover', () => {
    const bilateralRow = (overrides: Record<string, unknown> = {}) => ({
      obj_result: {
        source_name: 'W3/Bilaterals',
        // NOTIF-T-16: the true bilateral PROJECT identifier — `clarisa_projects.short_name`/
        // `.full_name` — joined via `results_by_projects` (`obj_result_by_project[].obj_clarisa_project`),
        // NOT `obj_result.result_code`/`.title` (the RESULT's own identifier).
        obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'Bilateral result one' } }],
        result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10, acronym: 'CTR' } } }],
        ...overrides
      }
    });

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

    it('derives Bilateral-project facet options from bilateral rows only, keyed on clarisa_projects.short_name/full_name — a non-bilateral row carrying obj_result_by_project must not leak in', () => {
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

    it('checking a Bilateral-project facet adds exactly one chip', () => {
      resultsNotificationsServiceMock.sentData = { sentContributionsPending: [bilateralRow()], sentContributionsDone: [] };

      component.onBilateralProjectFilterChange('BIL-1', true);

      expect(resultsNotificationsServiceMock.bilateralProjectIdsFilter).toEqual(['BIL-1']);
      expect(component.isBilateralProjectFilterChecked('BIL-1')).toBe(true);
      expect(component.activeFilterChips).toEqual([{ type: 'bilateral', id: 'BIL-1', label: 'BIL-1 - Bilateral result one' }]);
    });

    it('removing a Bilateral-project chip clears the filter', () => {
      resultsNotificationsServiceMock.sentData = { sentContributionsPending: [bilateralRow()], sentContributionsDone: [] };
      resultsNotificationsServiceMock.bilateralProjectIdsFilter = ['BIL-1'];

      component.removeFilterChip({ type: 'bilateral', id: 'BIL-1', label: 'BIL-1 - Bilateral result one' });

      expect(resultsNotificationsServiceMock.bilateralProjectIdsFilter).toEqual([]);
    });

    it('includes the Program facet in the active-filter count and chips, and "Clear all" resets every facet including the two new ones', () => {
      resultsNotificationsServiceMock.initiativeIdFilter = '5';
      resultsNotificationsServiceMock.filteredInitiatives = [{ initiative_id: '5', full_name: 'My Initiative' }];
      resultsNotificationsServiceMock.centerIdsFilter = [10];
      resultsNotificationsServiceMock.bilateralProjectIdsFilter = ['BIL-1'];

      expect(component.activeFilterCount).toBe(3);
      expect(component.activeFilterChips).toEqual(expect.arrayContaining([{ type: 'program', id: '5', label: 'My Initiative' }]));

      component.clearAllFilters();

      // NOTIF-AC-4: clearAllFilters delegates the facet reset to resetFilters() (single source of
      // truth, service-owned per NOTIF-T-6's "Where the new filter STATE lives") — asserting the
      // delegation here, the reset itself is covered by ResultsNotificationsService's own spec.
      expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
      expect(resultsNotificationsServiceMock.phaseFilter).toBeNull();
      // NOTIF-T-11 (rework attempt 2): entityLabel/filteredInitiatives are now service state too —
      // clearAllFilters resets them on the SAME object ResultsNotificationsComponent reads from.
      expect(resultsNotificationsServiceMock.entityLabel).toBe('Entity');
      expect(resultsNotificationsServiceMock.filteredInitiatives).toEqual([]);
    });
  });

  // NOTIF-T-15: per-facet search inputs above the Center / Bilateral-project checkbox lists.
  describe('Facet search — Center and Bilateral project (NOTIF-T-15)', () => {
    const twoCentersRows = () => [
      {
        obj_result: {
          source_name: 'W3/Bilaterals',
          obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'First bilateral' } }],
          result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10, acronym: 'Alpha Center' } } }]
        }
      },
      {
        obj_result: {
          source_name: 'W3/Bilaterals',
          obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-2', fullName: 'Second bilateral' } }],
          result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 20, acronym: 'Beta Center' } } }]
        }
      }
    ];

    beforeEach(() => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: twoCentersRows(), receivedContributionsDone: [] };
    });

    it('narrows filteredCenterFacetOptions to labels matching the query, case-insensitively', () => {
      expect(component.filteredCenterFacetOptions).toHaveLength(2);

      component.centerSearchQuery.set('alpha');

      expect(component.filteredCenterFacetOptions).toEqual([{ id: 10, label: 'Alpha Center' }]);
    });

    it('narrows filteredBilateralProjectFacetOptions to labels matching the query, case-insensitively', () => {
      expect(component.filteredBilateralProjectFacetOptions).toHaveLength(2);

      component.bilateralProjectSearchQuery.set('second');

      expect(component.filteredBilateralProjectFacetOptions).toEqual([{ code: 'BIL-2', label: 'BIL-2 - Second bilateral' }]);
    });

    it('renders only the matching Center checkboxes once a search query narrows the list', () => {
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      component.centerSearchQuery.set('beta');
      fixture.detectChanges();

      const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement;
      expect(panel.textContent).toContain('Beta Center');
      expect(panel.textContent).not.toContain('Alpha Center');
    });

    it('renders only the matching Bilateral-project checkboxes once a search query narrows the list', () => {
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      component.bilateralProjectSearchQuery.set('first');
      fixture.detectChanges();

      const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement;
      expect(panel.textContent).toContain('BIL-1 - First bilateral');
      expect(panel.textContent).not.toContain('BIL-2 - Second bilateral');
    });

    it('shows "Nothing matches that search." (not the "no options at all" message) when the query excludes every Center option', () => {
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      component.centerSearchQuery.set('no-such-center');
      fixture.detectChanges();

      const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement;
      expect(panel.textContent).toContain('Nothing matches that search.');
      expect(panel.textContent).not.toContain('No centers available yet.');
    });

    it('shows "No centers available yet." when there are genuinely no Center options at all (no search typed)', () => {
      resultsNotificationsServiceMock.receivedData = { receivedContributionsPending: [], receivedContributionsDone: [] };
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement;
      expect(panel.textContent).toContain('No centers available yet.');
      expect(panel.textContent).not.toContain('Nothing matches that search.');
    });

    it('shows "Nothing matches that search." (not the "no options at all" message) when the query excludes every Bilateral-project option', () => {
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      component.bilateralProjectSearchQuery.set('no-such-project');
      fixture.detectChanges();

      const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement;
      expect(panel.textContent).toContain('Nothing matches that search.');
      expect(panel.textContent).not.toContain('No bilateral projects available yet.');
    });

    it('checking a Center checkbox while narrowed by search still updates centerIdsFilter with the right id', () => {
      component.centerSearchQuery.set('beta');

      component.onCenterFilterChange(20, true);

      expect(resultsNotificationsServiceMock.centerIdsFilter).toEqual([20]);
      expect(component.isCenterFilterChecked(20)).toBe(true);
      expect(component.isCenterFilterChecked(10)).toBe(false);
    });

    it('checking a Bilateral-project checkbox while narrowed by search still updates bilateralProjectIdsFilter with the right code', () => {
      component.bilateralProjectSearchQuery.set('first');

      component.onBilateralProjectFilterChange('BIL-1', true);

      expect(resultsNotificationsServiceMock.bilateralProjectIdsFilter).toEqual(['BIL-1']);
      expect(component.isBilateralProjectFilterChecked('BIL-1')).toBe(true);
      expect(component.isBilateralProjectFilterChecked('BIL-2')).toBe(false);
    });
  });

  // NOTIF-DD-7: `hlm-popover`/CDK overlay replaced with a plain, self-positioned dropdown — these
  // tests replace the old "Filter popover — width + attachTo (NOTIF-T-9)" describe block, which
  // asserted CDK-specific wiring (`[attachTo]`, `popover.attachTo`) that no longer exists. This is a
  // REAL rendering suite (no NO_ERRORS_SCHEMA opacity to hide behind for this control): the trigger
  // button and, once open, the panel are genuine elements in the DOM, so what's asserted here is
  // what actually happens, not an expression binding.
  describe('Filter dropdown — plain positioned panel (NOTIF-DD-7)', () => {
    const bilateralRow = (overrides: Record<string, unknown> = {}) => ({
      obj_result: {
        source_name: 'W3/Bilaterals',
        // NOTIF-T-16: the true bilateral PROJECT identifier — `clarisa_projects.short_name`/
        // `.full_name` — joined via `results_by_projects` (`obj_result_by_project[].obj_clarisa_project`),
        // NOT `obj_result.result_code`/`.title` (the RESULT's own identifier).
        obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1', fullName: 'Bilateral result one' } }],
        result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10, acronym: 'CTR' } } }],
        ...overrides
      }
    });

    const getTriggerButton = () => (fixture.nativeElement as HTMLElement).querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
    const getPanel = () => (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"][aria-label="Filter"]') as HTMLElement | null;

    it('resolves filterTriggerRef() to the real Filter trigger button', () => {
      fixture.detectChanges();

      const button = getTriggerButton();
      expect(button).toBeTruthy();
      expect(component.filterTriggerRef()?.nativeElement).toBe(button);
    });

    it('does not render the panel while closed, and aria-expanded reflects "false"', () => {
      fixture.detectChanges();

      expect(getPanel()).toBeNull();
      expect(getTriggerButton().getAttribute('aria-expanded')).toBe('false');
    });

    it('clicking the trigger toggles a real @if-rendered panel into the DOM, and aria-expanded flips to "true"', () => {
      fixture.detectChanges();

      getTriggerButton().click();
      fixture.detectChanges();

      expect(getPanel()).toBeTruthy();
      expect(getTriggerButton().getAttribute('aria-expanded')).toBe('true');
      expect(component.filterPanelRef()?.nativeElement).toBe(getPanel());
    });

    it('clicking the trigger again removes the panel from the DOM', () => {
      fixture.detectChanges();

      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeNull();
      expect(getTriggerButton().getAttribute('aria-expanded')).toBe('false');
    });

    it('clicking outside the panel (a click dispatched on document.body) closes it', () => {
      fixture.detectChanges();
      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.filterPopoverOpen()).toBe(false);
      expect(getPanel()).toBeNull();
    });

    it('clicking inside the panel (e.g. a checkbox) does NOT close it', () => {
      resultsNotificationsServiceMock.receivedData = {
        receivedContributionsPending: [bilateralRow()],
        receivedContributionsDone: []
      };
      fixture.detectChanges();
      getTriggerButton().click();
      fixture.detectChanges();

      const checkbox = getPanel()!.querySelector('hlm-checkbox') as HTMLElement;
      expect(checkbox).toBeTruthy();
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.filterPopoverOpen()).toBe(true);
      expect(getPanel()).toBeTruthy();
    });

    it('pressing Escape closes the panel', () => {
      fixture.detectChanges();
      getTriggerButton().click();
      fixture.detectChanges();
      expect(getPanel()).toBeTruthy();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(component.filterPopoverOpen()).toBe(false);
      expect(getPanel()).toBeNull();
    });

    it('a document click while the panel is closed is a no-op (no error, stays closed)', () => {
      fixture.detectChanges();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.filterPopoverOpen()).toBe(false);
    });

    it('applies the "filter-popover--align-end" class when filterPopoverAlign() resolves to "end"', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      fixture.detectChanges();
      jest.spyOn(component.filterTriggerRef()!.nativeElement, 'getBoundingClientRect').mockReturnValue({ left: 300, right: 380 } as DOMRect);

      component.toggleFilterPopover();
      fixture.detectChanges();

      expect(getPanel()!.classList.contains('filter-popover--align-end')).toBe(true);

      jest.restoreAllMocks();
    });

    it('does not apply "filter-popover--align-end" when filterPopoverAlign() resolves to "start"', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      fixture.detectChanges();
      jest.spyOn(component.filterTriggerRef()!.nativeElement, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 236 } as DOMRect);

      component.toggleFilterPopover();
      fixture.detectChanges();

      expect(getPanel()!.classList.contains('filter-popover--align-end')).toBe(false);

      jest.restoreAllMocks();
    });
  });

  // NOTIF-T-12 (defect fix): dynamic align — BrnPopover.getAttachPositions() never generates a
  // horizontal fallback and getPositionStrategy() hard-disables CDK's withPush(false) safety net, so
  // a static align="start" overflows the viewport's right edge on a narrow window. jsdom cannot lay
  // out the real overlay, but the alignment-DECISION is plain component logic driven off a mocked
  // getBoundingClientRect()/window.innerWidth — fully testable here, unlike the actual CSS rendering.
  describe('Filter popover — dynamic align (NOTIF-T-12)', () => {
    const mockTriggerRect = (rect: Partial<DOMRect>) => {
      fixture.detectChanges();
      const nativeElement = component.filterTriggerRef()!.nativeElement;
      jest.spyOn(nativeElement, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('defaults to "start" before the popover has ever opened', () => {
      expect(component.filterPopoverAlign()).toBe('start');
    });

    it('resolves to "start" when there is ample room to the right of the trigger', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      mockTriggerRect({ left: 100, right: 236 } as DOMRect);

      component.toggleFilterPopover();

      expect(component.filterPopoverAlign()).toBe('start');
      expect(component.filterPopoverOpen()).toBe(true);
    });

    it('resolves to "end" when the trigger sits near the right edge of a narrow viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      mockTriggerRect({ left: 300, right: 380 } as DOMRect);

      component.toggleFilterPopover();

      expect(component.filterPopoverAlign()).toBe('end');
      expect(component.filterPopoverOpen()).toBe(true);
    });

    it('recomputes on every closed->open transition, not just once', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      mockTriggerRect({ left: 100, right: 236 } as DOMRect);

      component.toggleFilterPopover(); // open, ample room -> 'start'
      expect(component.filterPopoverAlign()).toBe('start');

      component.toggleFilterPopover(); // close

      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      mockTriggerRect({ left: 300, right: 380 } as DOMRect);

      component.toggleFilterPopover(); // open again, now cramped -> 'end'
      expect(component.filterPopoverAlign()).toBe('end');
    });

    it('does not recompute align on a close transition (stays at whatever it last resolved to)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      mockTriggerRect({ left: 300, right: 380 } as DOMRect);

      component.toggleFilterPopover(); // open, cramped -> 'end'
      expect(component.filterPopoverAlign()).toBe('end');

      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      mockTriggerRect({ left: 100, right: 236 } as DOMRect);

      component.toggleFilterPopover(); // close — must NOT recompute despite the now-ample room
      expect(component.filterPopoverAlign()).toBe('end');
      expect(component.filterPopoverOpen()).toBe(false);
    });

  });
});

// Stand-ins for the real (lazy-loaded) ReceivedRequestsComponent / SentRequestsComponent — this
// suite verifies the router mechanics the segmented-visual restyle (NOTIF-T-4) must not break
// (deep link + active-state), not the sibling components' own business logic.
@Component({ selector: 'app-received-stub', template: 'received-outlet', standalone: true })
class ReceivedStubComponent {}

@Component({ selector: 'app-sent-stub', template: 'sent-outlet', standalone: true })
class SentStubComponent {}

describe('RequestsComponent — deep link + active-state (NOTIF-T-4 falsifier)', () => {
  let harness: RouterTestingHarness;
  let resultsNotificationsServiceMock: any;
  let apiServiceMock: any;

  beforeEach(async () => {
    resultsNotificationsServiceMock = {
      resetFilters: jest.fn(),
      // NOTIF-T-11 (rework attempt 3): ngOnInit no longer calls getAllPhases() (only the parent
      // ResultsNotificationsComponent does) — kept on the mock only so nothing throws if some other
      // code path reaches it; not asserted on in this describe block.
      getAllPhases: jest.fn(),
      receivedData: {},
      sentData: {}
    };

    apiServiceMock = {
      rolesSE: { isAdmin: true },
      dataControlSE: { myInitiativesList: [] },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [RequestsComponent],
      imports: [HttpClientTestingModule, RouterModule],
      providers: [
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        provideRouter([
          {
            path: 'requests',
            component: RequestsComponent,
            children: [
              { path: 'received', component: ReceivedStubComponent },
              { path: 'sent', component: SentStubComponent }
            ]
          }
        ])
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    harness = await RouterTestingHarness.create();
  });

  it('loads the routed component and marks "Sent" active when deep-linking to /requests/sent', async () => {
    await harness.navigateByUrl('/requests/sent', RequestsComponent);
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toEqual('/requests/sent');
    expect(harness.routeNativeElement?.textContent).toContain('sent-outlet');

    const anchors = harness.routeNativeElement?.querySelectorAll('a') ?? [];
    const receivedLink = Array.from(anchors).find(a => a.getAttribute('routerlink') === 'received' || a.getAttribute('ng-reflect-router-link') === 'received');
    const sentLink = Array.from(anchors).find(a => a.getAttribute('routerlink') === 'sent' || a.getAttribute('ng-reflect-router-link') === 'sent');

    expect(sentLink?.getAttribute('data-active')).toBe('');
    expect(receivedLink?.hasAttribute('data-active')).toBe(false);
  });

  it('loads the routed component and marks "Received" active when deep-linking to /requests/received', async () => {
    await harness.navigateByUrl('/requests/received', RequestsComponent);
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toEqual('/requests/received');
    expect(harness.routeNativeElement?.textContent).toContain('received-outlet');

    const anchors = harness.routeNativeElement?.querySelectorAll('a') ?? [];
    const receivedLink = Array.from(anchors).find(a => a.getAttribute('routerlink') === 'received' || a.getAttribute('ng-reflect-router-link') === 'received');
    const sentLink = Array.from(anchors).find(a => a.getAttribute('routerlink') === 'sent' || a.getAttribute('ng-reflect-router-link') === 'sent');

    expect(receivedLink?.getAttribute('data-active')).toBe('');
    expect(sentLink?.hasAttribute('data-active')).toBe(false);
  });
});
