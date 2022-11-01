import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdEvidencesRoutingModule } from './rd-evidences-routing.module';
import { RdEvidencesComponent } from './rd-evidences.component';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [RdEvidencesComponent],
  imports: [CommonModule, RdEvidencesRoutingModule, CustomFieldsModule]
})
export class RdEvidencesModule {}
