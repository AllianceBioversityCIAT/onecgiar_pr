import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SettingsComponent } from './settings.component';
import { SettingsRoutingModule } from './settings-routing.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [SettingsComponent],
  imports: [CommonModule, SettingsRoutingModule, CustomFieldsModule, ToggleSwitchModule, ToastModule],
  providers: [MessageService]
})
export class SettingsModule {}
