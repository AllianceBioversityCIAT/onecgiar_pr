import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN2Component } from './step-n2.component';

const routes: Routes = [{ path: '', component: StepN2Component }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN2RoutingModule {}
