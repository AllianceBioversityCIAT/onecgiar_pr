import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorPortfolioLinkagesRoutingModule } from './tor-portfolio-linkages-routing.module';
import { TorPortfolioLinkagesComponent } from './tor-portfolio-linkages.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorPortfolioLinkagesComponent],
  imports: [CommonModule, TorPortfolioLinkagesRoutingModule, CustomFieldsModule]
})
export class TorPortfolioLinkagesModule {}
