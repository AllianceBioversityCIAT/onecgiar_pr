// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-T-8)
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { MyWorkBoardComponent } from './my-work-board.component';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkColumn, MyWorkTotals } from './my-work.view-model';
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';

/** The band is chrome, not this tab: stubbed so the spec exercises the board surface only. */
@Component({ selector: 'app-reporting-program-band', standalone: true, template: '' })
class BandStubComponent {
  @Input() programCode = '';
  @Input() programName = '';
  @Input() cycleYear: unknown = null;
  @Input() cyclePhase = '';
  @Input() activeTab = '';
  @Input() myWorkCount: number | null = null;
  @Input() canReport = false;
  @Input() showToolbar = false;
  @Input() frameLocked = false;
  @Input() scrollHost: HTMLElement | null = null;
  /** `MWB-T-8` (2) — the stub carries the output so the page's own binding is exercised. */
  @Output() whereToReport = new EventEmitter<void>();
}

function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  return {
    id: 4712,
    code: '4712',
    title: 'Farmer-led seed multiplication guide',
    category: 'Knowledge product',
    statusId: 1,
    statusName: 'Editing',
    resultTypeId: 6,
    createdBy: '',
    created: '2025-08-12T00:00:00.000Z',
    origin: 'W1/W2',
    center: '',
    updated: '',
    indicator: '',
    section: '',
    versionId: '36',
    phaseName: 'Reporting 2026',
    phaseYear: 2026,
    submitterCode: 'SP01',
    raw: {},
    ...partial
  };
}

const EMPTY_TOTALS: MyWorkTotals = { editing: 0, pending: 0, submitted: 0, approved: 0, discontinued: 0, other: 0, all: 0 };

/** Fake `MyWorkBoardService` — the page spec mocks the data layer (already unit-tested in
 *  `services/my-work-board.service.spec.ts`) so it can drive every UI state directly. */
class FakeMyWorkBoardService {
  readonly scope = signal<'mine' | 'all'>('mine');
  readonly phase = signal<string | null>(null);
  readonly currentPhaseName = signal<string | null>(null);
  readonly rows = signal<ProgrammeResultRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly phaseOptions = signal<string[]>(['Reporting 2026']);
  readonly effectivePhase = signal<string | null>('Reporting 2026');
  readonly visibleRows = signal<ProgrammeResultRow[]>([]);
  readonly columns = signal<MyWorkColumn[]>([]);
  readonly totals = signal<MyWorkTotals>(EMPTY_TOTALS);
  readonly readyCount = signal(0);
  readonly badge = signal<number | null>(null);
  readonly scopeTotals = signal<{ mine: number | null; all: number | null }>({ mine: null, all: null });

  load = jest.fn();
  setScope = jest.fn();
  setPhase = jest.fn();
  retry = jest.fn();
}

describe('MyWorkBoardComponent', () => {
  let fixture: ComponentFixture<MyWorkBoardComponent>;
  let component: MyWorkBoardComponent;
  let service: FakeMyWorkBoardService;
  let router: { navigate: jest.Mock };
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let routeSnapshotQueryParamMap: ParamMap;

  function build(initialQueryParams: Record<string, string> = {}): void {
    service = new FakeMyWorkBoardService();
    router = { navigate: jest.fn().mockResolvedValue(true) };

    const initialMap = convertToParamMap(initialQueryParams);
    routeSnapshotQueryParamMap = initialMap;
    queryParamMapSubject = new BehaviorSubject<ParamMap>(initialMap);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MyWorkBoardComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ entityId: 'SP01' })),
            snapshot: {
              paramMap: convertToParamMap({ entityId: 'SP01' }),
              get queryParamMap() {
                return routeSnapshotQueryParamMap;
              }
            },
            queryParamMap: queryParamMapSubject
          }
        },
        { provide: Router, useValue: router },
        {
          provide: DataControlService,
          useValue: { reportingCurrentPhase: { phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26' }, reportingPhaseVersion: signal(0) }
        },
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: () => [{ initiativeCode: 'SP01', initiativeShortName: 'Sustainable Farming', initiativeName: 'SP01 long' }],
            otherSPsList: () => [],
            otherProjectsList: () => []
          }
        }
      ]
    });

    TestBed.overrideComponent(MyWorkBoardComponent, {
      remove: { imports: [ReportingProgramBandComponent] },
      add: { imports: [BandStubComponent] }
    });
    TestBed.overrideComponent(MyWorkBoardComponent, { set: { providers: [{ provide: MyWorkBoardService, useValue: service }] } });

    fixture = TestBed.createComponent(MyWorkBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  beforeEach(() => build());

  it('loads the resolved programme code on init', () => {
    expect(service.load).toHaveBeenCalledWith('SP01');
  });

  // ── States (`MWB-R-7`) ──────────────────────────────────────────────────────────────────────
  describe('states', () => {
    it('shows the skeleton while loading and no rows have arrived yet', () => {
      service.loading.set(true);
      fixture.detectChanges();

      expect(root().querySelector('[aria-busy="true"]')).toBeTruthy();
      expect(text()).not.toContain('Nothing on your board yet');
    });

    it('shows the error panel with a working Retry action', () => {
      service.error.set('The results of this program could not be loaded.');
      fixture.detectChanges();

      const alert = root().querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('could not be loaded');
      const retry = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.trim() === 'Retry') as HTMLButtonElement;
      retry.click();
      expect(service.retry).toHaveBeenCalledTimes(1);
    });

    it('shows the whole-board empty state only when NOT loading and there are zero visible rows', () => {
      service.loading.set(false);
      service.visibleRows.set([]);
      fixture.detectChanges();

      expect(text()).toContain('Nothing on your board yet');
    });

    it('does not show the empty state while a request is in flight', () => {
      service.loading.set(true);
      service.visibleRows.set([]);
      fixture.detectChanges();

      expect(text()).not.toContain('Nothing on your board yet');
    });

    it('"Go to Reporting" preserves phase and "See all program results" switches scope', () => {
      service.visibleRows.set([]);
      fixture.detectChanges();

      const goToReporting = root().querySelector('a[href], a[routerlink]') as HTMLAnchorElement | null;
      // routerLink renders as an `<a>` without a native href in this harness (no router config) —
      // assert the component's own target computation instead of DOM navigation.
      expect(component.reportingPath()).toBe('/result-framework-reporting/entity-details/SP01');

      const seeAll = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('See all program results')) as HTMLButtonElement;
      seeAll.click();
      expect(service.setScope).toHaveBeenCalledWith('all');
      void goToReporting;
    });
  });

  // ── Columns (`MWB-R-2`) ─────────────────────────────────────────────────────────────────────
  describe('columns', () => {
    const fiveColumns: MyWorkColumn[] = [
      { key: 'editing', label: 'Editing', group: 'action', rows: [row()] },
      { key: 'pending', label: 'Pending review', group: 'waiting', rows: [] },
      { key: 'submitted', label: 'Submitted', group: 'waiting', rows: [] },
      { key: 'approved', label: 'Approved', group: 'closed', rows: [] },
      { key: 'discontinued', label: 'Discontinued', group: 'closed', rows: [] }
    ];

    it('renders the five fixed columns in order when Other is empty', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(root().querySelectorAll('app-my-work-column').length).toBe(5);
      expect(text().indexOf('Editing')).toBeLessThan(text().indexOf('Pending review'));
      expect(text().indexOf('Submitted')).toBeLessThan(text().indexOf('Approved'));
      expect(text()).not.toContain('Other');
    });

    it('renders the Other rail only when it has rows', () => {
      service.visibleRows.set([row()]);
      service.columns.set([...fiveColumns, { key: 'other', label: 'Other', group: 'closed', rows: [row({ code: '9999', statusId: 42, statusName: 'Weird' })] }]);
      fixture.detectChanges();

      expect(root().querySelectorAll('app-my-work-column').length).toBe(6);
      expect(text()).toContain('Other');
    });

    it('renders the Closed group collapsed as rails by default and expands on click', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(component.closedCollapsed()).toBe(true);
      expect(root().querySelectorAll('section[role="region"]').length).toBe(3); // Editing, Pending, Submitted

      const rail = Array.from(root().querySelectorAll('button')).find(b => b.className.includes('w-[44px]')) as HTMLButtonElement;
      expect(rail).toBeTruthy();
      rail.click();
      fixture.detectChanges();

      expect(component.closedCollapsed()).toBe(false);
      expect(root().querySelectorAll('section[role="region"]').length).toBe(5); // + Approved, Discontinued
    });

    it('has no primary (gradient) button inside a non-Editing column', () => {
      const editingRow = row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] } });
      service.visibleRows.set([editingRow, row({ code: '4701', statusId: 3, statusName: 'Submitted' })]);
      service.columns.set([
        { key: 'editing', label: 'Editing', group: 'action', rows: [editingRow] },
        { key: 'pending', label: 'Pending review', group: 'waiting', rows: [] },
        { key: 'submitted', label: 'Submitted', group: 'waiting', rows: [row({ code: '4701', statusId: 3, statusName: 'Submitted' })] },
        { key: 'approved', label: 'Approved', group: 'closed', rows: [] },
        { key: 'discontinued', label: 'Discontinued', group: 'closed', rows: [] }
      ]);
      fixture.detectChanges();

      const sections = Array.from(root().querySelectorAll('section[role="region"]'));
      const nonEditing = sections.filter(s => !s.textContent?.includes('Editing'));
      for (const section of nonEditing) {
        expect(section.querySelectorAll('button.bg-gradient-to-r, a.bg-gradient-to-r').length).toBe(0);
      }
    });

    it('never renders a draggable attribute anywhere on the board', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(root().querySelectorAll('[draggable]').length).toBe(0);
    });
  });

  // ── Continue navigation (`MWB-R-6`) — full-stack wiring through column → card ────────────────
  it("Continue navigates with the STRING code and the row's phase", () => {
    const editingRow = row({ code: '4712', versionId: '36', completeness: { complete: 2, total: 5, missing: ['geographic-location'] } });
    service.visibleRows.set([editingRow]);
    service.columns.set([{ key: 'editing', label: 'Editing', group: 'action', rows: [editingRow] }]);
    fixture.detectChanges();

    const continueBtn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('Continue')) as HTMLButtonElement;
    continueBtn.click();

    expect(router.navigate).toHaveBeenCalledWith(['/result', 'result-detail', '4712', 'geographic-location'], { queryParams: { phase: 36 } });
  });

  // ── Phase select (`MWB-R-3` UI) ─────────────────────────────────────────────────────────────
  describe('phase select', () => {
    it('shows the effective phase as the default selection', () => {
      service.effectivePhase.set('Reporting 2026');
      fixture.detectChanges();

      expect(text()).toContain('Reporting 2026');
    });

    it('re-groups (no request) and mirrors the URL with replaceUrl + merge on change', () => {
      component.onPhaseChange('Reporting 2025');

      expect(service.setPhase).toHaveBeenCalledWith('Reporting 2025');
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { phase: 'Reporting 2025' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    it('hydrates the phase from the URL query param on load', () => {
      build({ phase: 'Reporting 2025' });

      expect(service.setPhase).toHaveBeenCalledWith('Reporting 2025');
    });
  });

  // `MWB-T-7` (4, 5): presence-only — the board container's re-group fade is a local `@keyframes`
  // neutralised under `prefers-reduced-motion` in the component's own SCSS (not a Tailwind class),
  // so it's asserted by class name; jsdom does not evaluate the media query itself.
  // ── Page row layout, band CTA and the board-shaped skeleton (`MWB-T-8`) ─────────────────────
  describe('MWB-T-8 — filter row, Where to report, skeleton', () => {
    const workArea = () => component.workAreaEl() as HTMLElement;

    it('makes the filter row the first element child of #workArea and puts the explainer after it', () => {
      const filterRow = workArea().firstElementChild as HTMLElement;

      expect(filterRow.getAttribute('role')).toBe('search');
      expect(filterRow.getAttribute('aria-label')).toBe('My work filters');
      expect(filterRow.querySelector('[aria-label="My work board controls"] [role="tablist"]')).toBeTruthy();
      expect(filterRow.querySelector('app-pr-filter-select')).toBeTruthy();
      expect(filterRow.textContent).toContain('Phase');

      // The explainer is rendered, and it comes AFTER the filter row in document order.
      const explainer = root().querySelector('app-pr-tab-intro') as HTMLElement;
      expect(explainer).toBeTruthy();
      expect(filterRow.compareDocumentPosition(explainer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(filterRow.contains(explainer)).toBe(false);
    });

    it('drops the standalone read-only hint line and keeps the copy in the explainer description', () => {
      expect(text()).not.toContain('Read-only board.');
      expect(component.explainerDescription).toContain('read-only');
      expect(component.explainerDescription).toContain('Status changes still happen inside the result');
    });

    it('enables the band CTA and navigates with returnTab=my-work when it fires', () => {
      const band = fixture.debugElement.query(By.directive(BandStubComponent));
      expect((band.componentInstance as BandStubComponent).canReport).toBe(true);

      (band.componentInstance as BandStubComponent).whereToReport.emit();

      expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP01'], {
        queryParams: { whereToReport: 'true', returnTab: 'my-work' }
      });
    });

    it('renders a board-shaped skeleton (5 columns + card placeholders) while loading, and none once rows land', () => {
      service.loading.set(true);
      service.rows.set([]);
      fixture.detectChanges();

      const busy = root().querySelector('[aria-busy="true"]') as HTMLElement;
      expect(busy).toBeTruthy();
      expect(busy.querySelector('.sr-only')?.textContent).toContain('Loading your board');
      expect(root().querySelectorAll('[data-testid="my-work-skeleton-column"]').length).toBe(5);
      expect(root().querySelectorAll('[data-testid="my-work-skeleton-card"]').length).toBeGreaterThan(0);
      // The filter row stays mounted while the board is loading.
      expect(workArea().firstElementChild?.getAttribute('role')).toBe('search');

      service.loading.set(false);
      service.visibleRows.set([row()]);
      service.columns.set([{ key: 'editing', label: 'Editing', group: 'action', rows: [row()] }]);
      fixture.detectChanges();

      expect(root().querySelectorAll('[data-testid="my-work-skeleton-column"]').length).toBe(0);
      expect(root().querySelectorAll('[data-testid="my-work-skeleton-card"]').length).toBe(0);
    });
  });

  it('carries the board re-group entrance-fade class when the board renders (MWB-T-7)', () => {
    service.visibleRows.set([row()]);
    service.columns.set([{ key: 'editing', label: 'Editing', group: 'action', rows: [row()] }]);
    fixture.detectChanges();

    expect(root().querySelector('.pr-board-fade')).toBeTruthy();
  });
});
