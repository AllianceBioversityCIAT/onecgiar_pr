import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrContributorsRoutingModule } from './ipsr-contributors-routing.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrContributorsComponent } from './ipsr-contributors.component';

@NgModule({
  declarations: [IpsrContributorsComponent],
  imports: [CommonModule, IpsrContributorsRoutingModule, CustomFieldsModule]
})
export class IpsrContributorsModule {}
