import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorIpiCgiarPortfolioLinkagesRoutingModule } from './tor-ipi-cgiar-portfolio-linkages-routing.module';
import { TorIpiCgiarPortfolioLinkagesComponent } from './tor-ipi-cgiar-portfolio-linkages.component';


@NgModule({
  declarations: [
    TorIpiCgiarPortfolioLinkagesComponent
  ],
  imports: [
    CommonModule,
    TorIpiCgiarPortfolioLinkagesRoutingModule
  ]
})
export class TorIpiCgiarPortfolioLinkagesModule { }
