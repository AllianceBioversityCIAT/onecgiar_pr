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

  @HostListener('click')
  onClick(): void {
    this.table.sort(this.field);
  }
}
