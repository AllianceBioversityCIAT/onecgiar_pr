import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationPackageRoutingModule } from './innovation-package-routing.module';
import { InnovationPackageComponent } from './innovation-package.component';
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
import { OtherFunctionalitiesModule } from '../../other-functionalities/other-functionalities.module';

@NgModule({
  declarations: [InnovationPackageComponent],
  imports: [CommonModule, InnovationPackageRoutingModule, OtherFunctionalitiesModule, DialogModule, ButtonModule, DropdownModule, TagModule, InputTextModule, TableModule, FormsModule, CustomFieldsModule, ResultHistoryOfChangesModalModule, FilterByTextModule, TooltipModule, CalendarModule]
})
export class InnovationPackageModule {}
