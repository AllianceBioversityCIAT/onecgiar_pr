import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TorKrsPrimaryImpactAreaSelectorComponent } from './tor-krs-primary-impact-area-selector.component';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorKrsPrimaryImpactAreaSelectorComponent],
  exports: [TorKrsPrimaryImpactAreaSelectorComponent],
  imports: [CommonModule, CustomFieldsModule]
})
export class TorKrsPrimaryImpactAreaSelectorModule {}
