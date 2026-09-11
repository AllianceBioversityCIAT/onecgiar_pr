import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, booleanAttribute, computed, forwardRef, signal } from '@angular/core';
import {
  PrTableEmptyDirective,
  PrTableExpandedRowDirective,
  PrTableGroupHeaderDirective,
  PrTableHeaderDirective,
  PrTableLoadingDirective
} from './pr-table.directives';
import { PR_TABLE_HOST } from './pr-table.host';

/**
 * app-pr-group-table — PRMS grouped/expandable data table (PrimeNG p-table
 * `rowGroupMode="subheader"` replacement).
 *
 * In every PRMS consumer each item of `[value]` already IS a group (with nested
 * children rendered by the expanded-row template), so this renders, per item:
 *   1. the group-header row (prTableGroupHeader, ctx { $implicit, expanded, rowIndex })
 *   2. when expanded, the expanded-row block (prTableExpandedRow, ctx { $implicit })
 *
 *   <app-pr-group-table [value]="groups" dataKey="key" [expandedRowKeys]="expanded()"
 *                       sortField="key" [sortOrder]="1" [loading]="loading()">
 *     <ng-template prTableHeader> <tr>…</tr> </ng-template>
 *     <ng-template prTableGroupHeader let-item let-expanded="expanded">
 *       <tr><td [prRowToggler]="item">…{{ expanded ? '▾' : '▸' }}…</td></tr>
 *     </ng-template>
 *     <ng-template prTableExpandedRow let-item> …rows… </ng-template>
 *     <ng-template prTableEmpty> … </ng-template>
 *     <ng-template prTableLoading> … </ng-template>
 *   </app-pr-group-table>
 *
 * Expansion state is seeded from `[expandedRowKeys]` (keys with a truthy value)
 * and thereafter owned internally — toggled via the `[prRowToggler]` directive.
 * Re-seeding only happens when the input reference changes (e.g. data reload or
 * expandAll/collapseAll), matching the previous PrimeNG behaviour.
 */
@Component({
  selector: 'app-pr-group-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pr-group-table.component.html',
  styleUrl: './pr-table.component.scss',
  providers: [{ provide: PR_TABLE_HOST, useExisting: forwardRef(() => PrGroupTableComponent) }]
})
export class PrGroupTableComponent {
  @Input() set value(v: unknown[] | null | undefined) {
    this._value.set(Array.isArray(v) ? v : []);
    if (this.page() > this.lastPage()) this.page.set(0);
  }
  get value(): unknown[] {
    return this._value();
  }
  private readonly _value = signal<unknown[]>([]);

  @Input() set sortField(f: string) {
    this._sortField.set(f ?? '');
    this._defaultSortField = f ?? '';
  }
  private readonly _sortField = signal('');
  private _defaultSortField = '';

  @Input() set sortOrder(o: number) {
    const v = Number(o) === -1 ? -1 : 1;
    this._sortOrder.set(v);
    this._defaultSortOrder = v;
  }
  private readonly _sortOrder = signal(1);
  private _defaultSortOrder: 1 | -1 = 1;

  @Input({ transform: booleanAttribute }) paginator = false;

  @Input() set rows(r: number) {
    this._rows.set(Number(r) || 0);
  }
  private readonly _rows = signal(0);

  @Input() rowsPerPageOptions: number[] | null = null;
  @Input() styleClass = '';
  @Input({ transform: booleanAttribute }) loading = false;

  /** Field identifying each group (used for expansion keys). Falls back to groupRowsBy. */
  @Input() dataKey = '';
  @Input() groupRowsBy = '';

  @Input() set first(v: number | string | null | undefined) {
    const n = Number(v) || 0;
    const size = this.effectiveRows() || this._rows() || 1;
    this.page.set(Math.floor(n / size));
  }

  /** Seed the expansion state; keys with a truthy value start expanded. */
  @Input() set expandedRowKeys(rec: Record<string, boolean> | null | undefined) {
    const next = new Set<string>();
    if (rec) {
      for (const key of Object.keys(rec)) {
        if (rec[key]) next.add(key);
      }
    }
    this.expanded.set(next);
  }

  @ContentChild(PrTableHeaderDirective) headerTpl?: PrTableHeaderDirective;
  @ContentChild(PrTableGroupHeaderDirective) groupHeaderTpl?: PrTableGroupHeaderDirective;
  @ContentChild(PrTableExpandedRowDirective) expandedRowTpl?: PrTableExpandedRowDirective;
  @ContentChild(PrTableEmptyDirective) emptyTpl?: PrTableEmptyDirective;
  @ContentChild(PrTableLoadingDirective) loadingTpl?: PrTableLoadingDirective;

  readonly page = signal(0);
  private readonly pageSizeOverride = signal<number | null>(null);
  private readonly expanded = signal<Set<string>>(new Set());

  get keyField(): string {
    return this.dataKey || this.groupRowsBy;
  }

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

  keyOf(item: unknown): string {
    return String(this.resolve(item, this.keyField));
  }

  isExpanded(key: string): boolean {
    return this.expanded().has(key);
  }

  /** Toggle a group's expansion (called by the prRowToggler directive). */
  toggle(item: unknown): void {
    const key = this.keyOf(item);
    const next = new Set(this.expanded());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expanded.set(next);
  }

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
    if (row == null || !field) return null;
    if (!field.includes('.')) return (row as Record<string, unknown>)[field];
    return field.split('.').reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), row);
  }
}
