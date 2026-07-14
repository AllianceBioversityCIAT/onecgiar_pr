import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepTwoBasicInfoRoutingModule } from './step-two-basic-info-routing.module';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { ItemOptionsComponent } from './componets/item-options/item-options.component';
import { RouterModule } from '@angular/router';
import { CollapsibleContainerModule } from '../../../../../../../../../../shared/components/collapsible-container/collapsible-container.module';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { PrCheckboxValueAccessorModule } from '../../../../../../../../../../shared/directives/pr-checkbox-value-accessor.module';

@NgModule({
  declarations: [StepTwoBasicInfoComponent, ItemOptionsComponent],
  imports: [CommonModule, StepTwoBasicInfoRoutingModule, CustomFieldsModule, PrCheckboxValueAccessorModule, CollapsibleContainerModule, RouterModule],
  exports: [StepTwoBasicInfoComponent]
})
export class StepTwoBasicInfoModule {}
