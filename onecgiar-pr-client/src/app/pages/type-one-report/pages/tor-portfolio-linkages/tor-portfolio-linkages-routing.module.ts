import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorPortfolioLinkagesComponent } from './tor-portfolio-linkages.component';

const routes: Routes = [{ path: '', component: TorPortfolioLinkagesComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorPortfolioLinkagesRoutingModule {}
