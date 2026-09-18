import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BilateralProjectsPanelComponent } from './bilateral-projects-panel.component';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralManualCreateFlowService } from '../../../../services/bilateral-manual-create-flow.service';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';
import { BilateralCenterResult } from '../../../../services/bilateral-center-result.interface';

describe('BilateralProjectsPanelComponent', () => {
  let component: BilateralProjectsPanelComponent;
  let fixture: ComponentFixture<BilateralProjectsPanelComponent>;
  let bilateralApiService: jest.Mocked<BilateralApiService>;
  let ctx: BilateralContextService;
  let manualCreateFlow: BilateralManualCreateFlowService;
  let activatedRouteStub: { snapshot: { queryParamMap: ParamMap } };
  let mockRouter: { navigate: jest.Mock };

  const mockProjects: BilateralProject[] = [
    {
      id: 101,
      shortName: 'B-A1080',
      fullName: 'Genetic Diversity Preservation and International Genebank Conservation',
      summary: 'Sustaining long-term preservation of genetic resources.',
      description: 'Detailed description for B-A1080.',
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 1, programCode: 'GENE', spName: 'Genebank', spShortName: 'Genebank', allocation: '100' }
      ]
    },
    {
      id: 102,
      shortName: 'B-A1368',
      fullName: 'Next-Generation Crop Breeding Tools and Trait Introgression',
      summary: 'Accelerating crop breeding pipelines.',
      description: null,
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 2, programCode: 'SP01', spName: 'Breeding for Tomorrow', spShortName: 'Breeding', allocation: '80' },
        { programId: 1, programCode: 'GENE', spName: 'Genebank', spShortName: 'Genebank', allocation: '20' }
      ]
    },
    {
      id: 103,
      shortName: 'B-A1532',
      fullName: 'Agroecological Landscape Restoration and Biodiversity Conservation',
      summary: 'Restoring Andean agricultural landscapes.',
      description: null,
      leadCenter: { id: 1, name: 'Bioversity International', acronym: 'Bioversity' },
      sciencePrograms: [
        { programId: 3, programCode: 'SP04', spName: 'Multifunctional Landscapes', spShortName: 'Landscapes', allocation: '100' }
      ]
    }
  ];

  const mockCenterResults: BilateralCenterResult[] = [
    {
      result_id: 2001,
      result_code: 'R-2001',
      title: 'Result 1 for B-A1080',
      project_id: 101,
      center_id: 1,
      status_name: 'Editing',
      result_type_id: 1,
      result_type_name: 'Policy Change',
      version_id: 36,
    } as BilateralCenterResult,
    {
      result_id: 2002,
      result_code: 'R-2002',
      title: 'Result 2 for B-A1080',
      project_id: 101,
      center_id: 1,
      status_name: 'Submitted',
      result_type_id: 2,
      result_type_name: 'Innovation Use',
      version_id: 36,
    } as BilateralCenterResult,
    {
      result_id: 2003,
      result_code: 'R-2003',
      title: 'Result for B-A1368',
      project_id: 102,
      center_id: 1,
      status_name: 'Quality Assessed',
      result_type_id: 1,
      result_type_name: 'Policy Change',
      version_id: 36,
    } as BilateralCenterResult,
  ];

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    const mockApiService = {
      GET_bilateralProjects: jest.fn().mockReturnValue(of({ response: mockProjects })),
      GET_bilateralCenterResults: jest.fn().mockReturnValue(of({ response: mockCenterResults }))
    };

    activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    await TestBed.configureTestingModule({
      imports: [BilateralProjectsPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: BilateralApiService, useValue: mockApiService },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralProjectsPanelComponent);
    component = fixture.componentInstance;
    bilateralApiService = TestBed.inject(BilateralApiService) as jest.Mocked<BilateralApiService>;
    ctx = TestBed.inject(BilateralContextService);
    manualCreateFlow = TestBed.inject(BilateralManualCreateFlowService);
  });

  afterEach(() => {
    try {
      sessionStorage.removeItem('pr.bilateral.viewMode');
    } catch {
      // Ignored in test environment
    }
  });

  it('should create and initialize default state', () => {
    expect(component).toBeTruthy();
    expect(component.selectedProgramFilter()).toBe('ALL');
    expect(component.selectedMultiProgramOnly()).toBe(false);
    expect(component.viewMode()).toBe('grid');
    expect(component.searchQuery()).toBe('');
  });

  it('should fetch projects and compute KPI metrics upon center resolution', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledWith('Bioversity');
    expect(component.projects().length).toBe(3);

    const kpis = component.kpiSummary();
    expect(kpis.total).toBe(3);
    expect(kpis.multiProgramCount).toBe(1); // B-A1368 has 2 programs

    // Genebank is present in 2 projects, Breeding in 1, Landscapes in 1
    const genebankStat = kpis.byProgram.find(p => p.spName === 'Genebank');
    expect(genebankStat?.count).toBe(2);

    const breedingStat = kpis.byProgram.find(p => p.spName === 'Breeding for Tomorrow');
    expect(breedingStat?.count).toBe(1);
  });

  it('should filter projects when selectedProgramFilter is updated', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.setProgramFilter('Multifunctional Landscapes');
    fixture.detectChanges();

    const filtered = component.filteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].shortName).toBe('B-A1532');
  });

  it('should filter projects when selectedMultiProgramOnly is active', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.setMultiProgramOnly(true);
    fixture.detectChanges();

    const filtered = component.filteredProjects();
    expect(filtered.length).toBe(1);
    expect(filtered[0].shortName).toBe('B-A1368');
  });

  it('should perform multi-attribute search matching across code, full title, and science programs', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    // Match by code
    component.searchQuery.set('A1080');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1080');

    // Match by title word
    component.searchQuery.set('Andean');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1532');

    // Match by Science Program name
    component.searchQuery.set('Breeding');
    expect(component.filteredProjects().length).toBe(1);
    expect(component.filteredProjects()[0].shortName).toBe('B-A1368');
  });

  it('should reset all filters on resetAllFilters()', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.searchQuery.set('search');
    component.setProgramFilter('Genebank');
    component.setMultiProgramOnly(true);

    component.resetAllFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.selectedProgramFilter()).toBe('ALL');
    expect(component.selectedMultiProgramOnly()).toBe(false);
    expect(component.filteredProjects().length).toBe(3);
  });

  it('should toggle viewMode and persist preference in sessionStorage', () => {
    component.setViewMode('list');
    expect(component.viewMode()).toBe('list');
    expect(sessionStorage.getItem('pr.bilateral.viewMode')).toBe('list');

    component.setViewMode('grid');
    expect(component.viewMode()).toBe('grid');
    expect(sessionStorage.getItem('pr.bilateral.viewMode')).toBe('grid');
  });

  it('opens the manual create drawer from Create result without leaving the catalog', () => {
    const event = { preventDefault: jest.fn() } as unknown as Event;
    component.openManualCreate(mockProjects[0], event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(manualCreateFlow.drawerOpen()).toBe(true);
  });

  /**
   * `APF-T-7` rework, DI regression (Reviewer FAIL, issue 1): this panel unconditionally mounts
   * `<app-bilateral-manual-create-drawer-host>`, which mounts `app-bilateral-sp-selector`, whose
   * "Contributing Science Programs" disclosure (`APF-DD-11`) is `app-bilateral-accordion`. None of
   * this test file's providers supply `BilateralAutoSaveService` — the same production DI shape as
   * the real app (that service is only provided component-locally on `bilateral-result-creator`).
   * Before the fix, picking a primary SP on a project with secondary SPs threw `NullInjectorError`
   * the moment the accordion instantiated, taking the whole drawer down.
   */
  it('lets a primary SP pick with secondary SPs render the inline contributing section in the manual-create drawer without throwing', () => {
    const event = { preventDefault: jest.fn() } as unknown as Event;
    // B-A1368 (mockProjects[1]) carries 2 sciencePrograms — Breeding (primary pick) + Genebank
    // (left over as a secondary chip), so `showSpSelectionInDrawer()` is true and no SP is
    // auto-selected.
    component.openManualCreate(mockProjects[1], event);
    fixture.detectChanges();

    expect(manualCreateFlow.drawerOpen()).toBe(true);
    expect(manualCreateFlow.showSpSelectionInDrawer()).toBe(true);

    const primaryOption = fixture.nativeElement.querySelector('.sps-option--list') as HTMLElement | null;
    expect(primaryOption).toBeTruthy();

    expect(() => {
      primaryOption!.click();
      fixture.detectChanges();
    }).not.toThrow();

    expect(fixture.nativeElement.querySelector('[data-testid="sps-contributing-inline"]')).toBeTruthy();
  });

  it('should set error state if API fails', () => {
    bilateralApiService.GET_bilateralProjects.mockReturnValue(throwError(() => new Error('API error')));

    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.projects().length).toBe(0);
  });

  it('should render project cards in DOM for Grid View (BIL-OVW-R-3, BIL-OVW-AC-3)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    component.setViewMode('grid');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.bpp_card');
    expect(cards.length).toBe(3);

    const firstCard = cards[0];
    expect(firstCard.querySelector('.bpp_code_pill')?.textContent.trim()).toBe('B-A1080');
    expect(firstCard.querySelector('.bpp_card_title')?.textContent.trim()).toContain('Genetic Diversity Preservation');
    expect(firstCard.querySelector('.bpp_sp_chip')?.textContent).toContain('Genebank');
  });

  it('should render dense table rows in DOM for List View (BIL-OVW-R-4, BIL-OVW-AC-4)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    component.setViewMode('list');
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('.bpp_table');
    expect(table).toBeTruthy();

    const rows = fixture.nativeElement.querySelectorAll('.bpp_table_row');
    expect(rows.length).toBe(3);

    const firstRow = rows[0];
    expect(firstRow.querySelector('.bpp_code_pill')?.textContent.trim()).toBe('B-A1080');
    expect(firstRow.querySelector('.bpp_table_title')?.textContent.trim()).toContain('Genetic Diversity Preservation');
  });

  it('should render empty state in DOM when no projects match and reset on click (BIL-OVW-R-7, BIL-OVW-AC-6)', () => {
    ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
    fixture.detectChanges();

    component.searchQuery.set('nonexistent-query-12345');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.bpp_empty_state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No projects match your filter criteria');

    const resetBtn = fixture.nativeElement.querySelector('.bpp_reset_btn');
    expect(resetBtn).toBeTruthy();
    resetBtn.click();
    fixture.detectChanges();

    expect(component.searchQuery()).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.bpp_card').length).toBe(3);
  });

  describe('BSA-T-2: Viewport-Locked Scroller, Docked Toolbar & Skeleton', () => {
    it('should render docked toolbar above #workArea scroller (BSA-R-4, BSA-R-5, BSA-AC-5, BSA-AC-6)', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;
      const toolbar = hostEl.querySelector('.bpp_toolbar') as HTMLElement;
      const workArea = hostEl.querySelector('#workArea') as HTMLElement;

      expect(toolbar).toBeTruthy();
      expect(toolbar.classList.contains('bpp_toolbar_docked')).toBe(true);
      expect(toolbar.classList.contains('flex-none')).toBe(true);

      expect(workArea).toBeTruthy();
      // Verify workArea has overflow-y-auto at >=900px responsive class
      expect(workArea.className).toContain('min-[900px]:overflow-y-auto');
      expect(workArea.className).toContain('min-[900px]:flex-1');
      expect(workArea.className).toContain('min-[900px]:min-h-0');
      expect(workArea.className).toContain('custom_scroll');

      // Verify toolbar is docked above #workArea in DOM order
      expect(toolbar.compareDocumentPosition(workArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(toolbar.nextElementSibling).toBe(workArea);
    });

    it('should enclose KPI cards and catalog inside #workArea scroller (BSA-DD-4, BSA-DD-5)', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      const workArea = fixture.nativeElement.querySelector('#workArea') as HTMLElement;
      expect(workArea).toBeTruthy();

      const kpiSection = workArea.querySelector('.bpp_kpi_section');
      const catalogHeader = workArea.querySelector('.bpp_catalog_header');

      expect(kpiSection).toBeTruthy();
      expect(catalogHeader).toBeTruthy();
    });

    it('should render modern skeleton loading state using .pr-skeleton when loading is true (BSA-R-8, BSA-AC-9)', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const skeletonHost = fixture.nativeElement.querySelector('[data-testid="bpp-loading-skeleton"]');
      expect(skeletonHost).toBeTruthy();

      const skeletons = fixture.nativeElement.querySelectorAll('.pr-skeleton');
      expect(skeletons.length).toBe(9); // 5 KPI skeleton cards + 4 catalog grid cards
      expect(fixture.nativeElement.querySelector('.pi-spinner')).toBeNull();
    });
  });

  // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15, COV-AC-13, COV-DD-9)
  describe('COV-T-7: reads program / multi / project from the shared query-param contract', () => {
    // COV-T-8 HITL finding (D2/D10, COV-AC-13/COV-R-15): the live
    // `GET api/bilateral/center/projects` endpoint returns `id` as a STRING (e.g. `"1368"`), even
    // though `BilateralProject.id` is typed `number`. The highlight comparison must therefore
    // normalize both sides through `Number()` rather than relying on `===`. This fixture matches
    // that real, string-id payload shape so the regression is caught by Jest, not only in prod.
    const mockProjectsWithStringIds = mockProjects.map(p => ({ ...p, id: String(p.id) })) as unknown as BilateralProject[];

    beforeEach(() => {
      jest.useFakeTimers();
      bilateralApiService.GET_bilateralProjects.mockReturnValue(of({ response: mockProjectsWithStringIds }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('pre-selects the SP quick filter from `?program=` (matched by programCode), catalog count unchanged', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ program: 'SP04' });
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      expect(component.selectedProgramFilter()).toBe('SP04');
      expect(component.filteredProjects().length).toBe(1);
      expect(component.filteredProjects()[0].shortName).toBe('B-A1532');
      // The catalog itself is not narrowed to one card by the deep link mechanism — the SP filter
      // is the SAME quick filter a manual click would apply, so the full catalog is still there,
      // just filtered by that one dimension (unlike `project`, which never filters at all).
      expect(component.projects().length).toBe(3);
    });

    it('turns on the Multi-Program quick filter from `?multi=1`', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ multi: '1' });
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      expect(component.selectedMultiProgramOnly()).toBe(true);
      expect(component.filteredProjects().length).toBe(1);
      expect(component.filteredProjects()[0].shortName).toBe('B-A1368');
    });

    it('highlights and scrolls to exactly one card from `?project=`, without filtering the catalog', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ project: '102' });
      const scrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoView;

      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();
      jest.advanceTimersByTime(0);
      fixture.detectChanges();

      // catalog count unchanged — highlight, not filter
      expect(component.filteredProjects().length).toBe(3);
      expect(component.highlightedProjectId()).toBe(102);

      const highlighted = fixture.nativeElement.querySelectorAll('.bpp_card--highlight');
      expect(highlighted.length).toBe(1);
      expect(highlighted[0].getAttribute('data-project-id')).toBe('102');
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    });

    it('clears the highlight after the transient window elapses', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ project: '102' });
      Element.prototype.scrollIntoView = jest.fn();

      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();
      jest.advanceTimersByTime(0);

      expect(component.highlightedProjectId()).toBe(102);

      jest.advanceTimersByTime(2000);
      expect(component.highlightedProjectId()).toBeNull();
    });

    it('does nothing when `?project=` does not match a loaded project', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ project: '999' });
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      expect(component.highlightedProjectId()).toBeNull();
    });

    /**
     * `COV-R-15`/hard rule 6 — the highlight is applied as one state class (`.bpp_card--highlight`)
     * regardless of `prefers-reduced-motion`; the component SCSS's own
     * `@media (prefers-reduced-motion: reduce) { transition: none }` rule (not evaluated by jsdom)
     * is what removes the animated fade, so the reduced-motion path renders the SAME static ring —
     * this asserts the component applies that one class consistently, which is what the CSS rule
     * depends on.
     */
    it('applies the highlight as a state class independent of `prefers-reduced-motion` (static ring path)', () => {
      activatedRouteStub.snapshot.queryParamMap = convertToParamMap({ project: '101' });
      Element.prototype.scrollIntoView = jest.fn();
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();
      jest.advanceTimersByTime(0);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('[data-project-id="101"]');
      expect(card.classList.contains('bpp_card--highlight')).toBe(true);
    });
  });

  describe('BGT-T-3: Guided tour instrumentation', () => {
    it('renders data-guide="bilateral-tab-reporting" on the toolbar container (BGT-T-3, BGT-R-2, Gate D1)', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      const reportingEl = fixture.nativeElement.querySelector('[data-guide="bilateral-tab-reporting"]');
      expect(reportingEl).toBeTruthy();
    });

    it('renders data-guide="bilateral-reporting-kpis" on the KPI summary section', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      fixture.detectChanges();

      const kpisEl = fixture.nativeElement.querySelector('[data-guide="bilateral-reporting-kpis"]');
      expect(kpisEl).toBeTruthy();
    });

    it('renders data-guide="bilateral-project-card" and data-guide="bilateral-project-create-result" on the first project in grid view', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      component.setViewMode('grid');
      fixture.detectChanges();

      const cardEl = fixture.nativeElement.querySelector('[data-guide="bilateral-project-card"]');
      expect(cardEl).toBeTruthy();
      expect(cardEl.getAttribute('data-project-id')).toBe('101');

      const createBtnEl = fixture.nativeElement.querySelector('[data-guide="bilateral-project-create-result"]');
      expect(createBtnEl).toBeTruthy();
      expect(createBtnEl.textContent).toContain('Create result');
    });

    it('renders data-guide="bilateral-project-card" and data-guide="bilateral-project-create-result" on the first project in list view', () => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      component.setViewMode('list');
      fixture.detectChanges();

      const rowEl = fixture.nativeElement.querySelector('tr[data-guide="bilateral-project-card"]');
      expect(rowEl).toBeTruthy();
      expect(rowEl.getAttribute('data-project-id')).toBe('101');

      const createBtnEl = fixture.nativeElement.querySelector('button[data-guide="bilateral-project-create-result"]');
      expect(createBtnEl).toBeTruthy();
      expect(createBtnEl.textContent).toContain('Create result');
    });
  });

  describe('Project cards reported results count & navigation to results tab', () => {
    beforeEach(() => {
      ctx.setCenter('Bioversity', 'Bioversity International', 'Bioversity');
      ctx.selectedVersionId.set(36);
      fixture.detectChanges();
    });

    it('should compute resultsCountByProject correctly from overviewService results', () => {
      expect(component.getProjectResultsCount(mockProjects[0])).toBe(2);
      expect(component.getProjectResultsCount(mockProjects[1])).toBe(1);
      expect(component.getProjectResultsCount(mockProjects[2])).toBe(0);
    });

    it('should render results count badge on cards in grid view', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.bpp_card');
      expect(cards.length).toBe(3);

      const firstBadge = cards[0].querySelector('.bpp_results_badge');
      expect(firstBadge).toBeTruthy();
      expect(firstBadge.textContent).toContain('2 results');
      expect(firstBadge.classList.contains('bpp_results_badge--has-results')).toBe(true);

      const thirdBadge = cards[2].querySelector('.bpp_results_badge');
      expect(thirdBadge).toBeTruthy();
      expect(thirdBadge.textContent).toContain('0 results');
      expect(thirdBadge.classList.contains('bpp_results_badge--has-results')).toBe(false);
    });

    it('should render results footer link in card footer in grid view', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.bpp_card');
      const firstLink = cards[0].querySelector('.bpp_results_footer_link');
      expect(firstLink).toBeTruthy();
      expect(firstLink.textContent).toContain('View results (2)');
    });

    it('should render results column and badge in table view', () => {
      component.setViewMode('list');
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.bpp_table_row');
      expect(rows.length).toBe(3);

      const firstCell = rows[0].querySelector('.bpp_td_results');
      expect(firstCell).toBeTruthy();
      expect(firstCell.textContent).toContain('2');

      const thirdCell = rows[2].querySelector('.bpp_td_results');
      expect(thirdCell).toBeTruthy();
      expect(thirdCell.textContent).toContain('0');
    });

    it('opens manual create drawer when card is clicked', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.bpp_card');
      expect(manualCreateFlow.drawerOpen()).toBe(false);
      cards[0].click();

      expect(manualCreateFlow.drawerOpen()).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('navigates to results tab when clicking results badge in card header', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bpp_card .bpp_results_badge') as HTMLElement;
      badge.click();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bilateral', 'Bioversity', 'results'],
        {
          queryParams: {
            project: 101,
            role: 'all',
            source: 'all',
            phase: 36
          }
        }
      );
    });

    it('navigates to results tab when clicking results footer link', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('.bpp_card .bpp_results_footer_link') as HTMLElement;
      link.click();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bilateral', 'Bioversity', 'results'],
        {
          queryParams: {
            project: 101,
            role: 'all',
            source: 'all',
            phase: 36
          }
        }
      );
    });

    it('opens manual create drawer when row is clicked in table view', () => {
      component.setViewMode('list');
      fixture.detectChanges();

      const row = fixture.nativeElement.querySelector('.bpp_table_row') as HTMLElement;
      expect(manualCreateFlow.drawerOpen()).toBe(false);
      row.click();

      expect(manualCreateFlow.drawerOpen()).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('navigates to results tab when clicking results badge in table view', () => {
      component.setViewMode('list');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.bpp_td_results .bpp_results_badge') as HTMLElement;
      badge.click();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/bilateral', 'Bioversity', 'results'],
        {
          queryParams: {
            project: 101,
            role: 'all',
            source: 'all',
            phase: 36
          }
        }
      );
    });

    it('opens manual create drawer when Create result button is clicked', () => {
      component.setViewMode('grid');
      fixture.detectChanges();

      const createBtn = fixture.nativeElement.querySelector('[data-testid="bilateral-project-create-result"]') as HTMLElement;
      mockRouter.navigate.mockClear();

      createBtn.click();

      expect(manualCreateFlow.drawerOpen()).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
