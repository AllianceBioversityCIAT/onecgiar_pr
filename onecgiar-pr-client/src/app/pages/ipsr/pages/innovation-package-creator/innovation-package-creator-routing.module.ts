import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageCreatorComponent } from './innovation-package-creator.component';

const routes: Routes = [{ path: '', component: InnovationPackageCreatorComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageCreatorRoutingModule {}
