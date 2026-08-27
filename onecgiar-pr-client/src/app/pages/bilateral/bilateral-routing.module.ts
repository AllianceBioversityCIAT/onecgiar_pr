import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BilateralComponent } from './bilateral.component';
import { BilateralRouting } from '../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: ':acronym',
    component: BilateralComponent,
    children: BilateralRouting
  },
  {
    // Unknown bilateral URL: hand back to the session landing resolver rather than to the
    // RFR dashboard, which is no longer the app's entry point.
    path: '**',
    redirectTo: '/',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BilateralRoutingModule {}
