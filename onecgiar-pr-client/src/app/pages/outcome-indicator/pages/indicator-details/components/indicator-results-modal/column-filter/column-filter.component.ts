import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-column-filter',
  standalone: true,
  imports: [CommonModule, TableModule, MultiSelectModule, FormsModule],
  templateUrl: './column-filter.component.html',
  styleUrl: './column-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColumnFilterComponent {
  @Input() title: string;
  @Input() id: string;
  @Input() field: string;
  @Input() options: any[];
  @Input() placeholder: string;
  @Input() optionLabel: string;
  @Input() optionValue: string;
}
