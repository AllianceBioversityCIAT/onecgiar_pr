import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from './settings.component';
import { SettingsRoutingModule } from './settings-routing.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';

@NgModule({
  declarations: [SettingsComponent],
  imports: [CommonModule, SettingsRoutingModule, CustomFieldsModule, PrToastComponent]
})
export class SettingsModule {}
