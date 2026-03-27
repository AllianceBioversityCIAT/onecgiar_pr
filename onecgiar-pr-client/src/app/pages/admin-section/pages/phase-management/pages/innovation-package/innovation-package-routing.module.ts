import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackageComponent } from './innovation-package.component';

const routes: Routes = [
  { path: '', component: InnovationPackageComponent },
  {
    path: ':phaseId',
    loadComponent: () => import('../reporting/pages/phase-detail/phase-detail.component').then(m => m.PhaseDetailComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackageRoutingModule {}
