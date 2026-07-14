import { Component, Input, computed, inject } from '@angular/core';
import { PrTableComponent } from './pr-table.component';

/**
 * pr-sort-icon — mirrors PrimeNG `<p-sortIcon field="x">`. Reads the parent
 * app-pr-table sort state and shows the current direction for its column.
 */
@Component({
  selector: 'pr-sort-icon',
  standalone: true,
  template: `<i class="material-icons-round pr-sort-icon" [class.pr-sort-icon--active]="state() !== 0">{{ icon() }}</i>`,
  styles: [
    `.pr-sort-icon {
      font-size: 16px;
      vertical-align: middle;
      color: var(--pr-color-accents-5);
    }
    .pr-sort-icon--active {
      color: var(--pr-color-primary-300);
    }`
  ]
})
export class PrSortIconComponent {
  private readonly table = inject(PrTableComponent);
  @Input() field = '';

  readonly state = computed(() => (this.table.activeSortField() === this.field ? this.table.activeSortOrder() : 0));
  readonly icon = computed(() => (this.state() === 1 ? 'arrow_upward' : this.state() === -1 ? 'arrow_downward' : 'unfold_more'));
}
