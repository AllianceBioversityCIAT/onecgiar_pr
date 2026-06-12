import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportingComponent } from './reporting.component';

const routes: Routes = [
  { path: '', component: ReportingComponent },
  {
    path: ':phaseId',
    loadComponent: () => import('./pages/phase-detail/phase-detail.component').then(m => m.PhaseDetailComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportingRoutingModule {}
