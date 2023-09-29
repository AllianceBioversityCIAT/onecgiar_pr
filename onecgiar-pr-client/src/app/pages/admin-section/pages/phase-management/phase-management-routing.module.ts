import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhaseManagementComponent } from './phase-management.component';
import { managementPhasesRuting } from '../../../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: PhaseManagementComponent, children: managementPhasesRuting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhaseManagementRoutingModule {}
