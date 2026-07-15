import { Directive, HostBinding, HostListener, Input, inject } from '@angular/core';
import { PrGroupTableComponent } from './pr-group-table.component';

/**
 * prRowToggler — mirrors PrimeNG `[pRowToggler]="item"`. Clicking the host
 * toggles that group's expansion in the parent app-pr-group-table.
 */
@Directive({ selector: '[prRowToggler]', standalone: true })
export class PrRowTogglerDirective {
  private readonly table = inject(PrGroupTableComponent);
  @Input('prRowToggler') item: unknown;

  @HostBinding('style.cursor') readonly cursor = 'pointer';

  @HostListener('click')
  onClick(): void {
    this.table.toggle(this.item);
  }
}
