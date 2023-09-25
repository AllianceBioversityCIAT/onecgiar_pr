import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationUseInfoRoutingModule } from './innovation-use-info-routing.module';
import { InnovationUseInfoComponent } from './innovation-use-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { InnovationUseFormModule } from '../../../../../../../shared/components/innovation-use-form/innovation-use-form.module';

@NgModule({
  declarations: [InnovationUseInfoComponent],
  imports: [CommonModule, InnovationUseInfoRoutingModule, CustomFieldsModule, InnovationUseFormModule]
})
export class InnovationUseInfoModule {}
