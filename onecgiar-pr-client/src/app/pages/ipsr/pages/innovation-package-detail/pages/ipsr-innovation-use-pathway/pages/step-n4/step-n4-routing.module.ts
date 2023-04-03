import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN4Component } from './step-n4.component';

const routes: Routes = [{ path: '', component: StepN4Component }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN4RoutingModule {}
