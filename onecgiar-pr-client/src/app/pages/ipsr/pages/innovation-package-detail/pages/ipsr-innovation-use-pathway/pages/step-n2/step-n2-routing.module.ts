import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN2Component } from './step-n2.component';
import { ipsrInnovationUsePathwayStep2Routing } from '../../../../../router/routing-data-ipsr';

const routes: Routes = [{ path: '', component: StepN2Component, children: ipsrInnovationUsePathwayStep2Routing }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN2RoutingModule {}
