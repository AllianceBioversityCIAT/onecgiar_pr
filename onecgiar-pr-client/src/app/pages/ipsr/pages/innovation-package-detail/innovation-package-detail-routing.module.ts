import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';

const routes: Routes = [{ path: '', component: InnovationPackageDetailComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageDetailRoutingModule {}
