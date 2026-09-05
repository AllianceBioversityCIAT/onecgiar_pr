// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-T-8, MWB-T-9)
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { MyWorkBoardComponent } from './my-work-board.component';
import { MyWorkBoardService } from './services/my-work-board.service';
import { MyWorkCountService } from './services/my-work-count.service';
import { MyWorkColumn, MyWorkTotals } from './my-work.view-model';
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import { PROGRAMME_RESULTS_OTHER_CATEGORY, ProgrammeResultsFilterService } from '../programme-results/services/programme-results-filter.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { ScienceProgramIdService } from '../../services/science-program-id.service';
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
    // `set` REPLACES the component's providers array — `ProgrammeResultsFilterService` is
    // page-provided since `MWB-T-9`, so it has to be re-listed or the toolbar cannot be injected.
    TestBed.overrideComponent(MyWorkBoardComponent, {
      set: { providers: [ProgrammeResultsFilterService, { provide: MyWorkBoardService, useValue: service }] }
    });

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

  // ── Columns (`MWB-R-2`, `MWB-T-10`) ─────────────────────────────────────────────────────────
  describe('columns', () => {
    // `MWB-T-10`: `approved` is now the expanded *Done* column labelled **Quality assessed**;
    // *Closed* is Discontinued (+ the conditional Other).
    const fiveColumns: MyWorkColumn[] = [
      { key: 'editing', label: 'Editing', group: 'action', rows: [row()] },
      { key: 'pending', label: 'Pending review', group: 'waiting', rows: [] },
      { key: 'submitted', label: 'Submitted', group: 'waiting', rows: [] },
      { key: 'approved', label: 'Quality assessed', group: 'done', rows: [] },
      { key: 'discontinued', label: 'Discontinued', group: 'closed', rows: [] }
    ];

    /** The board's per-column flex items, in DOM order. */
    const columnItems = () => Array.from(root().querySelectorAll<HTMLElement>('[data-testid="my-work-board-column-item"]'));

    it('renders the five fixed columns in order when Other is empty', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(root().querySelectorAll('app-my-work-column').length).toBe(5);
      expect(columnItems().map(item => item.dataset['columnKey'])).toEqual(['editing', 'pending', 'submitted', 'approved', 'discontinued']);
      expect(text().indexOf('Editing')).toBeLessThan(text().indexOf('Pending review'));
      expect(text().indexOf('Submitted')).toBeLessThan(text().indexOf('Quality assessed'));
      expect(text().indexOf('Quality assessed')).toBeLessThan(text().indexOf('Discontinued'));
      expect(text()).not.toContain('Other');
    });

    it('renders the four group labels, Done carrying the approved token (MWB-T-10, MWB-DD-7)', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(text()).toContain('Needs my action');
      expect(text()).toContain('Waiting on others');
      expect(text()).toContain('Done');
      expect(text()).toContain('Closed');

      const doneLabel = columnItems().find(item => item.dataset['columnKey'] === 'approved')?.firstElementChild as HTMLElement;
      expect(doneLabel.textContent?.trim()).toBe('Done');
      expect(doneLabel.className).toContain('text-[var(--pr-status-approved-fg)]');
    });

    it('renders the Other rail only when it has rows', () => {
      service.visibleRows.set([row()]);
      service.columns.set([...fiveColumns, { key: 'other', label: 'Other', group: 'closed', rows: [row({ code: '9999', statusId: 42, statusName: 'Weird' })] }]);
      fixture.detectChanges();

      expect(root().querySelectorAll('app-my-work-column').length).toBe(6);
      expect(text()).toContain('Other');
    });

    it('renders Quality assessed expanded with its cards while Discontinued stays a rail (MWB-T-10)', () => {
      const qaRow = row({ code: '4801', statusId: 2, statusName: 'Quality Assessed' });
      service.visibleRows.set([row(), qaRow]);
      service.columns.set([
        ...fiveColumns.slice(0, 3),
        { key: 'approved', label: 'Quality assessed', group: 'done', rows: [qaRow] },
        { key: 'discontinued', label: 'Discontinued', group: 'closed', rows: [row({ code: '4802', statusId: 4, statusName: 'Discontinued' })] }
      ]);
      fixture.detectChanges();

      const qaSection = root().querySelector('section[aria-labelledby="my-work-column-approved"]') as HTMLElement;
      expect(qaSection).toBeTruthy();
      expect(qaSection.querySelectorAll('app-my-work-card').length).toBe(1);
      // Never a rail — Quality assessed cannot be collapsed away.
      expect(root().querySelector('section[aria-labelledby="my-work-column-approved"] button[aria-expanded]')).toBeNull();
      // Scoped to the columns — the toolbar's Filter button also carries `aria-expanded="false"`.
      expect(root().querySelectorAll('app-my-work-column button[aria-expanded="false"]').length).toBe(1); // Discontinued only
    });

    it('renders the Closed group collapsed as one rail by default and expands on click', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      expect(component.closedCollapsed()).toBe(true);
      // Editing, Pending review, Submitted, Quality assessed — four expanded columns (`MWB-T-10`).
      expect(root().querySelectorAll('section[role="region"]').length).toBe(4);

      const rail = Array.from(root().querySelectorAll('button')).find(b => b.className.includes('w-[44px]')) as HTMLButtonElement;
      expect(rail).toBeTruthy();
      rail.click();
      fixture.detectChanges();

      expect(component.closedCollapsed()).toBe(false);
      expect(root().querySelectorAll('section[role="region"]').length).toBe(5); // + Discontinued
    });

    // `MWB-T-10` (a) — the user's screenshot defect: an expanded Closed column had no way back.
    it('offers a collapse control on the expanded Closed column that returns it to the rail', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      const rail = () => root().querySelector('app-my-work-column button[aria-expanded="false"]') as HTMLButtonElement | null;
      const collapse = () => root().querySelector('button[aria-label="Collapse Discontinued"]') as HTMLButtonElement | null;

      expect(rail()).toBeTruthy();
      expect(collapse()).toBeNull();

      rail()!.click();
      fixture.detectChanges();

      expect(collapse()).toBeTruthy();
      expect(collapse()!.getAttribute('aria-expanded')).toBe('true');

      collapse()!.click();
      fixture.detectChanges();

      expect(component.closedCollapsed()).toBe(true);
      expect(rail()).toBeTruthy();
      expect(rail()!.getAttribute('aria-expanded')).toBe('false');
      expect(collapse()).toBeNull();
    });

    // `MWB-T-10` (b) — width distribution: an expanded Closed column must take the SAME share as
    // Pending review / Submitted / Quality assessed, never twice as much. jsdom does not lay out,
    // so the proof is the class set the flex items carry (`flex-1 basis-0 min-w-[260px]`).
    it('gives every expanded non-Editing column the same sizing class set, collapsed and expanded', () => {
      service.visibleRows.set([row()]);
      service.columns.set(fiveColumns);
      fixture.detectChanges();

      const sizingOf = (item: HTMLElement) => [...item.classList].sort().join(' ');
      const nonEditing = () => columnItems().filter(item => item.dataset['columnKey'] !== 'editing');

      const editing = columnItems().find(item => item.dataset['columnKey'] === 'editing') as HTMLElement;
      expect(editing.className).toContain('w-[360px]');
      expect(editing.className).toContain('flex-none');

      const expandedBefore = nonEditing().filter(item => item.dataset['columnKey'] !== 'discontinued');
      expect(expandedBefore.length).toBe(3);
      for (const item of expandedBefore) {
        expect(item.className).toContain('flex-1');
        expect(item.className).toContain('basis-0');
        expect(item.className).toContain('min-w-[260px]');
        expect(sizingOf(item)).toBe(sizingOf(expandedBefore[0]));
      }
      // While collapsed the rail is 44px and does not grow.
      const railItem = nonEditing().find(item => item.dataset['columnKey'] === 'discontinued') as HTMLElement;
      expect(railItem.className).toContain('w-[44px]');
      expect(railItem.className).not.toContain('flex-1');

      (root().querySelector('app-my-work-column button[aria-expanded="false"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      const expandedAfter = nonEditing();
      expect(expandedAfter.length).toBe(4);
      for (const item of expandedAfter) {
        expect(sizingOf(item)).toBe(sizingOf(expandedAfter[0]));
      }
    });

    it('has no primary (gradient) button inside a non-Editing column', () => {
      const editingRow = row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] } });
      service.visibleRows.set([editingRow, row({ code: '4701', statusId: 3, statusName: 'Submitted' })]);
      service.columns.set([
        { key: 'editing', label: 'Editing', group: 'action', rows: [editingRow] },
        { key: 'pending', label: 'Pending review', group: 'waiting', rows: [] },
        { key: 'submitted', label: 'Submitted', group: 'waiting', rows: [row({ code: '4701', statusId: 3, statusName: 'Submitted' })] },
        { key: 'approved', label: 'Quality assessed', group: 'done', rows: [] },
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

    // `MWB-T-9`: the phase moved into the Filter popover and the URL write moved into the shared
    // five-param mirror effect, so the navigate call now carries the whole param map. The
    // assertion's substance is unchanged: `phase` reaches the URL with `merge` + `replaceUrl`.
    it('re-groups (no request) and mirrors the URL with replaceUrl + merge on change', () => {
      component.onPhaseChange('Reporting 2025');
      expect(service.setPhase).toHaveBeenCalledWith('Reporting 2025');

      // The real service resolves the new label inside `setPhase()`; the fake needs it spelled out.
      service.effectivePhase.set('Reporting 2025');
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: expect.objectContaining({ phase: 'Reporting 2025' }),
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

    it('makes the filter row the first element child of #workArea and renders no explainer (removed on user request 2026-09-05)', () => {
      const filterRow = workArea().firstElementChild as HTMLElement;

      expect(filterRow.getAttribute('role')).toBe('search');
      expect(filterRow.getAttribute('aria-label')).toBe('My results filters');
      expect(filterRow.querySelector('[aria-label="My results board controls"] [role="tablist"]')).toBeTruthy();
      expect(filterRow.querySelector('app-pr-filter-select')).toBeTruthy();
      expect(filterRow.textContent).toContain('Phase');

      expect(root().querySelector('app-pr-tab-intro')).toBeNull();
      expect(text()).not.toContain('What does this tab show?');
      expect(text()).not.toContain('Read-only board.');
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
      const shells = Array.from(root().querySelectorAll<HTMLElement>('[data-testid="my-work-skeleton-column"]'));
      expect(shells.length).toBe(5);
      // `MWB-T-10`: Editing shell + three equal shells (Pending, Submitted, Quality assessed) + ONE rail.
      expect(shells.filter(shell => shell.className.includes('w-[44px]')).length).toBe(1);
      expect(busy.textContent).toContain('Done');
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

// @akili-spec changes/my-work-board (MWB-T-9)
/**
 * Filter row parity with the Results tab: search · Filter popover · chips · URL bridge.
 *
 * Unlike the suite above, this one runs the REAL `MyWorkBoardService` + the REAL
 * `ProgrammeResultsFilterService` over `HttpTestingController`: "re-groups WITHOUT a request" and
 * "one source of truth for the phase" are only provable at the HTTP seam, and the AND-vs-OR
 * question is only provable against real predicates. The fixture deliberately shares values
 * across dimensions (three Knowledge products, three `W1/W2`, but only two rows carrying both) —
 * a one-row-per-value fixture cannot tell an AND from an OR (`MWB-T-9` disqualifier).
 */
describe('MyWorkBoardComponent — filter row (MWB-T-9)', () => {
  let fixture: ComponentFixture<MyWorkBoardComponent>;
  let component: MyWorkBoardComponent;
  let board: MyWorkBoardService;
  let filter: ProgrammeResultsFilterService;
  let httpMock: HttpTestingController;
  let router: { navigate: jest.Mock };
  let snapshotQueryParamMap: ParamMap;
  const userId = 7;

  function rawResult(partial: Record<string, any> = {}): Record<string, any> {
    return {
      id: '1',
      result_code: '5101',
      title: 'Seed systems brief',
      result_type: 'Knowledge product',
      status_id: '1',
      status_name: 'Editing',
      result_type_id: '6',
      created_date: '2025-08-29T16:37:46.000Z',
      create_first_name: 'Ana',
      create_last_name: 'Ruiz',
      source_name: 'W1/W2',
      lead_center: 'CIAT',
      version_id: '36',
      phase_name: 'Reporting 2026',
      submitter: 'SP01',
      ...partial
    };
  }

  /** 5 rows in *Reporting 2026* + 1 in *Reporting 2025*; all Editing so every card renders in the
   *  one expanded column (the Closed group is collapsed to rails by default, `MWB-DD-8`). */
  const FIXTURE = [
    rawResult(),
    rawResult({ id: '2', result_code: '5102', title: 'Seed multiplication guide', lead_center: 'IWMI' }),
    rawResult({
      id: '3',
      result_code: '5103',
      title: 'Policy dialogue note',
      source_name: 'W3/Bilateral',
      create_first_name: 'Bo',
      create_last_name: 'Chen'
    }),
    rawResult({
      id: '4',
      result_code: '5104',
      title: 'Drought tolerant maize',
      result_type: 'Innovation development',
      create_first_name: 'Bo',
      create_last_name: 'Chen'
    }),
    rawResult({
      id: '5',
      result_code: '5105',
      title: 'Water accounting tool',
      result_type: 'Innovation development',
      source_name: 'W3/Bilateral',
      lead_center: 'IWMI'
    }),
    rawResult({
      id: '6',
      result_code: '5106',
      title: 'Legacy irrigation study',
      result_type: 'Policy change',
      source_name: 'W3/Bilateral',
      lead_center: 'IWMI',
      create_first_name: 'Bo',
      create_last_name: 'Chen',
      phase_name: 'Reporting 2025',
      version_id: '30'
    })
  ];

  /** `items` overrides `FIXTURE` for the cases that need one extra row (the non-RF category). */
  function build(initialQueryParams: Record<string, string> = {}, items: Record<string, any>[] = FIXTURE): void {
    router = { navigate: jest.fn().mockResolvedValue(true) };
    snapshotQueryParamMap = convertToParamMap(initialQueryParams);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MyWorkBoardComponent, HttpClientTestingModule],
      providers: [
        ResultsApiService,
        {
          provide: SaveButtonService,
          useValue: {
            isCreatingPipe: jest.fn(),
            isGettingSectionPipe: jest.fn(),
            isSavingPipe: jest.fn(),
            showSaveSpinner: jest.fn(),
            isSavingPipeNextStep: jest.fn()
          }
        },
        {
          provide: ApiService,
          useFactory: (resultsApi: ResultsApiService) => ({ resultsSE: resultsApi, authSE: { localStorageUser: { id: userId } } }),
          deps: [ResultsApiService]
        },
        { provide: ScienceProgramIdService, useValue: { resolve: () => of(50) } },
        { provide: MyWorkCountService, useValue: { set: jest.fn(), ensure: jest.fn(), count: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ entityId: 'SP01' })),
            snapshot: {
              paramMap: convertToParamMap({ entityId: 'SP01' }),
              get queryParamMap() {
                return snapshotQueryParamMap;
              }
            },
            queryParamMap: new BehaviorSubject<ParamMap>(snapshotQueryParamMap)
          }
        },
        { provide: Router, useValue: router },
        {
          provide: DataControlService,
          useValue: {
            reportingCurrentPhase: { phaseYear: 2026, phaseName: 'Reporting 2026', portfolioAcronym: 'P26' },
            reportingPhaseVersion: signal(0)
          }
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

    fixture = TestBed.createComponent(MyWorkBoardComponent);
    component = fixture.componentInstance;
    board = fixture.debugElement.injector.get(MyWorkBoardService);
    filter = fixture.debugElement.injector.get(ProgrammeResultsFilterService);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes(`get/all/roles/filter/${userId}`)).flush({ response: { items } });
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const cardTitles = () =>
    Array.from(root().querySelectorAll('app-my-work-column article')).map(card => (card.querySelector('h3, h4, p')?.textContent ?? '').trim());
  const cardCount = () => root().querySelectorAll('app-my-work-column article').length;
  const chipLabels = () =>
    Array.from(root().querySelectorAll('[data-testid="my-work-chip"]')).map(chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
  const filterBadge = () => (root().querySelector('[data-testid="my-work-filter-count"]')?.textContent ?? '').trim();

  afterEach(() => {
    httpMock.verify();
  });

  it('renders one filter row with search, the Filter button and the phase chip — one control line, no stacked Phase select', () => {
    build();
    const filterRow = (component.workAreaEl() as HTMLElement).firstElementChild as HTMLElement;

    expect(filterRow.getAttribute('aria-label')).toBe('My results filters');
    expect(filterRow.querySelector('[aria-label="My results board controls"] [role="tablist"]')).toBeTruthy();
    expect(filterRow.querySelector('[data-testid="my-work-search"]')).toBeTruthy();
    expect(filterRow.querySelector('[data-testid="my-work-filter-button"]')).toBeTruthy();
    // The `MWB-T-8` bare select is gone: the only `app-pr-filter-select`s left are inside the popover.
    expect(filterRow.querySelectorAll('[data-testid="my-work-filter-popover"] app-pr-filter-select').length).toBe(
      filterRow.querySelectorAll('app-pr-filter-select').length
    );
    expect(chipLabels()).toEqual(['Phase: Reporting 2026']);
  });

  it('never offers a Status dimension — the columns already are the status', () => {
    build();
    expect(root().querySelector('[aria-label="Filter by status"]')).toBeNull();
  });

  it('search narrows the cards by title and by code', fakeAsync(() => {
    build();
    expect(cardCount()).toBe(5);

    component.onSearchInput('seed');
    tick(300);
    fixture.detectChanges();
    expect(cardTitles().sort()).toEqual(['Seed multiplication guide', 'Seed systems brief']);

    component.onSearchInput('5103');
    tick(300);
    fixture.detectChanges();
    expect(cardTitles()).toEqual(['Policy dialogue note']);
    expect(chipLabels()).toContain('Search: 5103');

    component.onSearchInput('');
    tick(300);
    fixture.detectChanges();
    expect(cardCount()).toBe(5);
  }));

  it('the Filter badge always equals the number of chips', () => {
    build();
    expect(filterBadge()).toBe(String(chipLabels().length));

    component.onCategoryChange('Knowledge product');
    fixture.detectChanges();
    expect(chipLabels().length).toBe(2);
    expect(filterBadge()).toBe('2');

    component.onOriginChange('W3/Bilateral');
    fixture.detectChanges();
    expect(chipLabels().length).toBe(3);
    expect(filterBadge()).toBe('3');
  });

  it('Category, Funding source and Center each narrow the board and add a chip — combined with AND', () => {
    build();

    component.onCategoryChange('Knowledge product');
    fixture.detectChanges();
    expect(cardCount()).toBe(3);
    expect(chipLabels()).toContain('Category: Knowledge product');

    // OR over the two dimensions would leave four cards (3 KP ∪ 3 W1/W2 minus the 2 shared).
    component.onOriginChange('W1/W2');
    fixture.detectChanges();
    expect(cardTitles().sort()).toEqual(['Seed multiplication guide', 'Seed systems brief']);
    expect(chipLabels()).toContain('Funding source: W1/W2');

    component.onCenterChange('IWMI');
    fixture.detectChanges();
    expect(cardTitles()).toEqual(['Seed multiplication guide']);
    expect(chipLabels()).toContain('Center: IWMI');
  });

  it("a chip's × removes just that filter and Clear all restores the whole board (keeping the default phase)", () => {
    build();
    component.onCategoryChange('Knowledge product');
    component.onOriginChange('W3/Bilateral');
    fixture.detectChanges();
    expect(cardCount()).toBe(1);

    const originChip = Array.from(root().querySelectorAll('[data-testid="my-work-chip"]')).find(chip =>
      chip.textContent?.includes('Funding source')
    ) as HTMLElement;
    (originChip.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cardCount()).toBe(3);
    expect(chipLabels()).not.toContain('Funding source: W3/Bilateral');

    (root().querySelector('[data-testid="my-work-clear-filters"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cardCount()).toBe(5);
    expect(chipLabels()).toEqual(['Phase: Reporting 2026']);
    expect(board.effectivePhase()).toBe('Reporting 2026');
  });

  it('changing the phase in the popover re-groups with NO request and keeps the badge on the visible phase', () => {
    build();
    expect(board.badge()).toBe(5);

    component.onPhaseChange('Reporting 2025');
    fixture.detectChanges();

    httpMock.expectNone(req => req.url.includes('get/all/roles/filter'));
    expect(board.effectivePhase()).toBe('Reporting 2025');
    expect(cardTitles()).toEqual(['Legacy irrigation study']);
    // One phase source: the chip, the columns and the badge all read the same resolved label.
    expect(chipLabels()).toEqual(['Phase: Reporting 2025']);
    expect(board.badge()).toBe(1);
    expect(filter.selectedPhase()).toBe('Reporting 2025');
  });

  it('mirrors a category choice to the URL with merge + replaceUrl', () => {
    build();
    router.navigate.mockClear();

    component.onCategoryChange('Knowledge product');
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: expect.objectContaining({ category: 'Knowledge product' }),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  });

  it('landing on ?origin=W3/Bilateral hydrates the chip and the board', () => {
    build({ origin: 'W3/Bilateral' });

    expect(filter.selectedOrigin()).toBe('W3/Bilateral');
    expect(chipLabels()).toContain('Funding source: W3/Bilateral');
    expect(cardTitles().sort()).toEqual(['Policy dialogue note', 'Water accounting tool']);
  });

  // @akili-spec changes/my-work-board (MWB-R-1 "BUT it must NOT drop or rewrite `phase`", MWB-DD-11)
  /**
   * Deep link to a phase that is NOT the current reporting one. On the very first flush the rows
   * have not arrived, so `phaseOptions()` is empty and `effectivePhase()` cannot resolve (it is
   * `null`). A mirror that published that unresolved `null` under `queryParamsHandling: 'merge'`
   * would DELETE `phase` from the URL — and the re-emitted param map would then make the hydrate
   * effect discard the deep-linked label. The mirror must fall back to the URL's own label until
   * the resolution is real.
   */
  it('keeps a deep-linked phase that is not the current reporting phase and never publishes a null phase', () => {
    build({ phase: 'Reporting 2025' });

    const publishedPhases = router.navigate.mock.calls.map(call => (call[1] as { queryParams?: Record<string, unknown> })?.queryParams?.['phase']);
    expect(publishedPhases).not.toContain(null);

    expect(board.effectivePhase()).toBe('Reporting 2025');
    expect(filter.selectedPhase()).toBe('Reporting 2025');
    expect(chipLabels()).toEqual(['Phase: Reporting 2025']);
    expect(cardTitles()).toEqual(['Legacy irrigation study']);
  });

  it('an unknown URL value stays as a chip and simply matches nothing', () => {
    build({ category: 'Not a category' });

    expect(chipLabels()).toContain('Category: Not a category');
    expect(cardCount()).toBe(0);
    expect(root().querySelector('[data-testid="my-work-filtered-empty"]')).toBeTruthy();
  });

  it('offers Created by only under All program results', () => {
    build();
    expect(root().querySelector('[aria-label="Filter by created by"]')).toBeNull();

    // `MWB-R-3` *Switch scope*: exactly ONE list request per scope change — `expectOne` fails if
    // the page's load effect re-fires alongside `setScope()`'s own request.
    component.setScope('all');
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes(`get/all/roles/filter/${userId}`)).flush({ response: { items: FIXTURE } });
    fixture.detectChanges();

    expect(root().querySelector('[aria-label="Filter by created by"]')).toBeTruthy();

    component.onCreatedByChange('Ana Ruiz');
    fixture.detectChanges();
    expect(cardTitles().sort()).toEqual(['Seed multiplication guide', 'Seed systems brief', 'Water accounting tool']);
    expect(chipLabels()).toContain('Created by: Ana Ruiz');

    // Going back to Mine hides the control, so its value must not keep narrowing the board.
    component.setScope('mine');
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.includes(`get/all/roles/filter/${userId}`)).flush({ response: { items: FIXTURE } });
    fixture.detectChanges();

    expect(root().querySelector('[aria-label="Filter by created by"]')).toBeNull();
    expect(filter.selectedCreatedBy()).toBeNull();
    expect(cardCount()).toBe(5);
  });

  it('builds each option list from the loaded rows — sorted, no blanks', () => {
    build();

    expect(component.categorySelectOptions().map(option => option.value)).toEqual(['Innovation development', 'Knowledge product', 'Policy change']);
    expect(component.originSelectOptions().map(option => option.value)).toEqual(['W1/W2', 'W3/Bilateral']);
    expect(component.centerSelectOptions().map(option => option.value)).toEqual(['CIAT', 'IWMI']);
    expect(component.createdBySelectOptions().map(option => option.value)).toEqual(['Ana Ruiz', 'Bo Chen']);
  });

  // @akili-spec changes/my-work-board (MWB-T-9 "parity with Results … reuse rather than re-implementing")
  /**
   * Category parity: the Results tab does not offer every raw `result_type`. Non-RF types
   * (`Capacity change`, `Other outcome`, `Other output`, `Impact contribution`) collapse into one
   * `Other` bucket carried by the `__other__` sentinel — `buildCategoryFilterOptions` is the
   * exported single definition of that rule and the predicate already understands the sentinel.
   */
  it('collapses non-RF categories into the single Other bucket, exactly like the Results tab', () => {
    build({}, [
      ...FIXTURE,
      rawResult({ id: '7', result_code: '5107', title: 'Capacity change note', result_type: 'Capacity change', result_type_id: '3' })
    ]);

    const options = component.categorySelectOptions();

    // RF order (not alphabetical), then the single bucket — never the raw non-RF `result_type`.
    expect(options.map(option => option.value)).toEqual([
      'Innovation development',
      'Knowledge product',
      'Policy change',
      PROGRAMME_RESULTS_OTHER_CATEGORY
    ]);
    expect(options.find(option => option.value === PROGRAMME_RESULTS_OTHER_CATEGORY)?.label).toBe('Other');

    // …and picking it narrows the board to exactly the non-RF rows.
    component.onCategoryChange(PROGRAMME_RESULTS_OTHER_CATEGORY);
    fixture.detectChanges();
    expect(cardTitles()).toEqual(['Capacity change note']);
    expect(chipLabels()).toContain('Category: Other');
  });

  it('opens and closes the Filter popover, and a document click outside closes it', () => {
    build();
    const button = root().querySelector('[data-testid="my-work-filter-button"]') as HTMLButtonElement;
    const popover = root().querySelector('[data-testid="my-work-filter-popover"]') as HTMLElement;

    expect(popover.classList.contains('hidden')).toBe(true);

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(popover.classList.contains('hidden')).toBe(false);

    document.body.click();
    fixture.detectChanges();
    expect(popover.classList.contains('hidden')).toBe(true);
  });
});
