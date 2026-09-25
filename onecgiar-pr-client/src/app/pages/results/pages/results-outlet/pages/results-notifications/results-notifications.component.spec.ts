import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import { RequestsComponent } from './pages/requests/requests.component';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture;
  let apiServiceMock: any;
  let shareRequestModalServiceMock: any;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

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
      resetNotificationInformation: jest.fn(),
      resetFilters: jest.fn(),
      // NOTIF-T-11 (rework attempt 2): phaseList/filteredInitiatives/entityLabel and
      // getAllPhases/onPhaseChange are now owned by the (real) ResultsNotificationsService — this
      // spec mocks the service, so it mocks these too, the same way it already mocked phaseFilter.
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
      navigate: jest.fn(),
      url: '/result/results-outlet/results-notifications/requests'
    };

    activatedRouteMock = {
      snapshot: {
        queryParams: {}
      }
    };

    await TestBed.configureTestingModule({
      declarations: [ResultsNotificationsComponent],
      // CommonModule: the template's `*ngIf` (settings/requests/updates description gating, and
      // the `.notifications_filters` container itself) is the real `NgIf` structural directive —
      // it must be present for the new branch-scoping specs below to render anything at all.
      imports: [RouterOutlet, CommonModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ShareRequestModalService, useValue: shareRequestModalServiceMock },
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ],
      // NOTIF-T-6 rework attempt 2: the new branch-scoping specs below are the first in this file
      // to render the template (fixture.detectChanges()) — NO_ERRORS_SCHEMA lets the template's
      // real custom elements (hlm-popover, app-pr-select, hlm-checkbox, app-pr-button, ...), which
      // this spec never declares/imports, render as opaque tags instead of failing on unknown
      // element/property errors. Every prior test in this file only calls component methods
      // directly and never triggers change detection, so this schema does not affect them.
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

    // NOTIF-T-11 (rework attempt 2): getAllPhases now lives on the service — ngOnInit delegates.
    expect(resultsNotificationsServiceMock.getAllPhases).toHaveBeenCalled();
    expect(shareRequestModalServiceMock.inNotifications).toBe(true);
    expect(resultsNotificationsServiceMock.phaseFilter).toBe('somePhase');
    expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('someInit');
    expect(resultsNotificationsServiceMock.searchFilter).toBe('someSearch');
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

  describe('notificationsInfoTooltip — ⓘ tooltip content, replacing the old always-visible paragraph', () => {
    it('returns the Requests-tab copy when on the requests route', () => {
      routerMock.url = '/result/results-outlet/results-notifications/requests';
      expect(component.notificationsInfoTooltip).toContain('collaboration requests received from other Programs/Accelerators');
    });

    it('returns the Updates-tab copy when on the updates route', () => {
      routerMock.url = '/result/results-outlet/results-notifications/updates';
      expect(component.notificationsInfoTooltip).toBe('In this section, there are updates on any results to which your entity(ies) are contributing.');
    });

    it('returns empty on any other route (e.g. Settings), matching the paragraph it replaced', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      expect(component.notificationsInfoTooltip).toBe('');
    });

    it('does not render the ⓘ trigger button on Settings (Reviewer finding: the getter alone is not enough — the button is @if-gated on it)', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sgi-dac-info')).toBeNull();
    });

    it('renders the ⓘ trigger button on Requests', () => {
      routerMock.url = '/result/results-outlet/results-notifications/requests';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sgi-dac-info')).not.toBeNull();
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

  // NOTIF-T-11 (rework attempt 2): phaseList/filteredInitiatives/entityLabel and
  // getAllPhases/onPhaseChange/filterInitiativesByPhase moved to ResultsNotificationsService — the
  // real fetch/derivation logic they used to test here is now tested against the real service in
  // results-notifications.service.spec.ts. These tests assert the relocation itself: this component
  // no longer owns any of that state or those methods, and ngOnInit delegates instead of doing the
  // fetch itself.
  describe('Phase/Program state — relocated to ResultsNotificationsService (NOTIF-T-11 attempt 2)', () => {
    it('no longer owns its own Phase/Program state or methods', () => {
      expect((component as any).phaseList).toBeUndefined();
      expect((component as any).filteredInitiatives).toBeUndefined();
      expect((component as any).entityLabel).toBeUndefined();
      expect((component as any).getAllPhases).toBeUndefined();
      expect((component as any).onPhaseChange).toBeUndefined();
      expect((component as any).filterInitiativesByPhase).toBeUndefined();
    });

    it('ngOnInit delegates the phase fetch to resultsNotificationsSE.getAllPhases()', () => {
      component.ngOnInit();
      expect(resultsNotificationsServiceMock.getAllPhases).toHaveBeenCalled();
    });
  });

  // NOTIF-T-11: the Filter popover cluster (state, methods, and markup) that NOTIF-T-6/NOTIF-T-9
  // built here was relocated wholesale to `RequestsComponent` — see
  // `pages/requests/requests.component.spec.ts` for the relocated "Filter popover" /
  // "Filter popover — width + attachTo" coverage (now expanded there, unchanged in substance).
  // These two tests assert the relocation is COMPLETE and honest: the component no longer exposes
  // any of that state/those methods, and its own template (Updates-only, `router.url` gated) never
  // renders the popover — both would have caught a "left half-moved" defect.
  describe('Filter popover — relocated to RequestsComponent (NOTIF-T-11)', () => {
    it('no longer exposes the Filter popover state/methods that used to live here', () => {
      expect((component as any).filterPopoverOpen).toBeUndefined();
      expect((component as any).filterTriggerRef).toBeUndefined();
      expect((component as any).toggleFilterPopover).toBeUndefined();
      expect((component as any).onFilterPopoverStateChanged).toBeUndefined();
      expect((component as any).centerFacetOptions).toBeUndefined();
      expect((component as any).bilateralProjectFacetOptions).toBeUndefined();
      expect((component as any).activeFilterCount).toBeUndefined();
      expect((component as any).activeFilterChips).toBeUndefined();
      expect((component as any).removeFilterChip).toBeUndefined();
    });

    it('never renders the Filter popover on the Requests tab — its row now lives in RequestsComponent', () => {
      routerMock.url = '/result/results-outlet/results-notifications/requests';
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('hlm-popover')).toBeFalsy();
    });

    it('never renders the Filter popover on the Updates tab either', () => {
      routerMock.url = '/result/results-outlet/results-notifications/updates';
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('hlm-popover')).toBeFalsy();
    });
  });

  // NOTIF-AC-5: Updates' own Phase/Program/Search/Clear-filters row must render unaffected by the
  // relocation. NOTIF-T-11 simplified the parent template's gating — the old
  // `@if (requests) {...} @else {...}` split no longer makes sense with the Requests branch gone,
  // so the container now renders ONLY when `router.url` is the Updates tab (unconditional single
  // branch, no `@if`/`@else`).
  describe('Updates filter row — unaffected by the relocation (NOTIF-AC-5)', () => {
    it('renders Phase/Program/Search/Clear-filters on the Updates tab', () => {
      routerMock.url = '/result/results-outlet/results-notifications/updates';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear_filters_container')).toBeTruthy();
      expect(compiled.querySelector('input[hlmInput]')).toBeTruthy();
    });

    // Restored (NOTIF-T-11 rework attempt 2), FIXED (attempt 3, Reviewer finding #3): NOTIF-T-6
    // attempt 3 added a compareDocumentPosition assertion to catch a silent element-reordering
    // regression on the Updates row; attempt 2's version destructured `.children` in INDEX order,
    // which is a tautology (`.children` is document order by definition — those assertions can never
    // fail regardless of actual element identity/order). Fixed here by selecting each node by
    // IDENTITY, then asserting compareDocumentPosition BETWEEN the identified nodes, so swapping any
    // pair actually fails the test:
    // - Phase select: `app-pr-select[label="Phases"]` — a plain (non-bound) HTML attribute in the
    //   template, so it survives as a real DOM attribute under NO_ERRORS_SCHEMA and a CSS attribute
    //   selector can find it directly.
    // - Program select: its `[label]` binding is a property binding, so Angular sets it as a JS
    //   property (not a DOM attribute) on the opaque element — found by reading `.label` and matching
    //   it against the current `entityLabel` (same technique the pre-existing `attachTo` assertion in
    //   `requests.component.spec.ts` already relies on for property bindings on opaque elements).
    // - Search input's wrapper: `input[hlmInput]`'s parent element.
    // - Clear filters: `.clear_filters_container`.
    it('keeps Phase → Program → Search → Clear filters in that DOM order (regression guard)', () => {
      routerMock.url = '/result/results-outlet/results-notifications/updates';
      fixture.detectChanges();

      const filterRow = (fixture.nativeElement as HTMLElement).querySelector('.notifications_filters');
      expect(filterRow).toBeTruthy();

      const phaseEl = filterRow.querySelector('app-pr-select[label="Phases"]') as Element;
      const selects = Array.from(filterRow.querySelectorAll('app-pr-select')) as any[];
      const programEl = selects.find(el => el !== phaseEl && el.label === resultsNotificationsServiceMock.entityLabel) as Element;
      const searchInput = filterRow.querySelector('input[hlmInput]');
      const searchEl = searchInput?.parentElement as Element;
      const clearEl = filterRow.querySelector('.clear_filters_container') as Element;

      expect(phaseEl).toBeTruthy();
      expect(programEl).toBeTruthy();
      expect(searchEl).toBeTruthy();
      expect(clearEl).toBeTruthy();

      // Node.DOCUMENT_POSITION_FOLLOWING === 4 — asserted for each identified pair. Swapping ANY two
      // of these elements' positions in the template now fails one of these three assertions.
      expect(phaseEl.compareDocumentPosition(programEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(programEl.compareDocumentPosition(searchEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(searchEl.compareDocumentPosition(clearEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not render the Updates filter row on the Requests tab (its own row now lives in RequestsComponent)', () => {
      routerMock.url = '/result/results-outlet/results-notifications/requests';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear_filters_container')).toBeFalsy();
    });

    it('does not render the Updates filter row on the Settings tab', () => {
      routerMock.url = '/result/results-outlet/results-notifications/settings';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.clear_filters_container')).toBeFalsy();
    });
  });
});

// NOTIF-T-11 (rework attempt 2) — the test the Reviewer asked for. Attempt 1's Reviewer FAIL turned
// on a reproducible bug: RequestsComponent and ResultsNotificationsComponent each held their OWN
// phaseList/filteredInitiatives/entityLabel, so a phase change on Requests left Updates' Program
// dropdown showing the OLD phase's initiatives under the OLD label. This suite mounts BOTH
// components against the SAME TestBed module — deliberately NOT mocking ResultsNotificationsService
// (unlike every other describe block in this file/requests.component.spec.ts) — so both components
// resolve the identical singleton instance, the way they really do in the app (`providedIn: 'root'`).
// Proving that reference identity, then that a phase change through one component's delegated
// service call is visible on the other's bindings, is what proves the state genuinely lives in ONE
// shared place now, not two independent copies.
describe('Cross-component Phase/Program state sharing (NOTIF-T-11 attempt 2)', () => {
  let requestsFixture: any;
  let requestsComponent: RequestsComponent;
  let notifFixture: any;
  let notifComponent: ResultsNotificationsComponent;
  let sharedApiServiceMock: any;
  let sharedRouterMock: any;

  beforeEach(async () => {
    sharedApiServiceMock = {
      rolesSE: { isAdmin: true },
      dataControlSE: {
        myInitiativesList: [],
        reportingCurrentPhase: null,
        getCurrentPhases: jest.fn(() => of({})),
        getCurrentIPSRPhase: jest.fn(() => of({}))
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [{ initiative_id: '9', full_name: 'Shared Initiative' }] })),
        GET_versioning: jest.fn().mockReturnValue(of({ response: [{ id: 42, obj_portfolio: { id: 2, acronym: 'INIT' } }] })),
        // onPhaseChange() (now on the real service) also fans out to these three — real
        // ResultsNotificationsService methods, not mocked, so they need real-shaped responses.
        GET_requestUpdates: jest.fn().mockReturnValue(of({ response: { notificationsPending: [], notificationsViewed: [], notificationAnnouncement: [] } })),
        GET_allRequest: jest.fn().mockReturnValue(of({ response: { receivedContributionsDone: [], receivedContributionsPending: [] } })),
        GET_sentRequest: jest.fn().mockReturnValue(of({ response: { sentContributionsDone: [], sentContributionsPending: [] } }))
      }
    };

    // RequestsComponent's template uses `routerLinkActive`/`routerLink` (real directives, via the
    // RouterModule import below) — RouterLinkActive's constructor subscribes to `router.events`, so
    // the mock needs the same shape requests.component.spec.ts's own suite already uses for this.
    // Kept in a named variable (not inlined) so tests below can mutate `.url` and re-render.
    sharedRouterMock = {
      navigate: jest.fn(),
      url: '/result/results-outlet/results-notifications/requests',
      events: of(),
      createUrlTree: jest.fn().mockReturnValue({}),
      serializeUrl: jest.fn().mockReturnValue('')
    };

    await TestBed.configureTestingModule({
      declarations: [RequestsComponent, ResultsNotificationsComponent],
      // RouterModule (not just RouterOutlet): RequestsComponent's own template uses
      // `routerLinkActive`/`routerLink` template-reference-variable directives, which need the
      // NgModule's directive exports resolved — same reason requests.component.spec.ts's own suite
      // imports it.
      imports: [RouterOutlet, RouterModule, CommonModule],
      providers: [
        { provide: ApiService, useValue: sharedApiServiceMock },
        { provide: ShareRequestModalService, useValue: { inNotifications: false } },
        { provide: Router, useValue: sharedRouterMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
        // ResultsNotificationsService is intentionally left as the REAL, real `providedIn: 'root'`
        // singleton here — not overridden with a mock — so both components below share one instance.
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    requestsFixture = TestBed.createComponent(RequestsComponent);
    requestsComponent = requestsFixture.componentInstance;

    notifFixture = TestBed.createComponent(ResultsNotificationsComponent);
    notifComponent = notifFixture.componentInstance;
  });

  it('both components resolve the identical ResultsNotificationsService instance', () => {
    expect((requestsComponent as any).resultsNotificationsSE).toBe((notifComponent as any).resultsNotificationsSE);
  });

  it('changing phase via one component is RENDERED on the OTHER component template, not just proven as shared-object-reference identity', () => {
    // NOTIF-T-11 (rework attempt 3): RequestsComponent no longer calls getAllPhases() at all — ONLY
    // ResultsNotificationsComponent.ngOnInit() does (see its ngOnInit / the service's getAllPhases
    // doc). Trigger the fetch through the PARENT, the way the real app actually does it.
    notifComponent.ngOnInit(); // -> resultsNotificationsSE.getAllPhases() -> populates phaseList

    expect(notifComponent.resultsNotificationsSE.phaseList).toEqual([{ id: 42, obj_portfolio: { id: 2, acronym: 'INIT' } }]);

    // Drive the phase change through RequestsComponent's OWN service reference.
    requestsComponent.resultsNotificationsSE.onPhaseChange(42);

    // Corrected per NOTIF-T-11 attempt 2's Reviewer FAIL #4: reading `notifComponent.resultsNotificationsSE.*`
    // fields back (as attempt 2 did) only proves both components hold the SAME object reference — it
    // would pass even if neither component's TEMPLATE actually binds to/re-renders from that state.
    // This assertion instead mounts ResultsNotificationsComponent at the Updates route, runs real
    // change detection, and reads the RENDERED Program `app-pr-select` element's bound `label`/
    // `options` properties — proving the template genuinely reflects the shared state.
    sharedRouterMock.url = '/result/results-outlet/results-notifications/updates';
    notifFixture.detectChanges();

    const selects = Array.from((notifFixture.nativeElement as HTMLElement).querySelectorAll('app-pr-select')) as any[];
    const programSelect = selects.find(el => el.label === 'Initiative');

    expect(programSelect).toBeTruthy();
    expect(programSelect.label).toBe('Initiative');
    expect(programSelect.options).toEqual([{ initiative_id: '9', full_name: 'Shared Initiative' }]);
  });
});
