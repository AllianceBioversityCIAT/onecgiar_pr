import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ResultHistoryOfChangesModalComponent } from '../completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.component';
import { FilterByTextPipe } from '../../../../shared/pipes/filter-by-text.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  selector: 'app-phase-management',
  standalone: true,
  templateUrl: './phase-management.component.html',
  styleUrls: ['./phase-management.component.scss'],
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    InputTextModule,
    TableModule,
    FormsModule,
    ResultHistoryOfChangesModalComponent,
    FilterByTextPipe,
    TooltipModule,
    CalendarModule,
    RouterLink,
    RouterLinkActive,
    RouterModule
  ]
})
export class PhaseManagementComponent {}
