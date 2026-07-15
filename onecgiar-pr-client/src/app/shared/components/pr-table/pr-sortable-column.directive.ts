import { Directive, HostBinding, HostListener, Input, inject } from '@angular/core';
import { PR_TABLE_HOST } from './pr-table.host';

/**
 * prSortableColumn — mirrors PrimeNG `pSortableColumn="field"` on a <th>.
 * Clicking toggles the parent table (app-pr-table or app-pr-group-table) sort.
 */
@Directive({ selector: '[prSortableColumn]', standalone: true })
export class PrSortableColumnDirective {
  private readonly table = inject(PR_TABLE_HOST);
  @Input('prSortableColumn') field = '';

  @HostBinding('style.cursor') readonly cursor = 'pointer';
  @HostBinding('attr.role') readonly role = 'button';

  /** Reflect the current sort direction for a11y (and for consumers that read aria-sort from the DOM). */
  @HostBinding('attr.aria-sort')
  get ariaSort(): 'ascending' | 'descending' | null {
    if (!this.field || this.table.activeSortField() !== this.field) return null;
    return this.table.activeSortOrder() === 1 ? 'ascending' : 'descending';
  }

  @HostListener('click')
  onClick(): void {
    this.table.sort(this.field);
  }
}
