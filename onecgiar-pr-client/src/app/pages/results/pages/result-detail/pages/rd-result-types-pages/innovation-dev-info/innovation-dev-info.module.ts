import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InnovationDevInfoRoutingModule } from './innovation-dev-info-routing.module';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [InnovationDevInfoComponent],
  imports: [CommonModule, InnovationDevInfoRoutingModule, CustomFieldsModule]
})
export class InnovationDevInfoModule {}
