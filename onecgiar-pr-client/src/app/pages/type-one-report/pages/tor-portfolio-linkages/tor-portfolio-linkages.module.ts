import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorPortfolioLinkagesRoutingModule } from './tor-portfolio-linkages-routing.module';
import { TorPortfolioLinkagesComponent } from './tor-portfolio-linkages.component';


@NgModule({
  declarations: [
    TorPortfolioLinkagesComponent
  ],
  imports: [
    CommonModule,
    TorPortfolioLinkagesRoutingModule
  ]
})
export class TorPortfolioLinkagesModule { }
