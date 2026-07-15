import { Directive, HostBinding, HostListener, Input, inject } from '@angular/core';
import { PrTableComponent } from './pr-table.component';

/**
 * prSortableColumn — mirrors PrimeNG `pSortableColumn="field"` on a <th>.
 * Clicking toggles the parent app-pr-table sort for that field.
 */
@Directive({ selector: '[prSortableColumn]', standalone: true })
export class PrSortableColumnDirective {
  private readonly table = inject(PrTableComponent);
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
