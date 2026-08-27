import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, booleanAttribute, computed, forwardRef, signal } from '@angular/core';
import { PrTableBodyDirective, PrTableEmptyDirective, PrTableHeaderDirective, PrTableLoadingDirective } from './pr-table.directives';
import { PR_TABLE_HOST } from './pr-table.host';

/**
 * app-pr-table — PRMS reusable data table (PrimeNG p-table replacement).
 *
 * Mirrors the common p-table declarative API so migration is close to 1:1:
 *   <app-pr-table [value]="rows" [paginator]="true" [rows]="5"
 *                 [rowsPerPageOptions]="[5,10,15]" sortField="code" [sortOrder]="-1">
 *     <ng-template prTableHeader> <tr>…<th prSortableColumn="code"><pr-sort-icon field="code"/>Code</th></tr> </ng-template>
 *     <ng-template prTableBody let-row let-i="index"> <tr>…</tr> </ng-template>
 *     <ng-template prTableEmpty> <tr><td>No data</td></tr> </ng-template>
 *   </app-pr-table>
 *
 * Handles sorting (single column), client-side pagination, the empty state, a
 * loading slot (prTableLoading), imperative reset(), the [first] page-reset hook
 * and vertical scroll + sticky header ([scrollable]/scrollHeight) in one place.
 * Row grouping / expansion live in the sibling app-pr-group-table; column
 * filtering is owned by the consuming page.
 */
@Component({
  selector: 'app-pr-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pr-table.component.html',
  styleUrl: './pr-table.component.scss',
  providers: [{ provide: PR_TABLE_HOST, useExisting: forwardRef(() => PrTableComponent) }]
})
export class PrTableComponent {
  @Input() set value(v: unknown[] | null | undefined) {
    this._value.set(Array.isArray(v) ? v : []);
    if (this.page() > this.lastPage()) this.page.set(0);
  }
  get value(): unknown[] {
    return this._value();
  }
  private readonly _value = signal<unknown[]>([]);

  /** Initial / active sort column. Empty = keep source order. */
  @Input() set sortField(f: string) {
    this._sortField.set(f ?? '');
    this._defaultSortField = f ?? '';
  }
  private readonly _sortField = signal('');
  /** Snapshot of the bound default, restored by reset(). */
  private _defaultSortField = '';

  /** 1 = ascending, -1 = descending (matches PrimeNG). */
  @Input() set sortOrder(o: number) {
    const v = Number(o) === -1 ? -1 : 1;
    this._sortOrder.set(v);
    this._defaultSortOrder = v;
  }
  private readonly _sortOrder = signal(1);
  private _defaultSortOrder: 1 | -1 = 1;

  @Input({ transform: booleanAttribute }) paginator = false;

  /** Rows per page. */
  @Input() set rows(r: number) {
    this._rows.set(Number(r) || 0);
  }
  private readonly _rows = signal(0);

  @Input() rowsPerPageOptions: number[] | null = null;
  @Input() styleClass = '';
  @Input() selectionMode: 'single' | 'multiple' | null = null;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Accepted for API parity; layout scroll is handled by css. */
  @Input() dataKey = '';

  /** Enables the vertical-scroll body with a sticky header (mirrors p-table [scrollable]). */
  @Input({ transform: booleanAttribute }) scrollable = false;
  /** Max height of the scroll viewport, e.g. 'calc(100vh - 303px)' (mirrors p-table scrollHeight). */
  @Input() scrollHeight = '';

  /**
   * First-record index (mirrors PrimeNG [first]). Setting it moves to the page
   * containing that record — used with `[first]="searchText && 0"` to jump back
   * to page 0 when a search starts/clears. Angular only calls this on value
   * change, so it does not fight manual pagination.
   */
  @Input() set first(v: number | string | null | undefined) {
    const n = Number(v) || 0;
    const size = this.effectiveRows() || this._rows() || 1;
    this.page.set(Math.floor(n / size));
  }

  @ContentChild(PrTableHeaderDirective) headerTpl?: PrTableHeaderDirective;
  @ContentChild(PrTableBodyDirective) bodyTpl?: PrTableBodyDirective;
  @ContentChild(PrTableEmptyDirective) emptyTpl?: PrTableEmptyDirective;
  @ContentChild(PrTableLoadingDirective) loadingTpl?: PrTableLoadingDirective;

  readonly page = signal(0);
  private readonly pageSizeOverride = signal<number | null>(null);

  readonly activeSortField = computed(() => this._sortField());
  readonly activeSortOrder = computed(() => this._sortOrder());

  readonly effectiveRows = computed(() => this.pageSizeOverride() ?? this._rows());

  private readonly sortedValue = computed(() => {
    const data = this._value();
    const field = this._sortField();
    if (!field) return data;
    const order = this._sortOrder();
    return [...data].sort((a, b) => {
      const av = this.resolve(a, field);
      const bv = this.resolve(b, field);
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * order;
      if (bv == null) return 1 * order;
      if (av < bv) return -1 * order;
      if (av > bv) return 1 * order;
      return 0;
    });
  });

  readonly pagedValue = computed(() => {
    const data = this.sortedValue();
    if (!this.paginator) return data;
    const size = this.effectiveRows();
    if (!size) return data;
    const start = this.page() * size;
    return data.slice(start, start + size);
  });

  readonly totalRecords = computed(() => this.sortedValue().length);

  readonly lastPage = computed(() => {
    const size = this.effectiveRows();
    if (!this.paginator || !size) return 0;
    return Math.max(0, Math.ceil(this.totalRecords() / size) - 1);
  });

  readonly pageRangeLabel = computed(() => {
    const total = this.totalRecords();
    const size = this.effectiveRows();
    if (!size || !total) return `0 of ${total}`;
    const start = this.page() * size + 1;
    const end = Math.min(start + size - 1, total);
    return `${start} – ${end} of ${total}`;
  });

  /** Called by prSortableColumn on header click. */
  sort(field: string): void {
    if (!field) return;
    if (this._sortField() === field) {
      this._sortOrder.set(this._sortOrder() === 1 ? -1 : 1);
    } else {
      this._sortField.set(field);
      this._sortOrder.set(1);
    }
    this.page.set(0);
  }

  /**
   * Public imperative reset (mirrors PrimeNG Table.reset()): restore the bound
   * default sort and jump back to the first page. Grabbable via
   * `@ViewChild(PrTableComponent)` or a template ref on <app-pr-table>.
   */
  reset(): void {
    this._sortField.set(this._defaultSortField);
    this._sortOrder.set(this._defaultSortOrder);
    this.page.set(0);
  }

  goToPage(p: number): void {
    this.page.set(Math.min(Math.max(0, p), this.lastPage()));
  }

  setPageSize(size: number): void {
    this.pageSizeOverride.set(size);
    this.page.set(0);
  }

  private resolve(row: unknown, field: string): unknown {
    if (row == null) return null;
    if (!field.includes('.')) return (row as Record<string, unknown>)[field];
    return field.split('.').reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), row);
  }
}
