import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrLinkToResultsRoutingModule } from './ipsr-link-to-results-routing.module';
import { IpsrLinkToResultsComponent } from './ipsr-link-to-results.component';
import { LinksToResultsGlobalModule } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.module';

@NgModule({
  declarations: [IpsrLinkToResultsComponent],
  imports: [CommonModule, IpsrLinkToResultsRoutingModule, LinksToResultsGlobalModule]
})
export class IpsrLinkToResultsModule {}
