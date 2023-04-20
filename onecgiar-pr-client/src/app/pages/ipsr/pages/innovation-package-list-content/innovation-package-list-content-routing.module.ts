import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageListContentComponent } from './innovation-package-list-content.component';
import { ipsrInnovationPackageListContent } from '../router/routing-data-ipsr';

const routes: Routes = [{ path: '', component: InnovationPackageListContentComponent , children: ipsrInnovationPackageListContent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageListContentRoutingModule { }
