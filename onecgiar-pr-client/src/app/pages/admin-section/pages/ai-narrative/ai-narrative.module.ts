// @akili-spec changes/mass-reporting-flow
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AiNarrativeRoutingModule } from './ai-narrative-routing.module';
import { AiNarrativeComponent } from './ai-narrative.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';

@NgModule({
  declarations: [AiNarrativeComponent],
  exports: [AiNarrativeComponent],
  imports: [CommonModule, AiNarrativeRoutingModule, CustomFieldsModule, PrToastComponent]
})
export class AiNarrativeModule {}
