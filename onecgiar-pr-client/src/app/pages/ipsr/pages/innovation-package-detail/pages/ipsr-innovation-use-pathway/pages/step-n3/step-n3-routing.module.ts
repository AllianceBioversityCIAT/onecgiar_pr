import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN3Component } from './step-n3.component';

const routes: Routes = [{ path: '', component: StepN3Component }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN3RoutingModule {}
