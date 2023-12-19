import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorIpiCgiarPortfolioLinkagesComponent } from './tor-ipi-cgiar-portfolio-linkages.component';

const routes: Routes = [{ path: '', component: TorIpiCgiarPortfolioLinkagesComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorIpiCgiarPortfolioLinkagesRoutingModule {}
