import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepTwoBasicInfoRoutingModule } from './step-two-basic-info-routing.module';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { ItemOptionsComponent } from './componets/item-options/item-options.component';
import { CheckboxModule } from 'primeng/checkbox';
import { CollapsibleContainerModule } from 'src/app/shared/components/collapsible-container/collapsible-container.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [StepTwoBasicInfoComponent, ItemOptionsComponent],
  imports: [CommonModule, StepTwoBasicInfoRoutingModule, CheckboxModule, CollapsibleContainerModule, RouterModule],
  exports: [StepTwoBasicInfoComponent]
})
export class StepTwoBasicInfoModule {}
