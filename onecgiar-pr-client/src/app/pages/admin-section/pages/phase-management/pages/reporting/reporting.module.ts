import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportingRoutingModule } from './reporting-routing.module';
import { ReportingComponent } from './reporting.component';
import { OtherFunctionalitiesModule } from '../../other-functionalities/other-functionalities.module';
import { ReplicatedInnovationRemindersComponent } from '../../components/replicated-innovation-reminders/replicated-innovation-reminders.component';
import { PhaseManagementTableModule } from '../../../../../../shared/components/phase-management-table/phase-management-table.module';

@NgModule({
  declarations: [ReportingComponent],
  imports: [
    CommonModule,
    ReportingRoutingModule,
    OtherFunctionalitiesModule,
    PhaseManagementTableModule,
    ReplicatedInnovationRemindersComponent
  ]
})
export class ReportingModule {}
