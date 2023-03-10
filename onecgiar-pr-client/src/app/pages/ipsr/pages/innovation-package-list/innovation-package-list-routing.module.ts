import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageListComponent } from './innovation-package-list.component';

const routes: Routes = [{ path: '', component: InnovationPackageListComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageListRoutingModule {}
