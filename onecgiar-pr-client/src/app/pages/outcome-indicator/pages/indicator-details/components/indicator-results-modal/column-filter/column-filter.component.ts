import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrFilterMultiselectModule } from '../../../../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';

/**
 * app-column-filter — per-column filter control shown in the indicator-results
 * table header. Native replacement for the previous PrimeNG
 * `<p-columnFilter matchMode="in"><p-multiSelect>` island.
 *
 * NOTE (preserved behaviour): the previous implementation gave `<p-columnFilter>`
 * its OWN isolated PrimeNG `Table`/`TableService` (via component providers), so
 * its selections never reached the parent `<p-table>` rows — i.e. the column
 * filters were cosmetic and did not filter the result list (only the text search
 * did). This refactor keeps that exact behaviour: the multiselect holds a local
 * selection and does not filter the rows. `reset()` clears it.
 */
@Component({
  selector: 'app-column-filter',
  imports: [CommonModule, FormsModule, PrFilterMultiselectModule],
  templateUrl: './column-filter.component.html',
  styleUrl: './column-filter.component.scss',
  standalone: true
})
export class ColumnFilterComponent {
  @Input() title: string;
  @Input() id: string;
  @Input() field: string;
  @Input() options: any[];
  @Input() placeholder: string;
  @Input() optionLabel: string;
  @Input() optionValue: string;

  readonly selected = signal<any[]>([]);

  onChanged(values: any[]): void {
    this.selected.set(values ?? []);
  }

  /** Clear this column's selection (called by the table's "Clear all filters"). */
  reset(): void {
    this.selected.set([]);
  }
}
