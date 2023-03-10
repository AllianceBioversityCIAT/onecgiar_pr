import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { IPSRDetailRouting } from '../router/routing-data-ipsr';

const routes: Routes = [{ path: '', component: InnovationPackageDetailComponent, children: IPSRDetailRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageDetailRoutingModule {}
