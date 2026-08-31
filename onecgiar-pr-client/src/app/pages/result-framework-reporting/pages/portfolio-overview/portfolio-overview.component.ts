import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCog,
  lucideDownload,
  lucideSearch,
  lucideX
} from '@ng-icons/lucide';

import { PrVizChartComponent } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { ResultsListFilterService } from '../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { resolveChartTokens } from '../../../../shared/utils/chart-tokens.util';
import {
  categoryOriginBarOption,
  categoryOriginBarTable,
  centerBilateralOption,
  centerBilateralTable,
  portfolioStatusDonutOption,
  portfolioStatusDonutTable,
  statusPipelineOption,
  programRankingOption,
  programRankingTable,
  programRankingVerticalOption,
  programRankingHeatmapOption,
  programRankingHeatmapTable,
  matrixTableChartOption,
  matrixTableChartTable
} from './portfolio-overview.charts';
import {
  PortfolioBar,
  PortfolioOverviewService,
  PortfolioRow,
  PortfolioStatusSegment
} from './services/portfolio-overview.service';

/** How many bilateral programmes the card shows before `View all` appears. Design: 4. */
export const BILATERAL_PREVIEW = 4;

export const CATEGORY_SHORT_NAMES: Record<string, string> = {
  'Innovation development': 'Inno-Dev',
  'Knowledge product': 'KP',
  'Policy change': 'Policy',
  'Capacity sharing for development': 'Cap-Dev',
  'Capacity change': 'Cap-Change',
  'Innovation use': 'Inno-Use',
  'Other output': 'Other-Out',
  'Other outcome': 'Other-Outc',
  'Impact contribution': 'Impact'
};

export const STATUS_KEY_TO_ID: Record<string, number> = {
  editing: 1,
  'in-qa': 2,
  in_qa: 2,
  quality_assessed: 2,
  'quality-assessed': 2,
  submitted: 3,
  discontinued: 4,
  approved: 6,
  rejected: 7
};

export function getCategoryShortName(category: string): string {
  return CATEGORY_SHORT_NAMES[category] || category;
}

/** A column of the `Progress by science program` matrix. */
export interface PortfolioColumn {
  label: string;
  shortLabel: string;
  /** '' on the programme column (it flexes); every figure column is fixed-width. */
  key: 'programme' | 'total' | 'category';
  /** Index into `PortfolioRow.cells`; -1 for the two non-category columns. */
  cellIndex: number;
}

type SortKey = 'programme' | 'total' | number;

/**
 * Portfolio overview — reporting figures across every science program, admin only.
 *
 * Built from the live Claude Design (`PRMS Reporting.dc.html`, block `showPortfolio`, read
 * 2026-08-24). Column order is the design's, verified in the template rather than inferred from a
 * rendering: a row emits `code`, `name`, **`total`**, then one cell per category — so TOTAL sits
 * between the programme and the categories, not at the end.
 */
@Component({
  selector: 'app-portfolio-overview',
  standalone: true,
  templateUrl: './portfolio-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, PrVizChartComponent],
  providers: [
    PortfolioOverviewService,
    provideIcons({
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideCog,
      lucideDownload,
      lucideSearch,
      lucideX
    })
  ],
  styles: [
    `
      :host {
        display: block;
      }

      /* The design's entrance, shared with the other redesign surfaces. At-rules are one of the
         sanctioned SCSS exceptions to Tailwind-first (client CLAUDE.md §5). */
      @keyframes prmsFade {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      .po-card {
        animation: prmsFade 0.16s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .po-card {
          animation: none;
        }
      }
    `
  ]
})
export class PortfolioOverviewComponent {
  private readonly router = inject(Router);
  private readonly dataControlSE = inject(DataControlService);
  private readonly exportTablesSE = inject(ExportTablesService);
  private readonly resultsListFilterSE = inject(ResultsListFilterService, { optional: true });
  readonly data = inject(PortfolioOverviewService);

  /** Matrix view mode: 'table' or 'chart' */
  readonly matrixViewMode = signal<'table' | 'chart'>('table');
  readonly isExporting = signal<boolean>(false);

  /** Sort state of the matrix. The design ships it sorted by the programme column. */
  readonly sortKey = signal<SortKey>('total');
  readonly sortAsc = signal<boolean>(false);

  /** Search query and pagination state for the matrix table */
  readonly searchQuery = signal<string>('');
  readonly pageSize = signal<number>(14);
  readonly currentPage = signal<number>(1);

  /** Filter by Science Program and Indicator Type */
  readonly selectedProgramFilter = signal<string>('all');
  readonly selectedIndicatorFilter = signal<string>('all');

  /** Selected visible columns for the matrix table */
  readonly availableCategories = computed<string[]>(() => this.data.categories());
  readonly availablePrograms = computed(() =>
    this.data.programmeRows().map(r => ({ code: r.code, name: r.name }))
  );
  readonly selectedCategories = signal<string[]>([]);
  readonly isColumnPickerOpen = signal<boolean>(false);

  /** Custom resizable widths per column */
  readonly columnWidths = signal<Record<string, number>>({});
  readonly isResizing = signal<boolean>(false);

  /** Whether the bilateral card is showing every programme or just the preview. */
  readonly bilateralExpanded = signal<boolean>(false);

  constructor() {
    this.data.load();

    effect(
      () => {
        const cats = this.availableCategories();
        if (cats.length > 0 && this.selectedCategories().length === 0) {
          this.selectedCategories.set([...cats]);
        }
      },
      { allowSignalWrites: true }
    );
  }

  /** `PORTFOLIO · REPORTING CYCLE 2026 · P25` — the phase these figures actually describe. */
  readonly eyebrow = computed(() => {
    const phase = this.dataControlSE?.reportingCurrentPhase;
    const year = this.data.phaseName() ? /\d{4}/.exec(this.data.phaseName())?.[0] : String(phase?.phaseYear ?? '');
    const acronym = this.data.portfolioAcronym() || phase?.portfolioAcronym || '';
    return ['PORTFOLIO', year ? `REPORTING CYCLE ${year}` : '', acronym].filter(Boolean).join(' · ');
  });

  readonly kpis = computed(() => this.data.kpiTotals());
  readonly statusSegments = computed(() => this.data.statusSegments());
  readonly statusTotal = computed(() => this.statusSegments().reduce((sum, s) => sum + s.count, 0));

  private readonly donutPalette = computed(() => {
    const tokens = resolveChartTokens();
    return [...tokens.ramp, tokens.bilateralMuted, tokens.primaryStrong];
  });

  readonly statusDonutOption = computed(() =>
    portfolioStatusDonutOption(this.statusSegments(), this.donutPalette())
  );
  readonly statusDonutTable = computed(() => portfolioStatusDonutTable(this.statusSegments()));

  readonly statusPipelineOption = computed(() =>
    statusPipelineOption(this.statusSegments(), this.donutPalette())
  );

  /** Selected status filter from interactive status metric cards */
  readonly selectedStatusFilter = signal<string>('all');

  toggleStatusFilter(statusKey: string): void {
    if (this.selectedStatusFilter() === statusKey) {
      this.selectedStatusFilter.set('all');
    } else {
      this.selectedStatusFilter.set(statusKey);
    }
    this.currentPage.set(1);
  }

  readonly categoryOriginOption = computed(() =>
    categoryOriginBarOption(this.data.categoryOriginRows(), resolveChartTokens())
  );
  readonly categoryOriginTable = computed(() => categoryOriginBarTable(this.data.categoryOriginRows()));

  readonly programRankingOption = computed(() =>
    programRankingOption(this.data.programRankingRows(), resolveChartTokens())
  );
  readonly programRankingTable = computed(() => programRankingTable(this.data.programRankingRows()));

  readonly programRankingVerticalOption = computed(() =>
    programRankingVerticalOption(this.data.programRankingRows(), resolveChartTokens())
  );

  readonly programRankingHeatmapOption = computed(() =>
    programRankingHeatmapOption(this.data.programmeRows(), this.data.categories(), resolveChartTokens())
  );
  readonly programRankingHeatmapTable = computed(() =>
    programRankingHeatmapTable(this.data.programmeRows(), this.data.categories())
  );

  /** Active visualization mode for Science Programs ranking analysis (default: vertical) */
  readonly analysisViewMode = signal<'horizontal' | 'vertical' | 'heatmap'>('vertical');

  readonly activeAnalysisOption = computed(() => {
    switch (this.analysisViewMode()) {
      case 'vertical':
        return this.programRankingVerticalOption();
      case 'heatmap':
        return this.programRankingHeatmapOption();
      case 'horizontal':
      default:
        return this.programRankingOption();
    }
  });

  readonly activeAnalysisTable = computed(() => {
    switch (this.analysisViewMode()) {
      case 'heatmap':
        return this.programRankingHeatmapTable();
      case 'vertical':
      case 'horizontal':
      default:
        return this.programRankingTable();
    }
  });

  setAnalysisViewMode(mode: 'horizontal' | 'vertical' | 'heatmap'): void {
    this.analysisViewMode.set(mode);
  }

  readonly centerBilateralOption = computed(() =>
    centerBilateralOption(this.data.centerDistributionRows(), resolveChartTokens())
  );
  readonly centerBilateralTable = computed(() => centerBilateralTable(this.data.centerDistributionRows()));

  segmentWidth(segment: PortfolioStatusSegment): number {
    const total = this.statusTotal();
    return total ? (segment.count / total) * 100 : 0;
  }

  showsSegmentCount(segment: PortfolioStatusSegment): boolean {
    return this.segmentWidth(segment) > 8;
  }

  readonly maxMatrixCellValue = computed(() => {
    let max = 0;
    for (const row of this.rows()) {
      for (const val of row.cells) {
        if (val > max) max = val;
      }
    }
    return max || 1;
  });

  cellIntensity(value: number): number {
    return value > 0 ? Math.min(1, Math.max(0.08, value / this.maxMatrixCellValue())) : 0;
  }

  /** Programme column + TOTAL + selected category columns. */
  readonly columns = computed<PortfolioColumn[]>(() => {
    const allCats = this.data.categories();
    const active = this.selectedCategories();
    const categoryColumns: PortfolioColumn[] = [];

    allCats.forEach((name, index) => {
      if (active.includes(name)) {
        categoryColumns.push({
          label: name,
          shortLabel: getCategoryShortName(name),
          key: 'category',
          cellIndex: index
        });
      }
    });

    return [
      { label: 'Science program', shortLabel: 'Science Program', key: 'programme', cellIndex: -1 },
      { label: 'Total', shortLabel: 'Total', key: 'total', cellIndex: -1 },
      ...categoryColumns
    ];
  });

  getColumnWidth(column: PortfolioColumn): number {
    const custom = this.columnWidths()[column.label];
    if (custom) return custom;
    if (column.key === 'programme') return 280;
    if (column.key === 'total') return 80;
    return 95;
  }

  private resizingColumn: PortfolioColumn | null = null;
  private startX = 0;
  private startWidth = 0;

  onResizeStart(event: MouseEvent, column: PortfolioColumn): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizingColumn = column;
    this.startX = event.clientX;
    this.startWidth = this.getColumnWidth(column);
    this.isResizing.set(true);

    const onMouseMove = (e: MouseEvent) => {
      if (!this.resizingColumn) return;
      const deltaX = e.clientX - this.startX;
      const minWidth = this.resizingColumn.key === 'programme' ? 140 : 50;
      const newWidth = Math.max(minWidth, this.startWidth + deltaX);
      this.columnWidths.update(w => ({ ...w, [this.resizingColumn!.label]: newWidth }));
    };

    const onMouseUp = () => {
      this.resizingColumn = null;
      this.isResizing.set(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /** The matrix rows under the active sort. */
  readonly rows = computed<PortfolioRow[]>(() => {
    const key = this.sortKey();
    const dir = this.sortAsc() ? 1 : -1;
    const value = (row: PortfolioRow): string | number =>
      key === 'programme' ? row.code : key === 'total' ? row.total : (row.cells[key] ?? 0);

    return [...this.data.programmeRows()].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * (key === 'programme' ? -dir : dir);
      return (Number(va) - Number(vb)) * dir;
    });
  });

  /** Filtered rows matching search query, SP filter and Indicator Type filter */
  readonly filteredRows = computed<PortfolioRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const progFilter = this.selectedProgramFilter();
    const indFilter = this.selectedIndicatorFilter();
    const allCats = this.data.categories();
    const indIndex = indFilter !== 'all' ? allCats.indexOf(indFilter) : -1;

    return this.rows().filter(r => {
      if (query && !r.code.toLowerCase().includes(query) && !r.name.toLowerCase().includes(query)) {
        return false;
      }
      if (progFilter !== 'all' && r.code !== progFilter) {
        return false;
      }
      if (indIndex >= 0 && (r.cells[indIndex] ?? 0) <= 0) {
        return false;
      }
      return true;
    });
  });

  readonly totalFilteredRows = computed(() => this.filteredRows().length);

  readonly hasActiveFilters = computed(
    () =>
      Boolean(this.searchQuery().trim()) ||
      this.selectedProgramFilter() !== 'all' ||
      this.selectedIndicatorFilter() !== 'all'
  );

  setProgramFilter(code: string): void {
    this.selectedProgramFilter.set(code);
    this.currentPage.set(1);
  }

  setIndicatorFilter(category: string): void {
    this.selectedIndicatorFilter.set(category);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedProgramFilter.set('all');
    this.selectedIndicatorFilter.set('all');
    this.currentPage.set(1);
  }

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    if (size === 0) return 1;
    return Math.max(1, Math.ceil(this.totalFilteredRows() / size));
  });

  /** Paginated rows to render in current page */
  readonly paginatedRows = computed<PortfolioRow[]>(() => {
    const size = this.pageSize();
    if (size === 0) return this.filteredRows();
    const start = (this.currentPage() - 1) * size;
    return this.filteredRows().slice(start, start + size);
  });

  readonly paginationStart = computed(() => {
    if (this.totalFilteredRows() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly paginationEnd = computed(() => {
    const size = this.pageSize();
    if (size === 0) return this.totalFilteredRows();
    return Math.min(this.currentPage() * size, this.totalFilteredRows());
  });

  /** The bilateral rows actually rendered — the preview, or all of them once expanded. */
  readonly bilateralRows = computed<PortfolioBar[]>(() =>
    this.bilateralExpanded() ? this.data.bilateralBars() : this.data.bilateralBars().slice(0, BILATERAL_PREVIEW)
  );

  readonly bilateralHasMore = computed(() => this.data.bilateralBars().length > BILATERAL_PREVIEW);

  readonly matrixCategoryColumns = computed(() =>
    this.columns().filter(c => c.key === 'category')
  );

  readonly matrixChartOption = computed(() =>
    matrixTableChartOption(this.filteredRows(), this.matrixCategoryColumns(), resolveChartTokens())
  );

  readonly matrixChartTable = computed(() =>
    matrixTableChartTable(this.filteredRows(), this.matrixCategoryColumns())
  );

  setMatrixViewMode(mode: 'table' | 'chart'): void {
    this.matrixViewMode.set(mode);
  }

  async exportToExcel(): Promise<void> {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    try {
      const rows = this.filteredRows();
      const catCols = this.matrixCategoryColumns();

      const exportData = rows.map(row => {
        const rowObj: Record<string, string | number> = {
          'Science Program': row.code,
          'Program Name': row.name,
          'Total Results': row.total
        };
        catCols.forEach(col => {
          rowObj[col.label] = row.cells[col.cellIndex] ?? 0;
        });
        return rowObj;
      });

      // Append summary row
      const footer = this.data.footer();
      const summaryObj: Record<string, string | number> = {
        'Science Program': 'TOTAL',
        'Program Name': 'All Science Programs',
        'Total Results': footer.total
      };
      catCols.forEach(col => {
        summaryObj[col.label] = footer.cells[col.cellIndex] ?? 0;
      });
      exportData.push(summaryObj);

      const wscols = [
        { header: 'Science Program', key: 'Science Program', width: 18 },
        { header: 'Program Name', key: 'Program Name', width: 36 },
        { header: 'Total Results', key: 'Total Results', width: 16 },
        ...catCols.map(col => ({ header: col.label, key: col.label, width: 24 }))
      ];

      const phaseYear = this.data.phaseName() ? /\d{4}/.exec(this.data.phaseName())?.[0] : '2026';
      const fileName = `Portfolio-Progress-Science-Programs-${phaseYear}`;

      await this.exportTablesSE.exportExcel(exportData, fileName, wscols);
    } finally {
      this.isExporting.set(false);
    }
  }

  /** Mutually exclusive view states — the design draws three independent blocks, this does not. */
  readonly isLoading = computed(() => this.data.loading());
  readonly hasError = computed(() => !this.data.loading() && !!this.data.error());
  readonly isEmpty = computed(() => !this.data.loading() && !this.data.error() && this.data.total() === 0);
  readonly hasFigures = computed(() => !this.data.loading() && !this.data.error() && this.data.total() > 0);

  columnKey(column: PortfolioColumn): SortKey {
    return column.key === 'category' ? column.cellIndex : column.key;
  }

  isSorted(column: PortfolioColumn): boolean {
    return this.sortKey() === this.columnKey(column);
  }

  /** Header click: same column flips the direction, a new column starts descending. */
  sortBy(column: PortfolioColumn): void {
    const key = this.columnKey(column);
    if (this.sortKey() === key) {
      this.sortAsc.update(asc => !asc);
      return;
    }
    this.sortKey.set(key);
    this.sortAsc.set(false);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement)?.value ?? '';
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  toggleColumnPicker(): void {
    this.isColumnPickerOpen.update(v => !v);
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories().includes(cat);
  }

  toggleCategory(cat: string): void {
    this.selectedCategories.update(current => {
      if (current.includes(cat)) {
        if (current.length === 1) return current;
        return current.filter(c => c !== cat);
      }
      return [...current, cat];
    });
  }

  selectAllCategories(): void {
    this.selectedCategories.set([...this.availableCategories()]);
  }

  deselectAllCategories(): void {
    const first = this.availableCategories()[0];
    this.selectedCategories.set(first ? [first] : []);
  }

  toggleBilateral(): void {
    this.bilateralExpanded.update(open => !open);
  }

  /**
   * A programme row opens that programme's Results tab — the one surface that lists exactly the
   * results this row counts. Same destination for the bilateral card: the tab carries an Origin
   * filter, but it takes no query param to preselect it, so preselecting is not invented here.
   */
  openProgramme(code: string): void {
    if (!code) return;
    this.router.navigate(['/result-framework-reporting', 'entity-details', code, 'results']);
  }

  navigateToResultsCenter(
    filter?: 'all' | 'w1w2' | 'bilateral',
    extra?: { status?: number | string; search?: string; category?: string; program?: string }
  ): void {
    if (filter === 'bilateral') {
      this.router.navigate(['/result-framework-reporting/bilateral-results']);
      return;
    }

    if (this.resultsListFilterSE) {
      if (filter === 'w1w2') {
        this.resultsListFilterSE.selectedFundingSource.set([{ id: 1, name: 'W1/W2' }]);
      } else {
        this.resultsListFilterSE.selectedFundingSource.set([]);
      }

      if (extra?.status) {
        const sId =
          typeof extra.status === 'number'
            ? extra.status
            : STATUS_KEY_TO_ID[extra.status] ?? Number(extra.status);
        if (!isNaN(sId)) {
          this.resultsListFilterSE.selectedStatus.set([{ status_id: sId }]);
        }
      } else {
        this.resultsListFilterSE.selectedStatus.set([]);
      }

      if (extra?.category) {
        this.resultsListFilterSE.text_to_search.set(extra.category);
      } else if (extra?.program) {
        this.resultsListFilterSE.text_to_search.set(extra.program);
      } else if (extra?.search) {
        this.resultsListFilterSE.text_to_search.set(extra.search);
      } else {
        this.resultsListFilterSE.text_to_search.set('');
      }
    }

    const queryParams: Record<string, string | number> = {};
    if (filter === 'w1w2') queryParams['funding'] = 'w1w2';
    if (extra?.status) {
      const sId =
        typeof extra.status === 'number'
          ? extra.status
          : STATUS_KEY_TO_ID[extra.status] ?? Number(extra.status);
      if (!isNaN(sId)) queryParams['status'] = sId;
    }
    if (extra?.category) queryParams['category'] = extra.category;
    if (extra?.program) queryParams['program'] = extra.program;
    if (extra?.search) queryParams['search'] = extra.search;

    this.router.navigate(['/result/results-outlet/results-list'], { queryParams });
  }

  onCategoryCellClick(row: PortfolioRow, column: PortfolioColumn): void {
    if (!row || !column) return;
    this.navigateToResultsCenter('all', { program: row.code, category: column.label });
  }

  scrollToMatrixSection(): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('progress-by-science-program');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  onStatusChartClick(event: any): void {
    if (event?.name) {
      const name = String(event.name).toLowerCase();
      const match = this.statusSegments().find(
        s => s.label.toLowerCase() === name || s.key.toLowerCase() === name
      );
      if (match) {
        this.toggleStatusFilter(match.key);
      }
    }
  }

  onRankingChartClick(event: any): void {
    if (this.analysisViewMode() === 'heatmap') {
      const data = event?.data as [number, number, number] | undefined;
      if (Array.isArray(data) && typeof data[1] === 'number') {
        const row = this.data.programmeRows()[data[1]];
        if (row?.code) {
          this.navigateToResultsCenter('all', { program: row.code });
        }
      }
    } else if (event?.name) {
      const code = String(event.name).split(' ')[0].trim();
      const row = this.data.programmeRows().find(r => r.code === code || r.name === event.name);
      if (row?.code) {
        this.navigateToResultsCenter('all', { program: row.code });
      }
    }
  }

  onCategoryOriginChartClick(event: any): void {
    if (event?.name) {
      const catName = String(event.name);
      const match = this.data.categories().find(
        c =>
          c.toLowerCase() === catName.toLowerCase() ||
          CATEGORY_SHORT_NAMES[c]?.toLowerCase() === catName.toLowerCase()
      );
      this.navigateToResultsCenter('all', { category: match || catName });
    }
  }

  onBilateralChartClick(): void {
    this.router.navigate(['/result-framework-reporting/bilateral-results']);
  }

  onMatrixChartClick(event: any): void {
    if (event?.name) {
      const code = String(event.name).split(' ')[0].trim();
      const row = this.data.programmeRows().find(r => r.code === code || r.name === event.name);
      if (row?.code) {
        this.navigateToResultsCenter('all', { program: row.code });
      }
    }
  }
}
