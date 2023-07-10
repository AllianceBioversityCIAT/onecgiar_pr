import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhaseManagementComponent } from './phase-management.component';

const routes: Routes = [{ path: '', component: PhaseManagementComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhaseManagementRoutingModule {}
