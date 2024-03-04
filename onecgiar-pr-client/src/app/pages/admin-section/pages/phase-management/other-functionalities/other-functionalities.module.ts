import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OtherFunctionalitiesComponent } from './other-functionalities.component';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [OtherFunctionalitiesComponent, MassivePhaseShiftComponent],
  exports: [OtherFunctionalitiesComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule]
})
export class OtherFunctionalitiesModule {}
