import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrLinkToResultsRoutingModule } from './ipsr-link-to-results-routing.module';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { IpsrLinkToResultsComponent } from './ipsr-link-to-results.component';

@NgModule({
  declarations: [IpsrLinkToResultsComponent],
  imports: [CommonModule, IpsrLinkToResultsRoutingModule, CustomFieldsModule]
})
export class IpsrLinkToResultsModule {}
