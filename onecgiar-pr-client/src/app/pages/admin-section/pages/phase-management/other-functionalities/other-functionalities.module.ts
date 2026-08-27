import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OtherFunctionalitiesComponent } from './other-functionalities.component';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [OtherFunctionalitiesComponent, MassivePhaseShiftComponent],
  exports: [OtherFunctionalitiesComponent],
  imports: [CommonModule, PrDialogComponent, CustomFieldsModule]
})
export class OtherFunctionalitiesModule {}
