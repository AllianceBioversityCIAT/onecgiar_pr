import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PortfolioOverviewComponent } from './portfolio-overview.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {},
  RadarChart: class RadarChart {},
  TreeChart: class TreeChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {},
  RadarComponent: class RadarComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

/**
 * Raw items shaped exactly like `GET /api/results/get/all/roles/filter/{userId}` (verified live on
 * prtest 2026-08-24), including the two traps: `status_id` / `version_id` arrive as STRINGS, and
 * the payload carries EVERY phase, not just the open one.
 */
const raw = (over: Record<string, unknown>) => ({
  submitter: 'SP01',
  submitter_short_name: 'Breeding for Tomorrow',
  result_type: 'Innovation development',
  status_name: 'Editing',
  status_id: '1',
  source_name: 'W1/W2',
  phase_status: 1,
  phase_name: 'Reporting 2026 - P25',
  acronym: 'P25',
  version_id: '36',
  ...over
});

const OPEN_PHASE = [
  raw({}),
  raw({ result_type: 'Policy change' }),
  raw({ status_name: 'Pending Review', status_id: '3', source_name: 'W3/Bilaterals' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', result_type: 'Innovation development', source_name: 'W3/Bilaterals' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', status_name: 'Approved', status_id: '2' })
];

/** Two closed-phase rows that must never reach a counter. */
const CLOSED_PHASE = [
  raw({ phase_status: 0, version_id: '34', phase_name: 'Reporting 2025 - P25', result_type: 'Knowledge product' }),
  raw({ phase_status: 0, version_id: '1', phase_name: 'Reporting 2022 - P22', acronym: 'P22' })
];

describe('PortfolioOverviewComponent', () => {
  let fixture: ComponentFixture<PortfolioOverviewComponent>;
  let component: PortfolioOverviewComponent;
  let router: Router;

  const build = (items: unknown[], meta: Record<string, unknown> = {}) => {
    const apiMock = {
      authSE: { localStorageUser: { id: 2 } },
      resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items, meta } })) }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P25' } } },
        { provide: ExportTablesService, useValue: { exportExcel: jest.fn().mockResolvedValue(undefined) } }
      ]
    });

    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    return apiMock;
  };

  it('counts ONLY the open phase — closed phases are in the same payload', () => {
    build([...OPEN_PHASE, ...CLOSED_PHASE]);

    expect(component.data.total()).toBe(5);
    expect(component.data.closedPhase()).toBe(false);
    // The 2025 Knowledge product row must not have created a category.
    expect(component.data.categories()).not.toContain('Knowledge product');
  });

  it('falls back to the newest phase and says so when nothing is open', () => {
    build(CLOSED_PHASE);

    expect(component.data.closedPhase()).toBe(true);
    // Newest = version_id 34, not the 2022 one.
    expect(component.data.total()).toBe(1);
    expect(fixture.debugElement.nativeElement.textContent).toContain('Viewing a closed phase. Figures are final.');
  });

  describe('Executive KPI Summary Cards (POV-R-1)', () => {
    it('computes accurate KPI totals for Total, W1/W2, Bilateral, and Science Programs', () => {
      build(OPEN_PHASE);

      const kpis = component.kpis();
      expect(kpis.totalResults).toBe(5);
      expect(kpis.phaseLabel).toBe('Reporting 2026 - P25');
      expect(kpis.w1w2Count).toBe(3);
      expect(kpis.w1w2CategoriesCount).toBe(2);
      // W1/W2 submitted or QA: 1 of 3 (SP06 Approved sid=2) = 33% or 67% based on matching criteria
      expect(kpis.bilateralCount).toBe(2);
      expect(kpis.bilateralCentersCount).toBe(2);
      expect(kpis.activeProgramsCount).toBe(2);
      expect(kpis.totalProgramsCount).toBe(13);
      expect(kpis.portfolioProgressPercent).toBe(40);
    });

    it('renders 4 KPI cards in the top deck with correct titles and figures', () => {
      build(OPEN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Total portfolio results');
      expect(text).toContain('W1/W2 results');
      expect(text).toContain('W3/Bilateral results');
      expect(text).toContain('Science programs');

      expect(text).toContain('3 W1/W2');
      expect(text).toContain('2 W3/Bilateral');
      expect(text).toContain('Across 2 result categories');
      expect(text).toContain('Reported across 2 science programs');
      expect(text).toContain('2 / 2');
      expect(text).toContain('40% portfolio progress');
    });
  });

  describe('Portfolio Reporting Status Section (POV-R-2)', () => {
    it('renders the section title, subtitle, donut chart, and progress bar', () => {
      build(OPEN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Portfolio reporting status');
      expect(text).toContain('Aggregate progress across all Science Programs in this cycle');

      const chartHost = fixture.debugElement.query(By.css('app-pr-viz-chart'));
      expect(chartHost).toBeTruthy();
      expect(chartHost.componentInstance.chartTitle()).toBe('Portfolio reporting status');
      expect(chartHost.componentInstance.tableModel()).toBeTruthy();
      expect(chartHost.componentInstance.options()).toBeTruthy();
    });

    it('generates status segments, total, and computes segment widths accurately', () => {
      build(OPEN_PHASE);

      const segments = component.statusSegments();
      expect(segments.length).toBe(6);
      expect(component.statusTotal()).toBe(5);

      const editingSeg = segments.find(s => s.key === 'editing');
      expect(editingSeg).toBeDefined();
      expect(editingSeg?.count).toBe(3);
      expect(component.segmentWidth(editingSeg!)).toBeCloseTo(60);
      expect(component.showsSegmentCount(editingSeg!)).toBe(true);

      const approvedSeg = segments.find(s => s.key === 'approved');
      expect(approvedSeg).toBeDefined();
      expect(approvedSeg?.count).toBe(1);
      expect(component.segmentWidth(approvedSeg!)).toBeCloseTo(20);
      expect(component.showsSegmentCount(approvedSeg!)).toBe(true);

      const discontinuedSeg = segments.find(s => s.key === 'discontinued');
      expect(discontinuedSeg).toBeDefined();
      expect(discontinuedSeg?.count).toBe(0);
      expect(component.segmentWidth(discontinuedSeg!)).toBe(0);
      expect(component.showsSegmentCount(discontinuedSeg!)).toBe(false);
    });

    it('renders dynamic status pipeline and interactive status metric cards with filter toggle', () => {
      build(OPEN_PHASE);

      expect(component.selectedStatusFilter()).toBe('all');
      component.toggleStatusFilter('editing');
      expect(component.selectedStatusFilter()).toBe('editing');

      component.toggleStatusFilter('editing');
      expect(component.selectedStatusFilter()).toBe('all');
    });

    it('renders symmetrical status metric grid with counts and percentages', () => {
      build(OPEN_PHASE);

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Editing');
      expect(text).toContain('In QA');
      expect(text).toContain('Submitted');
      expect(text).toContain('Approved');
      expect(text).toContain('Rejected');
      expect(text).toContain('Discontinued');
    });
  });

  describe('ECharts Visualization Suite (POV-R-2, POV-R-4)', () => {
    it('renders the ECharts visualizations with valid options and table models', () => {
      build(OPEN_PHASE);

      const charts = fixture.debugElement.queryAll(By.css('app-pr-viz-chart'));
      expect(charts.length).toBe(3);

      const titles = charts.map(c => c.componentInstance.chartTitle());
      expect(titles).toEqual([
        'Portfolio reporting status',
        'Status Pipeline',
        'Science Programs output ranking'
      ]);

      for (const chart of charts) {
        expect(chart.componentInstance.options()).toBeTruthy();
      }
    });

    it('switches between vertical bar, horizontal bar, and heatmap analysis modes', () => {
      build(OPEN_PHASE);

      // Default is vertical
      expect(component.analysisViewMode()).toBe('vertical');
      expect(component.activeAnalysisOption()).toBe(component.programRankingVerticalOption());

      // Switch to horizontal
      component.setAnalysisViewMode('horizontal');
      expect(component.analysisViewMode()).toBe('horizontal');
      expect(component.activeAnalysisOption()).toBe(component.programRankingOption());
      expect(component.activeAnalysisTable().caption).toContain('ranked by Science Program');

      // Switch to heatmap
      component.setAnalysisViewMode('heatmap');
      expect(component.analysisViewMode()).toBe('heatmap');
      expect(component.activeAnalysisOption()).toBe(component.programRankingHeatmapOption());
      expect(component.activeAnalysisTable().caption).toContain('heatmap');
    });

    it('computes science program ranking chart options and accessible table model (POV-R-4)', () => {
      build(OPEN_PHASE);

      const option = component.programRankingOption();
      expect(option).toBeTruthy();
      expect(option.series).toBeDefined();

      const table = component.programRankingTable();
      expect(table.caption).toBe('Results progress ranked by Science Program');
      expect(table.headers).toEqual(['Science Program', 'Program Name', 'Editing', 'Submitted / QA', 'Approved', 'Total']);
      expect(table.rows.length).toBe(2);
    });
  });

  describe('Search and Pagination in Matrix Table', () => {
    it('filters rows based on search query by code or name', () => {
      build(OPEN_PHASE);

      expect(component.totalFilteredRows()).toBe(2);

      component.searchQuery.set('SP01');
      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].code).toBe('SP01');

      component.searchQuery.set('Climate');
      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].code).toBe('SP06');

      component.clearSearch();
      expect(component.searchQuery()).toBe('');
      expect(component.totalFilteredRows()).toBe(2);
    });

    it('filters rows by Science Program dropdown or Indicator Type dropdown', () => {
      build(OPEN_PHASE);

      // SP Filter
      component.setProgramFilter('SP01');
      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].code).toBe('SP01');
      expect(component.hasActiveFilters()).toBe(true);

      // Indicator Type Filter: Policy change (SP01 has 1, SP06 has 0)
      component.setProgramFilter('all');
      component.setIndicatorFilter('Policy change');
      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].code).toBe('SP01');

      // Reset filters
      component.resetFilters();
      expect(component.selectedProgramFilter()).toBe('all');
      expect(component.selectedIndicatorFilter()).toBe('all');
      expect(component.hasActiveFilters()).toBe(false);
      expect(component.totalFilteredRows()).toBe(2);
    });

    it('paginates rows accurately with pageSize and page navigation', () => {
      build(OPEN_PHASE);

      component.setPageSize(1);
      expect(component.totalPages()).toBe(2);
      expect(component.paginatedRows().length).toBe(1);
      expect(component.paginationStart()).toBe(1);
      expect(component.paginationEnd()).toBe(1);

      component.nextPage();
      expect(component.currentPage()).toBe(2);
      expect(component.paginationStart()).toBe(2);
      expect(component.paginationEnd()).toBe(2);

      component.prevPage();
      expect(component.currentPage()).toBe(1);

      component.setPageSize(0); // All
      expect(component.paginatedRows().length).toBe(2);
    });
  });

  describe('Enhanced Matrix Table & Heatmap Intensity (POV-R-6)', () => {
    it('puts TOTAL between the programme and the categories, as the design does', () => {
      build(OPEN_PHASE);

      expect(component.columns().map(c => c.label)).toEqual(['Science program', 'Total', 'Innovation development', 'Policy change']);
      expect(component.columns().map(c => c.shortLabel)).toEqual(['Science Program', 'Total', 'Inno-Dev', 'Policy']);
      expect(component.columns()[1].key).toBe('total');
    });

    it('manages column widths and allows custom resizing', () => {
      build(OPEN_PHASE);

      const progCol = component.columns()[0];
      const totalCol = component.columns()[1];
      const catCol = component.columns()[2];

      expect(component.getColumnWidth(progCol)).toBe(280);
      expect(component.getColumnWidth(totalCol)).toBe(80);
      expect(component.getColumnWidth(catCol)).toBe(95);

      // Custom width signal update
      component.columnWidths.set({ 'Innovation development': 140 });
      expect(component.getColumnWidth(catCol)).toBe(140);
    });

    it('allows adding and removing columns dynamically via column picker', () => {
      build(OPEN_PHASE);

      expect(component.availableCategories()).toEqual(['Innovation development', 'Policy change']);
      expect(component.selectedCategories()).toEqual(['Innovation development', 'Policy change']);

      // Toggle column picker
      expect(component.isColumnPickerOpen()).toBe(false);
      component.toggleColumnPicker();
      expect(component.isColumnPickerOpen()).toBe(true);

      // Deselect Policy change
      component.toggleCategory('Policy change');
      expect(component.selectedCategories()).toEqual(['Innovation development']);
      expect(component.columns().map(c => c.label)).toEqual(['Science program', 'Total', 'Innovation development']);

      // Select All
      component.selectAllCategories();
      expect(component.selectedCategories()).toEqual(['Innovation development', 'Policy change']);
      expect(component.columns().map(c => c.label)).toEqual(['Science program', 'Total', 'Innovation development', 'Policy change']);

      // Reset / Deselect All (keeps first)
      component.deselectAllCategories();
      expect(component.selectedCategories()).toEqual(['Innovation development']);
    });

    it('builds one matrix row per programme, with cells aligned to the category columns', () => {
      build(OPEN_PHASE);

      const rows = component.rows();
      expect(rows.map(r => [r.code, r.total])).toEqual([
        ['SP01', 3],
        ['SP06', 2]
      ]);
      // SP01: 2 Innovation development + 1 Policy change. Cell order follows categories().
      expect(rows[0].cells).toEqual([2, 1]);
      expect(rows[1].cells).toEqual([2, 0]);

      // Every row's cells sum to its own total, and the footer sums the whole phase.
      for (const row of rows) expect(row.cells.reduce((a, b) => a + b, 0)).toBe(row.total);
      expect(component.data.footer().total).toBe(5);
      expect(component.data.footer().cells).toEqual([4, 1]);
    });

    it('calculates maxMatrixCellValue and cellIntensity for heatmap styling', () => {
      build(OPEN_PHASE);

      // In OPEN_PHASE: max cell value is 2
      expect(component.maxMatrixCellValue()).toBe(2);

      // 0 value -> 0 intensity
      expect(component.cellIntensity(0)).toBe(0);
      // max value (2) -> 1
      expect(component.cellIntensity(2)).toBe(1);
      // value 1 -> 1 / 2 = 0.5
      expect(component.cellIntensity(1)).toBe(0.5);
    });

    it('sorts on a header click and flips direction on the second', () => {
      build(OPEN_PHASE);

      const programme = component.columns()[0];
      component.sortBy(programme);
      expect(component.rows().map(r => r.code)).toEqual(['SP01', 'SP06']);

      component.sortBy(programme);
      expect(component.rows().map(r => r.code)).toEqual(['SP06', 'SP01']);

      // A different column starts descending again.
      component.sortBy(component.columns()[1]);
      expect(component.sortAsc()).toBe(false);
      expect(component.rows().map(r => r.total)).toEqual([3, 2]);

      // Sort by category column
      const catCol = component.columns()[2];
      component.sortBy(catCol);
      expect(component.sortKey()).toBe(0);
      expect(component.isSorted(catCol)).toBe(true);
    });

    it('opens a programme on the Results tab — the surface that lists exactly what the row counts', () => {
      build(OPEN_PHASE);

      component.openProgramme('SP06');
      expect(router.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP06', 'results']);

      // A row with no code navigates nowhere instead of building a broken url.
      (router.navigate as jest.Mock).mockClear();
      component.openProgramme('');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  it('says the figures are partial instead of passing a truncated portfolio off as the whole thing', () => {
    build(OPEN_PHASE, { total: 900 });

    expect(component.data.isPartial()).toBe(true);
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.textContent).toContain('the server holds more');
  });

  it('keeps the four view states mutually exclusive', () => {
    build([]);
    expect([component.isLoading(), component.hasError(), component.isEmpty(), component.hasFigures()]).toEqual([false, false, true, false]);

    build(OPEN_PHASE);
    expect([component.isLoading(), component.hasError(), component.isEmpty(), component.hasFigures()]).toEqual([false, false, false, true]);
  });

  it('surfaces a failed load instead of rendering empty figures', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        {
          provide: ApiService,
          useValue: { authSE: { localStorageUser: { id: 2 } }, resultsSE: { GET_AllResultsWithUseRole: () => throwError(() => new Error('boom')) } }
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: {} } },
        { provide: ExportTablesService, useValue: { exportExcel: jest.fn() } }
      ]
    });
    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.hasFigures()).toBe(false);
    expect(fixture.debugElement.query(By.css('[role="alert"]'))).toBeTruthy();
  });

  it('toggles matrixViewMode between table and chart', () => {
    build(OPEN_PHASE);

    expect(component.matrixViewMode()).toBe('table');
    component.setMatrixViewMode('chart');
    expect(component.matrixViewMode()).toBe('chart');
    expect(component.matrixChartOption()).toBeTruthy();
    expect(component.matrixChartTable().caption).toContain('Progress by Science Program breakdown');

    component.setMatrixViewMode('table');
    expect(component.matrixViewMode()).toBe('table');
  });

  it('exports progress by science program data to Excel via ExportTablesService', async () => {
    build(OPEN_PHASE);
    const exportSpy = jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcel').mockResolvedValue(undefined as never);

    await component.exportToExcel();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const [exportData, fileName, wscols] = exportSpy.mock.calls[0] as [Record<string, unknown>[], string, unknown[]];
    expect(fileName).toContain('Portfolio-Progress-Science-Programs-2026');
    expect(exportData.length).toBeGreaterThan(0);
    expect(exportData[exportData.length - 1]['Science Program']).toBe('TOTAL');
    expect(wscols.length).toBeGreaterThan(0);
  });

  describe('Interactive Navigation & Click Handlers', () => {
    it('navigates to Results Center or Bilateral results when clicking KPI cards', () => {
      build(OPEN_PHASE);
      const navigateSpy = jest.spyOn(router, 'navigate');

      component.navigateToResultsCenter('all');
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: {} });

      component.navigateToResultsCenter('w1w2');
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { funding: 'w1w2' } });

      component.navigateToResultsCenter('bilateral');
      expect(navigateSpy).toHaveBeenCalledWith(['/result-framework-reporting/bilateral-results']);
    });

    it('handles interactive clicks on charts and table cells', () => {
      build(OPEN_PHASE);
      const navigateSpy = jest.spyOn(router, 'navigate');

      // Status chart click toggles filter
      component.onStatusChartClick({ name: 'Editing' } as any);
      expect(component.selectedStatusFilter()).toBe('editing');

      // Ranking chart click navigates to Results Center filtered by program
      component.onRankingChartClick({ name: 'SP01 Plant Health' } as any);
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { program: 'SP01' } });

      // Bilateral chart click navigates to bilateral results
      component.onBilateralChartClick();
      expect(navigateSpy).toHaveBeenCalledWith(['/result-framework-reporting/bilateral-results']);

      // Matrix chart click navigates to Results Center filtered by program
      component.onMatrixChartClick({ name: 'SP06 Climate Action' } as any);
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { program: 'SP06' } });

      // Category origin chart click navigates to Results Center filtered by category
      component.onCategoryOriginChartClick({ name: 'Knowledge product' } as any);
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], { queryParams: { category: 'Knowledge product' } });

      // Category cell click in table navigates to Results Center with program and category
      const sampleRow = component.paginatedRows()[0];
      const sampleCol = component.columns().find(c => c.key === 'category')!;
      component.onCategoryCellClick(sampleRow, sampleCol);
      expect(navigateSpy).toHaveBeenCalledWith(['/result/results-outlet/results-list'], {
        queryParams: { program: sampleRow.code, category: sampleCol.label }
      });
    });
  });

  it('refuses to load without a session instead of asking the server for user "undefined"', () => {
    TestBed.resetTestingModule();
    const spy = jest.fn();
    TestBed.configureTestingModule({
      imports: [PortfolioOverviewComponent],
      providers: [
        { provide: ApiService, useValue: { authSE: { localStorageUser: null }, resultsSE: { GET_AllResultsWithUseRole: spy } } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: {} } },
        { provide: ExportTablesService, useValue: { exportExcel: jest.fn() } }
      ]
    });
    fixture = TestBed.createComponent(PortfolioOverviewComponent);
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasError()).toBe(true);
  });

  it('names the phase the figures actually describe, not the one the shell thinks is current', () => {
    build(OPEN_PHASE);
    expect(component.eyebrow()).toBe('PORTFOLIO · REPORTING CYCLE 2026 · P25');
  });
});
