import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN1Component } from './step-n1.component';

const routes: Routes = [{ path: '', component: StepN1Component }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN1RoutingModule {}
