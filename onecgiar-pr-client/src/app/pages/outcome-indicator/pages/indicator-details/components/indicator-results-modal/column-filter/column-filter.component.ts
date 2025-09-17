import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { Table, TableModule, TableService } from 'primeng/table';

@Component({
  selector: 'app-column-filter',
  imports: [CommonModule, TableModule, MultiSelectModule, FormsModule],
  providers: [Table, TableService],
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
}
