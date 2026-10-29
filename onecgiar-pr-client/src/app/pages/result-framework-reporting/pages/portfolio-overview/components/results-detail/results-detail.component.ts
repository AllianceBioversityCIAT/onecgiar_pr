// @akili-spec changes/portfolio-overview-revamp/filtered-detail-export (FDE-T-2, design 5.2)
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan/button';
import { HlmInput } from '@spartan/input';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTooltip } from '@spartan/tooltip';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PortfolioResultDimensions } from '../../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { PortfolioDimensionsState, RawResult } from '../../services/portfolio-overview.service';
import {
  DetailSortKey,
  EXPORT_COLUMNS,
  NONE,
  SortDirection,
  buildDetailLabels,
  exportFileName,
  pageOf,
  resultUrl,
  searchRows,
  sortRows,
  toDetailRows,
  toExportRows
} from './results-detail.rows';

type ColumnKey = keyof typeof PORTFOLIO_OVERVIEW_COPY.detail.columns;

interface DetailColumn {
  key: ColumnKey;
  sortKey: DetailSortKey | null;
}

const COLUMNS: readonly DetailColumn[] = [
  { key: 'code', sortKey: 'code' },
  { key: 'title', sortKey: 'title' },
  { key: 'type', sortKey: 'type' },
  { key: 'level', sortKey: 'level' },
  { key: 'program', sortKey: 'program' },
  { key: 'source', sortKey: 'source' },
  { key: 'status', sortKey: 'status' },
  { key: 'origin', sortKey: 'origin' },
  { key: 'leadCenter', sortKey: 'leadCenter' },
  { key: 'contributingCenters', sortKey: null },
  { key: 'projects', sortKey: null },
  { key: 'phase', sortKey: 'phase' }
];

const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;

/** Excel column widths, keyed like `toExportRows`; the 13th is the hyperlink column. */
const EXPORT_WSCOLS = EXPORT_COLUMNS.map(header => ({ header, key: header, width: header === 'Title' || header === 'Link' ? 60 : 20 }));

/**
 * Results detail: searchable, sortable, paged table of the filtered rows plus Excel export of ALL listed rows
 * (spec filtered-detail-export). Presentational: inputs only (FDE-DD-2), view state is local.
 */
@Component({
  selector: 'app-portfolio-results-detail',
  imports: [HlmButtonImports, HlmInput, HlmSkeleton, HlmTooltip],
  templateUrl: './results-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioResultsDetailComponent {
  private readonly exportTables = inject(ExportTablesService);

  /** Filtered page rows (before the section's search). */
  readonly rows = input<readonly RawResult[]>([]);
  /** Filters pending (map loading): skeleton rows, export disabled. */
  readonly pending = input<boolean>(false);
  readonly dimensionsStatus = input<PortfolioDimensionsState['status']>('idle');
  /** The dimensions map (`dimensions().map`); labels are built from it once. */
  readonly dimensionsMap = input<PortfolioResultDimensions | null>(null);
  readonly partial = input<boolean>(false);
  readonly fetchedCount = input<number>(0);
  readonly phaseName = input<string>('');

  readonly copy = PORTFOLIO_OVERVIEW_COPY.detail;
  readonly columns = COLUMNS;
  readonly skeletonRows = SKELETON_ROWS;
  readonly none = NONE;

  readonly search = signal('');
  readonly sort = signal<{ key: DetailSortKey; dir: SortDirection }>({ key: 'code', dir: 'desc' });
  readonly exporting = signal(false);
  /** Resets to 1 whenever rows, search or sort change (FDE-R-7, DD-8). */
  readonly page = linkedSignal<unknown, number>({
    source: () => ({ rows: this.rows(), search: this.search(), sort: this.sort() }),
    computation: () => 1
  });

  /** Computed once; the screen link and the file link come from the same `resultUrl`. */
  private readonly origin = globalThis.location?.origin ?? '';

  private readonly labels = computed(() => {
    const map = this.dimensionsMap();
    return buildDetailLabels(map ?? { projectLinks: [], centerLinks: [], projects: [], centers: [] });
  });
  private readonly detailRows = computed(() => toDetailRows(this.rows(), this.dimensionsStatus(), this.labels()));
  /** Searched and sorted: every listed row, all pages. */
  readonly listed = computed(() => sortRows(searchRows(this.detailRows(), this.search()), this.sort().key, this.sort().dir));
  readonly slice = computed(() => pageOf(this.listed(), this.page()));
  readonly searchActive = computed(() => this.search().trim() !== '');
  readonly countText = computed(() => (this.searchActive() ? this.copy.countOf(this.listed().length, this.rows().length) : this.copy.count(this.rows().length)));
  readonly exportDisabled = computed(() => this.listed().length === 0 || this.pending() || this.exporting());

  setSearch(value: string): void {
    this.search.set(value ?? '');
  }

  clearSearch(): void {
    this.search.set('');
  }

  toggleSort(key: DetailSortKey): void {
    const current = this.sort();
    this.sort.set(current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  ariaSort(key: DetailSortKey | null): 'ascending' | 'descending' | 'none' | null {
    if (!key) return null;
    const { key: active, dir } = this.sort();
    if (active !== key) return 'none';
    return dir === 'asc' ? 'ascending' : 'descending';
  }

  goTo(page: number): void {
    this.page.set(pageOf(this.listed(), page).page);
  }

  linkFor(code: string, versionId: number | string | null): string {
    return resultUrl(code, versionId, this.origin);
  }

  /** Whole searched + sorted list, never the page (FDE-R-8). `exportExcel` swallows errors, so busy resets in `finally` (DD-6). */
  async exportToExcel(): Promise<void> {
    if (this.exportDisabled()) return;
    this.exporting.set(true);
    try {
      // exactFileName (FDE-DD-9): the shared service otherwise appends a timestamp and a second ".xlsx".
      await this.exportTables.exportExcel(
        toExportRows(this.listed(), this.origin),
        exportFileName(this.phaseName(), new Date(), this.partial()),
        EXPORT_WSCOLS,
        [{ cellNumber: 13, cellKey: 'Link' }],
        { exactFileName: true }
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
