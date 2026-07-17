import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BilateralComponent } from './bilateral.component';
import { BilateralRouting } from '../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: '',
    component: BilateralComponent,
    children: BilateralRouting
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BilateralRoutingModule {}
