import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportingRoutingModule } from './reporting-routing.module';
import { ReportingComponent } from './reporting.component';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { ResultHistoryOfChangesModalModule } from '../../../completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.module';
import { FilterByTextModule } from 'src/app/shared/pipes/filter-by-text.module';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { OtherFunctionalitiesComponent } from '../../other-functionalities/other-functionalities.component';
import { MassivePhaseShiftComponent } from '../../other-functionalities/components/massive-phase-shift/massive-phase-shift.component';

@NgModule({
  declarations: [ReportingComponent, OtherFunctionalitiesComponent, MassivePhaseShiftComponent],
  imports: [CommonModule, ReportingRoutingModule, DialogModule, ButtonModule, DropdownModule, TagModule, InputTextModule, TableModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule, TooltipModule, CalendarModule]
})
export class ReportingModule {}
