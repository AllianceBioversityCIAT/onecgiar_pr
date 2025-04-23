import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WhatsNewComponent } from './whats-new.component';
import { WhatsNewRoutingModule } from './whats-new-routing.module';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [WhatsNewComponent],
  imports: [CommonModule, WhatsNewRoutingModule, CustomFieldsModule]
})
export class WhatsNewModule {}
